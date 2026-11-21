/**
 * In-Memory Fallback Hardware Repository
 * Simulates SQL query execution when PostgreSQL is disconnected or during offline development.
 * Decouples in-memory data handling from HardwareService.
 */

import { HardwareItemRow } from './hardware.model';
import { HARDWARE_FIXTURES } from './hardware.fixtures';

export class FallbackHardwareRepository {
  private items: HardwareItemRow[] = [...HARDWARE_FIXTURES];

  /**
   * Evaluates a SQL query string against in-memory fixture collection.
   */
  query<T extends Record<string, any>>(sql: string, params: unknown[] = []): T[] {
    const cleanSql = sql.trim().toUpperCase();

    // 1. INSERT INTO hardware_items
    if (cleanSql.includes('INSERT INTO HARDWARE_ITEMS')) {
      const row: HardwareItemRow = {
        id: String(params[0]),
        category_id: String(params[1]),
        name: String(params[2]),
        brand: String(params[3]),
        model: String(params[4]),
        price: Number(params[5]),
        stock_quantity: Number(params[6]),
        specs: typeof params[7] === 'string' ? params[7] : JSON.stringify(params[7] || {}),
        is_active: params[8] !== false,
        created_at: new Date(),
        updated_at: new Date(),
      };
      const existingIdx = this.items.findIndex((i) => i.id === row.id || i.model === row.model);
      if (existingIdx >= 0) {
        this.items[existingIdx] = row;
      } else {
        this.items.push(row);
      }
      return [row] as unknown as T[];
    }

    // 2. UPDATE hardware_items SET is_active = FALSE
    if (cleanSql.includes('SET IS_ACTIVE = FALSE')) {
      const id = String(params[0]);
      const item = this.items.find((i) => i.id === id);
      if (item) {
        item.is_active = false;
        item.updated_at = new Date();
        return [item] as unknown as T[];
      }
      return [] as unknown as T[];
    }

    // 3. UPDATE hardware_items SET stock_quantity = stock_quantity + $1
    if (cleanSql.includes('STOCK_QUANTITY = STOCK_QUANTITY + $1')) {
      if (cleanSql.includes('PRICE = $2')) {
        const addStock = Number(params[0]);
        const newPrice = Number(params[1]);
        const id = String(params[2]);
        const item = this.items.find((i) => i.id === id);
        if (item) {
          item.stock_quantity = Number(item.stock_quantity) + addStock;
          item.price = newPrice;
          item.updated_at = new Date();
          return [item] as unknown as T[];
        }
      } else {
        const addStock = Number(params[0]);
        const id = String(params[1]);
        const item = this.items.find((i) => i.id === id);
        if (item) {
          item.stock_quantity = Number(item.stock_quantity) + addStock;
          item.updated_at = new Date();
          return [item] as unknown as T[];
        }
      }
      return [] as unknown as T[];
    }

    // 4. SELECT * FROM hardware_items WHERE id = $1 LIMIT 1
    if (cleanSql.includes('WHERE ID = $1')) {
      const id = String(params[0]);
      const found = this.items.find((item) => item.id === id);
      return (found ? [found] : []) as unknown as T[];
    }

    // 5. Filter criteria evaluation in TypeScript (excluding inactive items)
    let filtered = this.items.filter((i) => i.is_active !== false);

    // Check category filter
    if (cleanSql.includes('CATEGORY_ID = $')) {
      const catParam = String(
        params.find(
          (p) =>
            typeof p === 'string' &&
            ['CPU', 'GPU', 'MOTHERBOARD', 'RAM', 'PSU', 'CASE', 'COOLER', 'STORAGE'].includes(p.toUpperCase())
        )
      );
      if (catParam) {
        filtered = filtered.filter((i) => i.category_id.toUpperCase() === catParam.toUpperCase());
      }
    }

    // Check brand filter
    if (cleanSql.includes('LOWER(BRAND) = LOWER($')) {
      const brandIndex = cleanSql.indexOf('LOWER(BRAND) = LOWER($');
      const paramNum = parseInt(cleanSql.slice(brandIndex + 22, brandIndex + 24), 10);
      const brandVal = params[paramNum - 1];
      if (brandVal) {
        filtered = filtered.filter((i) => i.brand.toLowerCase() === String(brandVal).toLowerCase());
      }
    }

    // Check minPrice filter
    if (cleanSql.includes('PRICE >= $')) {
      const minPriceIdx = cleanSql.indexOf('PRICE >= $');
      const paramNum = parseInt(cleanSql.slice(minPriceIdx + 10, minPriceIdx + 12), 10);
      const minVal = Number(params[paramNum - 1]);
      if (!isNaN(minVal)) {
        filtered = filtered.filter((i) => Number(i.price) >= minVal);
      }
    }

    // Check maxPrice filter
    if (cleanSql.includes('PRICE <= $')) {
      const maxPriceIdx = cleanSql.indexOf('PRICE <= $');
      const paramNum = parseInt(cleanSql.slice(maxPriceIdx + 10, maxPriceIdx + 12), 10);
      const maxVal = Number(params[paramNum - 1]);
      if (!isNaN(maxVal)) {
        filtered = filtered.filter((i) => Number(i.price) <= maxVal);
      }
    }

    // Check search filter (name ILIKE)
    if (cleanSql.includes('NAME ILIKE $')) {
      const searchIdx = cleanSql.indexOf('NAME ILIKE $');
      const paramNum = parseInt(cleanSql.slice(searchIdx + 12, searchIdx + 14), 10);
      const searchPattern = String(params[paramNum - 1] || '')
        .replace(/%/g, '')
        .toLowerCase();
      if (searchPattern) {
        filtered = filtered.filter((i) => i.name.toLowerCase().includes(searchPattern));
      }
    }

    // Check inStockOnly filter
    if (cleanSql.includes('STOCK_QUANTITY > 0')) {
      filtered = filtered.filter((i) => Number(i.stock_quantity) > 0);
    }

    // COUNT query
    if (cleanSql.includes('SELECT COUNT(*)')) {
      return [{ total: filtered.length }] as unknown as T[];
    }

    // Sorting
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Pagination (LIMIT / OFFSET)
    if (cleanSql.includes('LIMIT $') && cleanSql.includes('OFFSET $')) {
      const limitVal = Number(params[params.length - 2]) || 20;
      const offsetVal = Number(params[params.length - 1]) || 0;
      filtered = filtered.slice(offsetVal, offsetVal + limitVal);
    }

    return filtered as unknown as T[];
  }

