/**
 * Hardware Crawler Catalog Matcher & Candidate Builder Utilities
 */

import { randomUUID } from 'node:crypto';
import { db } from '../../core/db';
import { maskRawTextPii, sanitizeTextInput } from '../../core/security';
import { HardwareCategory, HardwareItem } from '../hardware/hardware.model';
import { hardwareService } from '../hardware/hardware.service';
import {
  CrawlerDiffType,
  CrawlerSourceKey,
  CrawlerStagingItem,
  RawSupplierFeedItem,
} from './crawler-feeds.data';

export function inferHardwareCategory(rawCat?: string, rawName = ''): HardwareCategory {
  const upper = String(rawCat || '').trim().toUpperCase();
  if (Object.values(HardwareCategory).includes(upper as HardwareCategory)) {
    return upper as HardwareCategory;
  }
  const lower = rawName.toLowerCase();
  if (/rtx|radeon|rx\s?\d|geforce|vga|gpu/.test(lower)) return HardwareCategory.GPU;
  if (/ryzen|core\s+i\d|cpu|9800x3d|14900k/.test(lower)) return HardwareCategory.CPU;
  if (/b760|z790|b650|x670|mainboard|motherboard/.test(lower)) return HardwareCategory.MOTHERBOARD;
  if (/ddr4|ddr5|trident|vengeance|ram/.test(lower)) return HardwareCategory.RAM;
  if (/nvme|ssd|hdd|990\s*pro/.test(lower)) return HardwareCategory.STORAGE;
  if (/psu|rm\d+|watt|80\s*plus/.test(lower)) return HardwareCategory.PSU;
  if (/aio|cooler|ak620|kraken/.test(lower)) return HardwareCategory.COOLER;
  return HardwareCategory.CASE;
}

export function findCatalogMatch(raw: RawSupplierFeedItem, catalog: HardwareItem[]): HardwareItem | null {
  const targetId = String(raw.matchedHardwareId || '').toLowerCase().replace(/-/g, '');
  const candidateModels = [raw.model, raw.vendor_sku, raw.sku]
    .filter(Boolean)
    .map((m) => String(m).toLowerCase().trim());
  const rawName = String(raw.product_name || raw.name || '').toLowerCase().trim();

  return (
    catalog.find((item) => {
      if (targetId && item.id.toLowerCase().replace(/-/g, '') === targetId) return true;
      if (item.model && candidateModels.includes(item.model.toLowerCase())) return true;
      if (rawName && item.name.toLowerCase() === rawName) return true;
      return false;
    }) || null
  );
}

export async function applyStagingCandidateToCatalog(item: CrawlerStagingItem): Promise<HardwareItem> {
  if (item.diffType === 'NEW_PRODUCT' || !item.matchedHardwareId) {
    if (db.isConnected()) {
      try {
        const rows = await db.query<{ id: string }>(
          `SELECT id FROM hardware_items WHERE LOWER(model) = LOWER($1) LIMIT 1;`,
          [item.model]
        );
        if (rows[0]?.id) {
          await db.query(
            `UPDATE hardware_items SET is_active = TRUE, price = $1, stock_quantity = $2, updated_at = NOW() WHERE id = $3;`,
            [item.newPriceVnd, item.suggestedStock, rows[0].id]
          );
          return hardwareService.getHardwareById(rows[0].id);
        }
      } catch {
        // Proceed to standard createHardwareItem
      }
    }
    return hardwareService.createHardwareItem({
      categoryId: item.categoryId,
      name: item.name,
      brand: item.brand,
      model: item.model,
      price: item.newPriceVnd,
      stockQuantity: item.suggestedStock,
      specs: item.specs,
      isActive: true,
    });
  }
  return hardwareService.updateHardwareStock(item.matchedHardwareId, {
    addStock: 0,
    newPrice: item.newPriceVnd,
  });
}

export function buildStagingCandidate(params: {
  raw: RawSupplierFeedItem;
  existing: HardwareItem | null;
  source: CrawlerSourceKey;
  customUrl?: string;
  autoApply: boolean;
}): CrawlerStagingItem | null {
  const { raw, existing, source, customUrl, autoApply } = params;
  const cleanName = sanitizeTextInput(maskRawTextPii(String(raw.product_name || raw.name || '')), 180);
  const parsedPrice = Math.round(Number(raw.retail_price_vnd ?? raw.price ?? 0));
  if (!cleanName || !Number.isFinite(parsedPrice) || parsedPrice <= 0) return null;

  const diffType: CrawlerDiffType = !existing
    ? 'NEW_PRODUCT'
    : parsedPrice < existing.price
      ? 'PRICE_DROP'
      : 'PRICE_INCREASE';

  const oldPriceVnd = existing ? Math.round(existing.price) : null;
  const priceDeltaVnd = oldPriceVnd !== null ? parsedPrice - oldPriceVnd : parsedPrice;
  const priceDeltaPercent =
    oldPriceVnd && oldPriceVnd > 0 ? Number((((parsedPrice - oldPriceVnd) / oldPriceVnd) * 100).toFixed(1)) : 100;

  const modelCode = sanitizeTextInput(
    String(raw.model || raw.vendor_sku || raw.sku || existing?.model || `SKU-${Date.now().toString(36).toUpperCase()}`),
    80
  );

  return {
    id: `crw-${randomUUID().slice(0, 8)}`,
    source,
    sourceUrl: customUrl ? sanitizeTextInput(customUrl, 250) : undefined,
    diffType,
    matchedHardwareId: existing ? existing.id : null,
    categoryId: existing ? existing.categoryId : inferHardwareCategory(raw.category, cleanName),
    brand: sanitizeTextInput(String(raw.brand || existing?.brand || 'GENERIC'), 80),
    model: modelCode,
    name: cleanName,
    oldPriceVnd,
    newPriceVnd: parsedPrice,
    priceDeltaVnd,
    priceDeltaPercent,
    suggestedStock: Math.max(1, Math.trunc(Number(raw.stock ?? 5) || 5)),
    specs: raw.specs && typeof raw.specs === 'object' ? raw.specs : {},
    aiConfidenceScore: raw.specs ? 0.985 : 0.94,
    status: autoApply ? 'AUTO_APPLIED' : 'PENDING_APPROVAL',
    crawledAt: new Date().toISOString(),
  };
}
