/**
 * Hardware Crawler Supplier Feeds, SSRF-Safe Fetcher & Staging Types
 * Supports multi-source distributor feeds (ASUS, MSI, GearVN) + external JSON/LD+JSON URLs.
 */

import { ValidationError } from '../../core/errors/domain.error';
import { HardwareCategory } from '../hardware/hardware.model';

export type CrawlerSourceKey =
  | 'ASUS_VN_B2B'
  | 'MSI_SEA_DISTRIBUTOR'
  | 'GEARVN_RETAIL_PULSE'
  | 'CUSTOM_URL';

export type CrawlerCandidateStatus = 'PENDING_APPROVAL' | 'AUTO_APPLIED' | 'APPROVED' | 'REJECTED';
export type CrawlerDiffType = 'NEW_PRODUCT' | 'PRICE_DROP' | 'PRICE_INCREASE';

export interface RawSupplierFeedItem {
  sku?: string;
  vendor_sku?: string;
  matchedHardwareId?: string;
  category?: string;
  brand?: string;
  model?: string;
  name?: string;
  product_name?: string;
  price?: number | string;
  retail_price_vnd?: number | string;
  stock?: number | string;
  specs?: Record<string, unknown>;
}

export interface CrawlerStagingItem {
  id: string;
  source: CrawlerSourceKey;
  sourceUrl?: string;
  diffType: CrawlerDiffType;
  matchedHardwareId: string | null;
  categoryId: HardwareCategory;
  brand: string;
  model: string;
  name: string;
  oldPriceVnd: number | null;
  newPriceVnd: number;
  priceDeltaVnd: number;
  priceDeltaPercent: number;
  suggestedStock: number;
  specs: Record<string, unknown>;
  aiConfidenceScore: number;
  status: CrawlerCandidateStatus;
  crawledAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface CrawlerAlertNotification {
  id: string;
  type: 'NEW_PRODUCT' | 'PRICE_CHANGE' | 'SYNC_SUMMARY';
  severity: 'INFO' | 'WARN' | 'SUCCESS';
  title: string;
  message: string;
  stagingItemId?: string;
  read: boolean;
  createdAt: string;
}

export const SUPPLIER_FEED_CATALOG: Record<Exclude<CrawlerSourceKey, 'CUSTOM_URL'>, RawSupplierFeedItem[]> = {
  ASUS_VN_B2B: [
    {
      matchedHardwareId: 'mb-b760-plus',
      vendor_sku: 'TUF-B760-PLUS-WIFI',
      category: 'MOTHERBOARD',
      brand: 'ASUS',
      model: 'TUF-B760-PLUS-WIFI',
      product_name: 'ASUS TUF GAMING B760-PLUS WIFI DDR5',
      retail_price_vnd: 4290000,
      stock: 18,
      specs: { socket: 'LGA1700', chipset: 'B760', formFactor: 'ATX', ramType: 'DDR5', ramSlots: 4 },
    },
    {
      vendor_sku: 'ROG-STRIX-RTX4080S-O16G-WHITE',
      category: 'GPU',
      brand: 'ASUS',
      model: 'ROG-STRIX-RTX4080S-WHITE',
      product_name: 'ASUS ROG Strix GeForce RTX 4080 SUPER 16GB GDDR6X White OC',
      retail_price_vnd: 38990000,
      stock: 8,
      specs: { vramGb: 16, tdpWatts: 320, lengthMm: 358, recommendedPsuWatts: 850, pcieGeneration: '4.0', powerConnectors: ['16-pin 12VHPWR'] },
    },
  ],
  MSI_SEA_DISTRIBUTOR: [
    {
      matchedHardwareId: 'gpu-rtx-4070-gigabyte',
      vendor_sku: 'GV-N4070WF3OC-12GD',
      category: 'GPU',
      brand: 'GIGABYTE',
      model: 'GV-N4070WF3OC-12GD',
      product_name: 'GIGABYTE GeForce RTX 4070 WINDFORCE OC 12G',
      retail_price_vnd: 15990000,
      stock: 12,
      specs: { lengthMm: 300, tdpWatts: 200, recommendedPsuWatts: 650, vramGb: 12 },
    },
    {
      vendor_sku: 'AMD-R7-9800X3D-BOX',
      category: 'CPU',
      brand: 'AMD',
      model: 'RYZEN-7-9800X3D',
      product_name: 'AMD Ryzen 7 9800X3D (8C/16T, Up to 5.2GHz, 3D V-Cache, AM5)',
      retail_price_vnd: 13490000,
      stock: 12,
      specs: { socket: 'AM5', tdpWatts: 120, cores: 8, threads: 16, baseClockGhz: 4.7, boostClockGhz: 5.2, integratedGpu: true, pcieGen: 5 },
    },
  ],
  GEARVN_RETAIL_PULSE: [
    {
      matchedHardwareId: 'ram-corsair-ddr5-32',
      vendor_sku: 'CMH32GX5M2B6000C30',
      category: 'RAM',
      brand: 'Corsair',
      model: 'CMH32GX5M2B6000C30',
      product_name: 'Corsair Vengeance RGB 32GB (2x16GB) DDR5 6000MHz Black',
      retail_price_vnd: 2990000,
      stock: 40,
      specs: { generation: 'DDR5', capacityGb: 32, modulesCount: 2, speedMhz: 6000 },
    },
    {
      vendor_sku: 'F5-6000J3040G32GX2-TZ5NR',
      category: 'RAM',
      brand: 'G.Skill',
      model: 'TRIDENT-Z5-NEO-64GB',
      product_name: 'G.Skill Trident Z5 Neo RGB 64GB (2x32GB) DDR5 6000MHz EXPO',
      retail_price_vnd: 5790000,
      stock: 10,
      specs: { generation: 'DDR5', capacityGb: 64, modulesCount: 2, speedMhz: 6000 },
    },
  ],
};

/**
 * Validates URL against SSRF private/loopback ranges before outbound fetch.
 */
export function assertSafeCrawlerUrl(rawUrl: string, allowLoopbackInTest = false): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new ValidationError('URL nguồn cào dữ liệu không hợp lệ.');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new ValidationError('Chỉ hỗ trợ giao thức http:// hoặc https:// cho nguồn cào dữ liệu.');
  }
  const host = parsed.hostname.toLowerCase();
  const isLoopback = host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';
  const isPrivateLan =
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    host === '0.0.0.0';

  if (isPrivateLan || (isLoopback && !allowLoopbackInTest)) {
    throw new ValidationError('URL nội bộ/private IP bị từ chối bởi bộ lọc chống SSRF.');
  }
  return parsed;
}

