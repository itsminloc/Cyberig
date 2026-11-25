/**
 * Hardware Catalog Crawler, Price-Diff Staging & Real-Time SSE Notification Service
 */

import { config } from '../../core/config';
import { EntityNotFoundError, ValidationError } from '../../core/errors/domain.error';
import { eventBus } from '../../core/events';
import { auditLogService } from '../../core/security';
import { hardwareService } from '../hardware/hardware.service';
import { telemetryService } from '../monitoring/telemetry.service';
import {
  CrawlerAlertNotification,
  CrawlerSourceKey,
  CrawlerStagingItem,
  fetchExternalSupplierFeed,
  RawSupplierFeedItem,
  SUPPLIER_FEED_CATALOG,
} from './crawler-feeds.data';
import {
  applyStagingCandidateToCatalog,
  buildStagingCandidate,
  findCatalogMatch,
} from './crawler-matcher.util';

export interface RunCrawlerOptions {
  source?: CrawlerSourceKey;
  customUrl?: string;
  rawItems?: RawSupplierFeedItem[];
  autoApply?: boolean;
  actorId?: string | null;
  actorEmail?: string | null;
  ipAddress?: string;
  correlationId?: string;
  allowLoopbackInTest?: boolean;
}

export class HardwareCrawlerService {
  private static instance: HardwareCrawlerService | null = null;
  private autoApplyEnabled = false;
  private stagingQueue: CrawlerStagingItem[] = [];
  private notifications: CrawlerAlertNotification[] = [];
  private lastRunAt: string | null = null;
  private totalRuns = 0;

  public static getInstance(): HardwareCrawlerService {
    if (!HardwareCrawlerService.instance) {
      HardwareCrawlerService.instance = new HardwareCrawlerService();
    }
    return HardwareCrawlerService.instance;
  }

