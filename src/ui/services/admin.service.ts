/**
 * Admin Inventory Control & Catalog Data Service (Task FE-10 / Sprint 5)
 * Communicates with backend admin endpoints with automatic Bearer token injection.
 * Aligned with Task BE-15 and BE-PORTALS specifications.
 */

import { request } from './api';
import { HardwareCategory, HardwareItem } from '../../modules/hardware/hardware.model';

export type { HardwareCategory, HardwareItem };

export interface NewHardwareDto {
  categoryId: HardwareCategory | string;
  name: string;
  brand: string;
  model?: string;
  price: number;
  stockQuantity: number;
  specs?: Record<string, unknown>;
  isActive?: boolean;
}

export interface RestockHardwareDto {
  addStock: number;
  newPrice?: number;
}

export interface HardwareFilterParams {
  category?: string;
  search?: string;
  inStock?: boolean;
}

/**
 * 1. Thêm mới linh kiện vào danh mục kho (POST /api/admin/hardware)
 */
export async function createHardwareItem(payload: NewHardwareDto): Promise<HardwareItem> {
  return request<HardwareItem>('/api/admin/hardware', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * 2. Nhập thêm tồn kho & cập nhật giá bán mới (PATCH /api/admin/hardware/:id/stock)
 */
export async function updateStockAndPrice(
  id: string,
  payload: RestockHardwareDto
): Promise<HardwareItem> {
  return request<HardwareItem>(`/api/admin/hardware/${encodeURIComponent(id)}/stock`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/**
 * 3. Ngừng kinh doanh linh kiện - Xóa mềm (DELETE /api/admin/hardware/:id)
 */
export async function softDeleteHardwareItem(id: string): Promise<HardwareItem | void> {
  return request<HardwareItem | void>(`/api/admin/hardware/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

/**
 * 4. Truy vấn danh mục linh kiện kho kèm lọc và tìm kiếm (GET /api/hardware)
 */
export async function fetchAdminHardware(
  params?: HardwareFilterParams
): Promise<HardwareItem[]> {
  const query = new URLSearchParams();
  if (params?.category && params.category !== 'ALL') {
    query.set('category', params.category);
  }
  if (params?.search && params.search.trim()) {
    query.set('search', params.search.trim());
  }
  if (params?.inStock !== undefined) {
    query.set('inStock', String(params.inStock));
  }

  const queryString = query.toString() ? `?${query.toString()}` : '';
  const result = await request<HardwareItem[] | { data: HardwareItem[] }>(
    `/api/hardware${queryString}`,
    {
      method: 'GET',
    }
  );

  if (Array.isArray(result)) {
    return result;
  }
  if (result && Array.isArray((result as any).data)) {
    return (result as any).data;
  }
  return [];
}

export async function runHardwareCrawler(payload: {
  source?: string;
  customUrl?: string;
  autoApply?: boolean;
}): Promise<unknown> {
  return request('/api/admin/crawler/run', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchCrawlerState(): Promise<unknown> {
  return request('/api/admin/crawler/state', { method: 'GET' });
}

export const adminService = {
  createHardwareItem,
  updateStockAndPrice,
  softDeleteHardwareItem,
  fetchAdminHardware,
  runHardwareCrawler,
  fetchCrawlerState,
};

export default adminService;
