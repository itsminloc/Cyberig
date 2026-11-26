/**
 * Hardware Domain Query Service
 * Encapsulates multi-criteria filtering, inventory querying, and hardware metadata operations.
 * Aligned with Task BE-07 specification.
 * Refactored according to Clean Code & Single Responsibility Principle (SRP).
 */

import { randomUUID } from 'node:crypto';
import { DatabaseClient, db } from '../../core/db';
import { EntityNotFoundError } from '../../core/errors';
import {
  HardwareCategory,
  HardwareItem,
  HardwareItemRow,
  toDomainHardwareItem,
} from './hardware.model';
import {
  FallbackHardwareRepository,
  fallbackHardwareRepo,
} from './hardware.fallback';

export type HardwareCategoryType =
  | 'CPU'
  | 'GPU'
  | 'MOTHERBOARD'
  | 'RAM'
  | 'PSU'
  | 'CASE'
  | 'COOLER'
  | 'STORAGE';

export interface CreateHardwareDto {
  categoryId: HardwareCategory | HardwareCategoryType | string;
  name: string;
  brand: string;
  model?: string;
  price: number;
  stockQuantity: number;
  specs?: Record<string, unknown>;
  isActive?: boolean;
}

export interface UpdateHardwareStockDto {
  addStock: number;
  newPrice?: number;
}

export interface HardwareQueryFilter {
  category?: HardwareCategory | HardwareCategoryType | string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  inStockOnly?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedHardwareResult {
  items: HardwareItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class HardwareService {
  constructor(
    private readonly dbClient: DatabaseClient = db,
    private readonly fallbackRepo: FallbackHardwareRepository = fallbackHardwareRepo
  ) {}

  /**
   * Executes SQL query against PostgreSQL if connected, or delegates to in-memory fallback repository.
   */
  private async safeQuery<T extends Record<string, any>>(
    sql: string,
    params: unknown[] = []
  ): Promise<T[]> {
    if (!this.dbClient.isConnected()) {
      return this.fallbackRepo.query<T>(sql, params);
    }
    try {
      return await this.dbClient.query<T>(sql, params);
    } catch {
      // Fall back on connection timeout, refusal, or missing db connection
      return this.fallbackRepo.query<T>(sql, params);
    }
  }

  /**
   * Retrieves hardware items matching given filters with pagination.
   */
  async getHardwareItems(filter: HardwareQueryFilter = {}): Promise<PaginatedHardwareResult> {
    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filter.limit) || 20));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = [];
    const queryParams: unknown[] = [];
    let paramIdx = 1;

    // 1. Filter: category
    if (filter.category) {
      whereClauses.push(`category_id = $${paramIdx++}`);
      queryParams.push(String(filter.category).toUpperCase());
    }

    // 2. Filter: brand
    if (filter.brand && filter.brand.trim()) {
      whereClauses.push(`LOWER(brand) = LOWER($${paramIdx++})`);
      queryParams.push(filter.brand.trim());
    }

    // 3. Filter: minPrice
    if (filter.minPrice !== undefined && filter.minPrice !== null && !isNaN(Number(filter.minPrice))) {
      whereClauses.push(`price >= $${paramIdx++}`);
      queryParams.push(Number(filter.minPrice));
    }

    // 4. Filter: maxPrice
    if (filter.maxPrice !== undefined && filter.maxPrice !== null && !isNaN(Number(filter.maxPrice))) {
      whereClauses.push(`price <= $${paramIdx++}`);
      queryParams.push(Number(filter.maxPrice));
    }

    // 5. Filter: search (name ILIKE)
    if (filter.search && filter.search.trim()) {
      whereClauses.push(`name ILIKE $${paramIdx++}`);
      queryParams.push(`%${filter.search.trim()}%`);
    }

    // 6. Filter: inStockOnly
    if (filter.inStockOnly === true) {
      whereClauses.push(`stock_quantity > 0`);
    }

    // 7. Filter: only active items (not soft-deleted)
    whereClauses.push(`(is_active IS NULL OR is_active = TRUE)`);

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count Total
    const countSql = `SELECT COUNT(*) AS total FROM hardware_items ${whereSql};`;
    const countRows = await this.safeQuery<{ total: string | number }>(countSql, queryParams);
    const total = Number(countRows[0]?.total || 0);
    const totalPages = Math.ceil(total / limit) || 1;

    // Query Paginated Items
    const itemsSql = `
      SELECT * FROM hardware_items
      ${whereSql}
      ORDER BY created_at DESC, name ASC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++};
    `;
    const itemsParams = [...queryParams, limit, offset];
    const itemRows = await this.safeQuery<HardwareItemRow>(itemsSql, itemsParams);
    const items = itemRows.map(toDomainHardwareItem);

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

  /**
   * Retrieves a single hardware item by UUID, model code, or storefront slug.
   * Throws EntityNotFoundError if item does not exist.
   */
  async getHardwareById(id: string): Promise<HardwareItem> {
    const cleanId = String(id || '').trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);