  findById(id: string): HardwareItemRow | undefined {
    return this.items.find((i) => i.id === id);
  }

  save(row: HardwareItemRow): HardwareItemRow {
    const existingIdx = this.items.findIndex((i) => i.id === row.id || i.model === row.model);
    if (existingIdx >= 0) {
      this.items[existingIdx] = row;
    } else {
      this.items.push(row);
    }
    return row;
  }

  deductStock(id: string, quantity: number): HardwareItemRow | undefined {
    const item = this.items.find((h) => h.id === id);
    if (item) {
      item.stock_quantity = Math.max(0, Number(item.stock_quantity) - quantity);
      item.updated_at = new Date();
    }
    return item;
  }

  updatePrice(id: string, newPrice: number): HardwareItemRow | undefined {
    const item = this.items.find((h) => h.id === id);
    if (item) {
      item.price = newPrice;
      item.updated_at = new Date();
    }
    return item;
  }

  updateStock(id: string, addStock: number, newPrice?: number): HardwareItemRow | undefined {
    const item = this.items.find((i) => i.id === id);
    if (item) {
      item.stock_quantity = Number(item.stock_quantity) + addStock;
      if (newPrice !== undefined && newPrice !== null) {
        item.price = newPrice;
      }
      item.updated_at = new Date();
      return item;
    }
    return undefined;
  }

  updateSoftDelete(id: string): HardwareItemRow | undefined {
    const item = this.items.find((i) => i.id === id);
    if (item) {
      item.is_active = false;
      item.updated_at = new Date();
      return item;
    }
    return undefined;
  }
}

export const fallbackHardwareRepo = new FallbackHardwareRepository();

