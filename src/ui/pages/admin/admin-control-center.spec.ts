/**
 * Admin Control Center & Inventory Hub Unit & Integration Spec (Task FE-10 / Sprint 5)
 * Verifies Stock Status Badges, KPI Telemetry calculations, New Hardware & Restock validations,
 * and Admin Service REST methods with Bearer token injection.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getStockStatusMeta,
  calculateKpis,
  validateNewHardware,
  validateRestock,
  formatVND,
  HARDWARE_CATEGORIES,
} from './admin-control-center.utils';
import { adminService, NewHardwareDto } from '../../services/admin.service';
import { setStoredSession, clearStoredSession, UserProfile } from '../../services/api';
import { HardwareCategory } from '../../../modules/hardware/hardware.model';

describe('Admin Control Center & Inventory Hub (Task FE-10)', () => {
  const sampleAdmin: UserProfile = {
    id: 'user-admin-01',
    email: 'admin@cyberig.vn',
    role: 'ADMIN',
    fullName: 'Quản Trị Viên CyberRig',
    phone: '0900000001',
  };

  beforeEach(() => {
    clearStoredSession();
  });

  test('FE-10 Test 1: getStockStatusMeta correctly classifies 0, <= 2, and > 2 stock levels', () => {
    // 0 stock -> OUT OF STOCK
    const outStock = getStockStatusMeta(0);
    assert.strictEqual(outStock.label, 'HẾT HÀNG');
    assert.strictEqual(outStock.className, 'is-out');

    // 1 & 2 stock -> LOW STOCK ALERT
    const lowStock1 = getStockStatusMeta(1);
    assert.strictEqual(lowStock1.label, 'SẮP HẾT');
    assert.strictEqual(lowStock1.className, 'is-low');

    const lowStock2 = getStockStatusMeta(2);
    assert.strictEqual(lowStock2.label, 'SẮP HẾT');
    assert.strictEqual(lowStock2.className, 'is-low');

    // > 2 stock -> IN STOCK
    const inStock3 = getStockStatusMeta(3);
    assert.strictEqual(inStock3.label, 'CÒN HÀNG');
    assert.strictEqual(inStock3.className, 'is-in-stock');

    const inStock50 = getStockStatusMeta(50);
    assert.strictEqual(inStock50.label, 'CÒN HÀNG');
    assert.strictEqual(inStock50.className, 'is-in-stock');
  });

  test('FE-10 Test 2: calculateKpis accurately computes total items, low stock warnings, out-of-stock and total inventory valuation', () => {
    const sampleItems = [
      { id: '1', categoryId: 'CPU', name: 'Intel i9-13900K', brand: 'Intel', price: 14000000, stockQuantity: 5 },
      { id: '2', categoryId: 'GPU', name: 'ASUS RTX 4090', brand: 'ASUS', price: 48000000, stockQuantity: 1 }, // low
      { id: '3', categoryId: 'RAM', name: 'Corsair DDR5 32GB', brand: 'Corsair', price: 3000000, stockQuantity: 0 }, // out & low
      { id: '4', categoryId: 'PSU', name: 'Seasonic 1000W', brand: 'Seasonic', price: 4500000, stockQuantity: 2 }, // low
    ];

    const kpis = calculateKpis(sampleItems as any);

    assert.strictEqual(kpis.totalItems, 4, 'Total items should be 4');
    assert.strictEqual(kpis.lowStockCount, 3, 'Items with stock <= 2 should be 3 (stock: 1, 0, 2)');
    assert.strictEqual(kpis.outOfStockCount, 1, 'Items with stock 0 should be 1');

    // Valuation: (14M * 5) + (48M * 1) + (3M * 0) + (4.5M * 2) = 70M + 48M + 0 + 9M = 127,000,000
    assert.strictEqual(kpis.totalInventoryValue, 127000000);

    // Empty array edge case
    const emptyKpis = calculateKpis([]);
    assert.strictEqual(emptyKpis.totalItems, 0);
    assert.strictEqual(emptyKpis.lowStockCount, 0);
    assert.strictEqual(emptyKpis.outOfStockCount, 0);
    assert.strictEqual(emptyKpis.totalInventoryValue, 0);
  });

  test('FE-10 Test 3: validateNewHardware enforces mandatory fields, positive price, and non-negative stock', () => {
    // Valid item
    const validPayload: Partial<NewHardwareDto> = {
      categoryId: 'GPU',
      name: 'ASUS TUF Gaming GeForce RTX 4070 Ti SUPER 16GB',
      brand: 'ASUS',
      price: 24500000,
      stockQuantity: 10,
      specs: { vram: '16GB' },
    };
    const validRes = validateNewHardware(validPayload);
    assert.strictEqual(validRes.isValid, true);
    assert.strictEqual(validRes.error, undefined);

    // Missing Name
    const missingName = validateNewHardware({ ...validPayload, name: '   ' });
    assert.strictEqual(missingName.isValid, false);
    assert.ok(missingName.error?.includes('Tên linh kiện'));

    // Missing Brand
    const missingBrand = validateNewHardware({ ...validPayload, brand: '' });
    assert.strictEqual(missingBrand.isValid, false);
    assert.ok(missingBrand.error?.includes('Thương hiệu'));

    // Invalid Price <= 0
    const zeroPrice = validateNewHardware({ ...validPayload, price: 0 });
    assert.strictEqual(zeroPrice.isValid, false);
    assert.ok(zeroPrice.error?.includes('Giá bán'));

    // Invalid Stock < 0
    const negStock = validateNewHardware({ ...validPayload, stockQuantity: -5 });
    assert.strictEqual(negStock.isValid, false);
    assert.ok(negStock.error?.includes('Số lượng'));

    // Missing Category
    const missingCat = validateNewHardware({ ...validPayload, categoryId: '' });
    assert.strictEqual(missingCat.isValid, false);
    assert.ok(missingCat.error?.includes('danh mục'));
  });

  test('FE-10 Test 4: validateRestock validates incremental stock additions and optional re-price updates', () => {
    // Valid restock only
    const valid1 = validateRestock(5);
    assert.strictEqual(valid1.isValid, true);

    // Valid restock with new price
    const valid2 = validateRestock(10, 23000000);
    assert.strictEqual(valid2.isValid, true);

    // Invalid addStock < 0
    const negAdd = validateRestock(-1);
    assert.strictEqual(negAdd.isValid, false);
    assert.ok(negAdd.error?.includes('không âm'));

    // Invalid newPrice <= 0
    const invalidPrice = validateRestock(5, -1000);
    assert.strictEqual(invalidPrice.isValid, false);
    assert.ok(invalidPrice.error?.includes('Giá bán mới'));
  });

  test('FE-10 Test 5: adminService methods perform HTTP requests with automatic Bearer token injection', async () => {
    setStoredSession({
      accessToken: 'jwt-matrix-admin-token-999',
      refreshToken: 'jwt-refresh-admin',
      user: sampleAdmin,
    });

    let requestedUrls: string[] = [];
    let requestedMethods: string[] = [];
    let requestedAuthHeaders: string[] = [];
    let requestedBodies: string[] = [];

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method || 'GET';
      requestedUrls.push(url);
      requestedMethods.push(method);
      const headers = (init?.headers as Record<string, string>) || {};
      requestedAuthHeaders.push(headers['Authorization'] || '');
      requestedBodies.push(init?.body ? String(init.body) : '');

      if (url.includes('/api/admin/hardware') && method === 'POST') {
        const bodyObj = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify({
            success: true,
            data: { id: 'hw-new-uuid-01', ...bodyObj, createdAt: new Date().toISOString() },
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url.includes('/stock') && method === 'PATCH') {
        return new Response(
          JSON.stringify({
            success: true,
            data: { id: 'hw-item-01', name: 'RTX 4080', price: 31000000, stockQuantity: 15 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url.includes('/api/admin/hardware/hw-del-01') && method === 'DELETE') {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Đã ngừng kinh doanh linh kiện thành công.',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url.includes('/api/hardware') && method === 'GET') {
        return new Response(
          JSON.stringify({
            success: true,
            data: [
              { id: 'hw-1', name: 'Core i5 13600K', price: 7000000, stockQuantity: 10, categoryId: 'CPU' },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify({ success: false }), { status: 404 });
    };

    try {
      // 1. Create Hardware Item
      const created = await adminService.createHardwareItem({
        categoryId: HardwareCategory.GPU,
        name: 'ASUS ROG Strix RTX 4080',
        brand: 'ASUS',
        price: 32000000,
        stockQuantity: 5,
        specs: { vram: '16GB' },
      });
      assert.strictEqual(created.id, 'hw-new-uuid-01');
      assert.strictEqual(created.name, 'ASUS ROG Strix RTX 4080');
      assert.strictEqual(requestedMethods[0], 'POST');
      assert.strictEqual(requestedAuthHeaders[0], 'Bearer jwt-matrix-admin-token-999');

      // 2. Restock & Reprice
      const updated = await adminService.updateStockAndPrice('hw-item-01', {
        addStock: 5,
        newPrice: 31000000,
      });
      assert.strictEqual(updated.stockQuantity, 15);
      assert.strictEqual(requestedMethods[1], 'PATCH');
      assert.ok(requestedUrls[1].includes('/api/admin/hardware/hw-item-01/stock'));
      assert.strictEqual(requestedAuthHeaders[1], 'Bearer jwt-matrix-admin-token-999');

      // 3. Soft Delete Item
      await adminService.softDeleteHardwareItem('hw-del-01');
      assert.strictEqual(requestedMethods[2], 'DELETE');
      assert.ok(requestedUrls[2].includes('/api/admin/hardware/hw-del-01'));
      assert.strictEqual(requestedAuthHeaders[2], 'Bearer jwt-matrix-admin-token-999');

      // 4. Fetch Hardware Catalog
      const items = await adminService.fetchAdminHardware({ category: 'CPU', search: '13600K' });
      assert.strictEqual(items.length, 1);
      assert.strictEqual(requestedMethods[3], 'GET');
      assert.ok(requestedUrls[3].includes('category=CPU'));
      assert.ok(requestedUrls[3].includes('search=13600K'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('FE-10 Test 6: adminService handles HTTP 403 Forbidden errors when actor lacks ADMIN clearance', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Yêu cầu quyền hạn ADMIN để truy cập tài nguyên này.' },
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    };

    try {
      await adminService.softDeleteHardwareItem('hw-test-any');
      assert.fail('Should have thrown an error on 403 response');
    } catch (err: any) {
      assert.ok(err);
      assert.strictEqual(err.status, 403);
      assert.ok(err.message.includes('Yêu cầu quyền hạn ADMIN'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