    if (isUuid) {
      const rows = await this.safeQuery<HardwareItemRow>(
        `SELECT * FROM hardware_items WHERE id = $1 LIMIT 1;`,
        [cleanId]
      );
      if (rows && rows.length > 0) {
        return toDomainHardwareItem(rows[0]);
      }
    } else if (cleanId) {
      // 1. Exact Storefront / Fixture slug match preserves canonical slug ID & Redis lock key
      const fixtureMatch = this.fallbackRepo.findById(cleanId);
      if (fixtureMatch) {
        return toDomainHardwareItem(fixtureMatch);
      }

      // 2. Manufacturer SKU / Model code lookup (in-memory fixture or connected PostgreSQL)
      const fallbackByModel = this.fallbackRepo
        .query<HardwareItemRow>('SELECT * FROM hardware_items', [])
        .find((row) => row.model.toLowerCase() === cleanId.toLowerCase());
      if (fallbackByModel) {
        return toDomainHardwareItem(fallbackByModel);
      }

      if (this.dbClient.isConnected()) {
        try {
          const byModelRows = await this.dbClient.query<HardwareItemRow>(
            `SELECT * FROM hardware_items WHERE LOWER(model) = LOWER($1) LIMIT 1;`,
            [cleanId]
          );
          if (byModelRows && byModelRows.length > 0) {
            return toDomainHardwareItem(byModelRows[0]);
          }
        } catch {
          // Ignore DB lookup errors and fall through to EntityNotFoundError
        }
      }
    }

    throw new EntityNotFoundError('Không tìm thấy linh kiện với mã ID: ' + id);
  }

  /**
   * Deducts physical stock quantity after order confirmation.
   */
  async deductStock(id: string, quantity: number): Promise<void> {
    try {
      await this.dbClient.query(
        'UPDATE hardware_items SET stock_quantity = stock_quantity - $1 WHERE id = $2;',
        [quantity, id]
      );
    } catch {
      // Offline fallback
    }

    this.fallbackRepo.deductStock(id, quantity);
  }

  /**
   * Updates price for testing price decoupling and Price Snapshot integrity.
   */
  async updatePrice(id: string, newPrice: number): Promise<void> {
    try {
      await this.dbClient.query(
        'UPDATE hardware_items SET price = $1 WHERE id = $2;',
        [newPrice, id]
      );
    } catch {
      // Offline fallback
    }

    this.fallbackRepo.updatePrice(id, newPrice);
  }

  /**
   * Thêm linh kiện mới vào kho (Admin)
   */
  async createHardwareItem(dto: CreateHardwareDto): Promise<HardwareItem> {
    const id = randomUUID();
    const isActive = dto.isActive !== false;
    const model =
      dto.model ||
      `HW-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const specsJson = JSON.stringify(dto.specs || {});

    const rows = await this.safeQuery<HardwareItemRow>(
      `INSERT INTO hardware_items (id, category_id, name, brand, model, price, stock_quantity, specs, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *;`,
      [
        id,
        String(dto.categoryId).toUpperCase(),
        dto.name,
        dto.brand,
        model,
        dto.price,
        dto.stockQuantity,
        specsJson,
        isActive,
      ]
    );

    const createdRow = rows[0] || {
      id,
      category_id: String(dto.categoryId).toUpperCase(),
      name: dto.name,
      brand: dto.brand,
      model,
      price: dto.price,
      stock_quantity: dto.stockQuantity,
      specs: specsJson,
      is_active: isActive,
      created_at: new Date(),
      updated_at: new Date(),
    };

    this.fallbackRepo.save(createdRow);
    return toDomainHardwareItem(createdRow);
  }

  /**
   * Nhập thêm hàng (Restock) & Cập nhật giá (Admin)
   */
  async updateHardwareStock(
    id: string,
    dto: UpdateHardwareStockDto
  ): Promise<HardwareItem> {
    await this.getHardwareById(id);

    let rows: HardwareItemRow[];
    if (dto.newPrice !== undefined && dto.newPrice !== null) {
      rows = await this.safeQuery<HardwareItemRow>(
        `UPDATE hardware_items
         SET stock_quantity = stock_quantity + $1, price = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING *;`,
        [dto.addStock, dto.newPrice, id]
      );
    } else {
      rows = await this.safeQuery<HardwareItemRow>(
        `UPDATE hardware_items
         SET stock_quantity = stock_quantity + $1, updated_at = NOW()
         WHERE id = $2
         RETURNING *;`,
        [dto.addStock, id]
      );
    }

    const updatedRow = rows[0];
    if (updatedRow) {
      this.fallbackRepo.save(updatedRow);
      return toDomainHardwareItem(updatedRow);
    }

    const fallbackItem = this.fallbackRepo.updateStock(id, dto.addStock, dto.newPrice);
    if (fallbackItem) {
      return toDomainHardwareItem(fallbackItem);
    }

    throw new EntityNotFoundError('Không tìm thấy linh kiện với mã ID: ' + id);
  }

  /**
   * Ngừng kinh doanh linh kiện - Soft Delete (Admin)
   */
  async softDeleteHardware(id: string): Promise<HardwareItem> {
    await this.getHardwareById(id);

    const rows = await this.safeQuery<HardwareItemRow>(
      `UPDATE hardware_items
       SET is_active = FALSE, updated_at = NOW()
       WHERE id = $1
       RETURNING *;`,
      [id]
    );

    const updatedRow = rows[0];
    if (updatedRow) {
      this.fallbackRepo.save(updatedRow);
      return toDomainHardwareItem(updatedRow);
    }

    const fallbackItem = this.fallbackRepo.updateSoftDelete(id);
    if (fallbackItem) {
      return toDomainHardwareItem(fallbackItem);
    }

    throw new EntityNotFoundError('Không tìm thấy linh kiện với mã ID: ' + id);
  }
}

export const hardwareService = new HardwareService();
export default hardwareService;