/**
 * Fetches external JSON or HTML (JSON-LD Product) feed safely with 6s timeout.
 */
export async function fetchExternalSupplierFeed(
  rawUrl: string,
  allowLoopbackInTest = false
): Promise<RawSupplierFeedItem[]> {
  const safeUrl = assertSafeCrawlerUrl(rawUrl, allowLoopbackInTest);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(safeUrl.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json, text/html;q=0.9', 'User-Agent': 'CyberRigCatalogSync/1.0' },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new ValidationError(`Nguồn dữ liệu trả mã lỗi HTTP ${response.status}.`);
    }

    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();

    if (contentType.includes('json') || text.trim().startsWith('[') || text.trim().startsWith('{')) {
      const parsed = JSON.parse(text) as unknown;
      if (Array.isArray(parsed)) return parsed as RawSupplierFeedItem[];
      if (parsed && typeof parsed === 'object') {
        const obj = parsed as Record<string, unknown>;
        const arr = obj.items || obj.products || obj.data;
        if (Array.isArray(arr)) return arr as RawSupplierFeedItem[];
      }
      throw new ValidationError('JSON trả về phải là mảng linh kiện hoặc chứa trường items/products/data.');
    }

    // Extract schema.org JSON-LD Product blocks from HTML pages
    const matches = [...text.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
    const extracted: RawSupplierFeedItem[] = [];
    for (const m of matches) {
      try {
        const ld = JSON.parse(m[1]) as Record<string, unknown>;
        const offers = (ld.offers && typeof ld.offers === 'object' ? ld.offers : {}) as Record<string, unknown>;
        if (ld.name && (offers.price || ld.price)) {
          extracted.push({
            vendor_sku: String(ld.sku || ld.mpn || ''),
            brand: typeof ld.brand === 'object' && ld.brand ? String((ld.brand as Record<string, unknown>).name || 'GENERIC') : String(ld.brand || 'GENERIC'),
            product_name: String(ld.name),
            retail_price_vnd: Number(offers.price || ld.price),
            stock: 5,
          });
        }
      } catch {
        // Ignore malformed JSON-LD block
      }
    }
    if (extracted.length > 0) return extracted;
    throw new ValidationError('Không tìm thấy dữ liệu linh kiện chuẩn JSON hoặc JSON-LD trên trang đích.');
  } finally {
    clearTimeout(timer);
  }
}
