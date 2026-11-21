/**
 * Hardware Client API Service
 * Handles communication with GET /api/hardware with robust offline/mock fallback.
 */

import { HardwareItem } from '../../modules/hardware/hardware.model';
import { HardwareQueryFilter, PaginatedHardwareResult } from '../../modules/hardware/hardware.service';
import { MOCK_HARDWARE_CATALOG } from '../pages/pc-builder.data';

/**
 * Fetch hardware items from REST API /api/hardware.
 * Falls back gracefully to filtering MOCK_HARDWARE_CATALOG when offline or during tests.
 */
export async function fetchHardwareCatalog(
  filter: HardwareQueryFilter
): Promise<PaginatedHardwareResult> {
  const queryParams = new URLSearchParams();

  if (filter.category) queryParams.append('category', String(filter.category));
  if (filter.brand) queryParams.append('brand', filter.brand);
  if (filter.minPrice !== undefined) queryParams.append('minPrice', String(filter.minPrice));
  if (filter.maxPrice !== undefined) queryParams.append('maxPrice', String(filter.maxPrice));
  if (filter.search) queryParams.append('search', filter.search);
  if (filter.inStockOnly) queryParams.append('inStockOnly', 'true');
  if (filter.page) queryParams.append('page', String(filter.page));
  if (filter.limit) queryParams.append('limit', String(filter.limit));

  const url = `/api/hardware?${queryParams.toString()}`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (res.ok) {
      const body = await res.json();
      if (body.success && Array.isArray(body.data) && body.pagination) {
        return {
          items: body.data,
          pagination: body.pagination,
        };
      }
    }
  } catch (_networkError) {
    // Graceful fallback for offline, SSR, or standalone client without live backend server
  }

  // Resilient fallback filtering
  return fallbackQuery(filter);
}

/**
 * In-memory query engine used when network is offline or in component unit tests
 */
function fallbackQuery(filter: HardwareQueryFilter): PaginatedHardwareResult {
  const page = Math.max(1, filter.page || 1);
  const limit = Math.max(1, Math.min(100, filter.limit || 20));

  let filtered = [...MOCK_HARDWARE_CATALOG];

  if (filter.category) {
    filtered = filtered.filter(
      (item) => item.categoryId.toUpperCase() === String(filter.category).toUpperCase()
    );
  }

  if (filter.brand) {
    filtered = filtered.filter(
      (item) => item.brand.toLowerCase() === filter.brand!.toLowerCase()
    );
  }

  if (filter.minPrice !== undefined) {
    filtered = filtered.filter((item) => item.price >= filter.minPrice!);
  }

  if (filter.maxPrice !== undefined) {
    filtered = filtered.filter((item) => item.price <= filter.maxPrice!);
  }

  if (filter.inStockOnly) {
    filtered = filtered.filter((item) => item.stockQuantity > 0);
  }

  if (filter.search && filter.search.trim() !== '') {
    const term = filter.search.trim().toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.brand.toLowerCase().includes(term) ||
        item.model.toLowerCase().includes(term)
    );
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const offset = (page - 1) * limit;
  const items = filtered.slice(offset, offset + limit);

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  };
}