  private pushAlert(alert: Omit<CrawlerAlertNotification, 'id' | 'read' | 'createdAt'>): void {
    const entry: CrawlerAlertNotification = {
      id: `alrt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      read: false,
      createdAt: new Date().toISOString(),
      ...alert,
    };
    this.notifications.unshift(entry);
    if (this.notifications.length > 80) this.notifications.pop();
    telemetryService.broadcast('crawler:alert', {
      alert: entry,
      unreadAlertCount: this.getUnreadAlertCount(),
      pendingCount: this.getPendingCount(),
    });
  }

  public async runCrawlSync(options: RunCrawlerOptions = {}) {
    const source: CrawlerSourceKey = options.source || (options.customUrl ? 'CUSTOM_URL' : 'ASUS_VN_B2B');
    const effectiveAutoApply = options.autoApply ?? this.autoApplyEnabled;
    const correlationId = options.correlationId || `corr-crawl-${Date.now().toString(36)}`;

    let rawFeed: RawSupplierFeedItem[];
    if (Array.isArray(options.rawItems) && options.rawItems.length > 0) {
      rawFeed = options.rawItems;
    } else if (source === 'CUSTOM_URL' || options.customUrl) {
      if (!options.customUrl) throw new ValidationError('Vui lòng cung cấp customUrl khi chọn nguồn CUSTOM_URL.');
      rawFeed = await fetchExternalSupplierFeed(options.customUrl, Boolean(options.allowLoopbackInTest && config.env === 'test'));
    } else {
      rawFeed = SUPPLIER_FEED_CATALOG[source] || SUPPLIER_FEED_CATALOG.ASUS_VN_B2B;
    }

    const catalog = (await hardwareService.getHardwareItems({ page: 1, limit: 100 })).items;
    const detectedItems: CrawlerStagingItem[] = [];
    let unchangedCount = 0;

    for (const raw of rawFeed) {
      const existing = findCatalogMatch(raw, catalog);
      const parsedPrice = Math.round(Number(raw.retail_price_vnd ?? raw.price ?? 0));
      if (existing && Math.round(existing.price) === parsedPrice) {
        unchangedCount += 1;
        continue;
      }

      const candidate = buildStagingCandidate({
        raw,
        existing,
        source,
        customUrl: options.customUrl,
        autoApply: effectiveAutoApply,
      });
      if (!candidate) continue;

      this.stagingQueue = this.stagingQueue.filter(
        (q) => !(q.status === 'PENDING_APPROVAL' && (q.model === candidate.model || (existing && q.matchedHardwareId === existing.id)))
      );

      if (effectiveAutoApply) {
        const appliedHw = await applyStagingCandidateToCatalog(candidate);
        candidate.matchedHardwareId = appliedHw.id;
        candidate.reviewedAt = candidate.crawledAt;
        candidate.reviewedBy = options.actorEmail || 'AUTO_APPLY_ENGINE';
      }

      this.stagingQueue.unshift(candidate);
      if (this.stagingQueue.length > 100) this.stagingQueue.pop();
      detectedItems.push(candidate);

      const tag = effectiveAutoApply ? 'ĐÃ TỰ ĐỘNG CẬP NHẬT' : 'CHỜ DUYỆT';
      this.pushAlert({
        type: candidate.diffType === 'NEW_PRODUCT' ? 'NEW_PRODUCT' : 'PRICE_CHANGE',
        severity: candidate.diffType === 'NEW_PRODUCT' ? 'SUCCESS' : 'WARN',
        title:
          candidate.diffType === 'NEW_PRODUCT'
            ? `[${tag}] Linh kiện mới: ${candidate.name}`
            : `[${tag}] Biến động giá (${candidate.priceDeltaPercent > 0 ? '+' : ''}${candidate.priceDeltaPercent}%): ${candidate.name}`,
        message:
          candidate.diffType === 'NEW_PRODUCT'
            ? `Nguồn ${source} phát hiện SKU mới [${candidate.categoryId}] giá ${candidate.newPriceVnd.toLocaleString('vi-VN')} ₫.`
            : `Nguồn ${source}: Giá từ ${(candidate.oldPriceVnd || 0).toLocaleString('vi-VN')} ₫ -> ${candidate.newPriceVnd.toLocaleString('vi-VN')} ₫.`,
        stagingItemId: candidate.id,
      });
    }

    this.lastRunAt = new Date().toISOString();
    this.totalRuns += 1;

    telemetryService.emitLog(
      'AI',
      detectedItems.length > 0 ? 'SUCCESS' : 'INFO',
      'HardwareCrawler',
      `Crawl [${source}] hoàn tất: phát hiện ${detectedItems.length} thay đổi (${unchangedCount} giữ nguyên), mode=${effectiveAutoApply ? 'AUTO_APPLY' : 'STAGING_QUEUE'}.`,
      { source, detectedCount: detectedItems.length, autoApply: effectiveAutoApply, correlationId }
    );

    if (eventBus.getStatus().online && detectedItems.length > 0) {
      await eventBus
        .publish(
          'catalog.crawler',
          {
            eventId: `evt-crawl-${Date.now()}`,
            eventType: 'CatalogFeedSynchronized',
            eventVersion: '1.0',
            occurredAt: this.lastRunAt,
            correlationId,
            sourceChannel: source,
            data: { source, detectedCount: detectedItems.length, autoApply: effectiveAutoApply },
          },
          source
        )
        .catch(() => undefined);
    }

    await auditLogService.record({
      eventType: 'ADMIN_CRAWLER_SYNC',
      severity: 'INFO',
      actorId: options.actorId || null,
      actorRole: 'ADMIN',
      actorEmail: options.actorEmail || null,
      ipAddress: options.ipAddress || 'unknown',
      resourceType: 'hardware_crawler',
      resourceId: source,
      message: `Chạy cào dữ liệu nguồn [${source}]: ${detectedItems.length} mục mới/đổi giá (${effectiveAutoApply ? 'Auto-Applied' : 'Chờ duyệt'}).`,
      metadata: { detectedCount: detectedItems.length, unchangedCount, autoApply: effectiveAutoApply },
    });

    telemetryService.broadcast('crawler:updated', this.getState());
    return { source, autoApplied: effectiveAutoApply, detectedCount: detectedItems.length, unchangedCount, items: detectedItems };
  }

  public async approveCandidate(id: string, actorEmail?: string | null, ipAddress = 'unknown') {
    const item = this.stagingQueue.find((q) => q.id === id);
    if (!item) throw new EntityNotFoundError(`Không tìm thấy mục chờ duyệt [${id}].`);
    if (item.status !== 'PENDING_APPROVAL') throw new ValidationError(`Mục [${id}] đã xử lý (${item.status}).`);

    const hardware = await applyStagingCandidateToCatalog(item);
    item.matchedHardwareId = hardware.id;
    item.status = 'APPROVED';
    item.reviewedAt = new Date().toISOString();
    item.reviewedBy = actorEmail || 'ADMIN';

    await auditLogService.record({
      eventType: 'ADMIN_CRAWLER_APPROVE',
      severity: 'INFO',
      actorRole: 'ADMIN',
      actorEmail: actorEmail || null,
      ipAddress,
      resourceType: 'hardware',
      resourceId: hardware.id,
      message: `Duyệt cập nhật Crawler [${item.diffType}] cho ${item.name} -> giá ${item.newPriceVnd.toLocaleString('vi-VN')} ₫.`,
    });

    this.pushAlert({
      type: 'SYNC_SUMMARY',
      severity: 'SUCCESS',
      title: `Đã duyệt áp dụng: ${item.name}`,
      message: `Giá niêm yết hiện tại: ${item.newPriceVnd.toLocaleString('vi-VN')} ₫.`,
      stagingItemId: item.id,
    });
    telemetryService.broadcast('crawler:updated', this.getState());
    return { candidate: item, hardware };
  }

  public async approveAllPending(actorEmail?: string | null, ipAddress = 'unknown') {
    const pending = this.stagingQueue.filter((q) => q.status === 'PENDING_APPROVAL');
    const results = [];
    for (const item of pending) {
      results.push(await this.approveCandidate(item.id, actorEmail, ipAddress));
    }
    return { approvedCount: results.length, results };
  }

  public async rejectCandidate(id: string, actorEmail?: string | null, ipAddress = 'unknown') {
    const item = this.stagingQueue.find((q) => q.id === id);
    if (!item) throw new EntityNotFoundError(`Không tìm thấy mục chờ duyệt [${id}].`);
    item.status = 'REJECTED';
    item.reviewedAt = new Date().toISOString();
    item.reviewedBy = actorEmail || 'ADMIN';

    await auditLogService.record({
      eventType: 'ADMIN_CRAWLER_REJECT',
      severity: 'WARN',
      actorRole: 'ADMIN',
      actorEmail: actorEmail || null,
      ipAddress,
      resourceType: 'hardware_crawler',
      resourceId: id,
      message: `Từ chối đề xuất Crawler cho [${item.name}].`,
    });
    telemetryService.broadcast('crawler:updated', this.getState());
    return item;
  }

  public setAutoApply(enabled: boolean): boolean {
    this.autoApplyEnabled = Boolean(enabled);
    telemetryService.broadcast('crawler:updated', this.getState());
    return this.autoApplyEnabled;
  }

  public markAllNotificationsRead(): number {
    let count = 0;
    for (const n of this.notifications) {
      if (!n.read) { n.read = true; count += 1; }
    }
    telemetryService.broadcast('crawler:updated', this.getState());
    return count;
  }

  public getPendingCount(): number {
    return this.stagingQueue.filter((q) => q.status === 'PENDING_APPROVAL').length;
  }

  public getUnreadAlertCount(): number {
    return this.notifications.filter((n) => !n.read).length;
  }

  public getState() {
    return {
      autoApplyEnabled: this.autoApplyEnabled,
      lastRunAt: this.lastRunAt,
      totalRuns: this.totalRuns,
      pendingCount: this.getPendingCount(),
      unreadAlertCount: this.getUnreadAlertCount(),
      availableSources: ['ASUS_VN_B2B', 'MSI_SEA_DISTRIBUTOR', 'GEARVN_RETAIL_PULSE', 'CUSTOM_URL'],
      stagingQueue: this.stagingQueue.slice(0, 40),
      notifications: this.notifications.slice(0, 30),
    };
  }

  public resetForTest(): void {
    this.autoApplyEnabled = false;
    this.stagingQueue = [];
    this.notifications = [];
    this.lastRunAt = null;
    this.totalRuns = 0;
  }
}

export const hardwareCrawlerService = HardwareCrawlerService.getInstance();
