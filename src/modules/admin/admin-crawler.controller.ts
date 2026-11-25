/**
 * Admin Hardware Crawler & Price-Alert Controller
 * Protected by authenticateToken + requireRoles('ADMIN') via adminRouter.
 */

import { NextFunction, Request, Response } from 'express';
import { resolveClientIp } from '../../core/middlewares/rate-limiter.middleware';
import { CrawlerSourceKey, RawSupplierFeedItem } from './crawler-feeds.data';
import { hardwareCrawlerService } from './hardware-crawler.service';

export class AdminCrawlerController {
  /**
   * GET /api/admin/crawler/state
   */
  public getCrawlerState(_req: Request, res: Response): void {
    res.status(200).json({
      success: true,
      data: hardwareCrawlerService.getState(),
    });
  }

  /**
   * POST /api/admin/crawler/run
   */
  public async runCrawl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const source = req.body?.source ? (String(req.body.source) as CrawlerSourceKey) : undefined;
      const customUrl = typeof req.body?.customUrl === 'string' && req.body.customUrl.trim()
        ? req.body.customUrl.trim()
        : undefined;
      const rawItems = Array.isArray(req.body?.rawItems)
        ? (req.body.rawItems as RawSupplierFeedItem[])
        : undefined;
      const autoApply = typeof req.body?.autoApply === 'boolean' ? req.body.autoApply : undefined;

      const result = await hardwareCrawlerService.runCrawlSync({
        source,
        customUrl,
        rawItems,
        autoApply,
        actorId: req.user?.userId || null,
        actorEmail: req.user?.email || null,
        ipAddress: resolveClientIp(req),
        correlationId: req.correlationId,
        allowLoopbackInTest: Boolean(req.body?.allowLoopbackInTest),
      });

      res.status(200).json({
        success: true,
        message: result.autoApplied
          ? `Đã cào và tự động cập nhật ${result.detectedCount} linh kiện/giá bán mới.`
          : `Đã cào xong: phát hiện ${result.detectedCount} đề xuất mới trong hàng đợi chờ duyệt.`,
        data: {
          ...result,
          state: hardwareCrawlerService.getState(),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/admin/crawler/settings
   */
  public updateSettings(req: Request, res: Response): void {
    const enabled = hardwareCrawlerService.setAutoApply(Boolean(req.body?.autoApplyEnabled));
    res.status(200).json({
      success: true,
      message: enabled
        ? 'Đã bật chế độ Tự động áp dụng (Auto-Apply) khi cào linh kiện.'
        : 'Đã chuyển về chế độ Chờ Admin duyệt (Staging Queue).',
      data: { autoApplyEnabled: enabled },
    });
  }

  /**
   * POST /api/admin/crawler/candidates/:id/approve
   */
  public async approveCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id || '');
      const result = await hardwareCrawlerService.approveCandidate(
        id,
        req.user?.email || null,
        resolveClientIp(req)
      );
      res.status(200).json({
        success: true,
        message: `Đã duyệt và cập nhật [${result.candidate.name}] vào danh mục chính thức.`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/admin/crawler/approve-all
   */
  public async approveAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await hardwareCrawlerService.approveAllPending(
        req.user?.email || null,
        resolveClientIp(req)
      );
      res.status(200).json({
        success: true,
        message: `Đã duyệt hàng loạt ${result.approvedCount} mục cập nhật linh kiện & giá bán.`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/admin/crawler/candidates/:id/reject
   */
  public async rejectCandidate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id || '');
      const candidate = await hardwareCrawlerService.rejectCandidate(
        id,
        req.user?.email || null,
        resolveClientIp(req)
      );
      res.status(200).json({
        success: true,
        message: `Đã từ chối đề xuất [${candidate.name}].`,
        data: candidate,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/admin/crawler/notifications/read
   */
  public markAlertsRead(_req: Request, res: Response): void {
    const marked = hardwareCrawlerService.markAllNotificationsRead();
    res.status(200).json({
      success: true,
      data: { markedCount: marked },
    });
  }
}

export const adminCrawlerController = new AdminCrawlerController();
