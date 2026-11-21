/**
 * Task E2E-02: Comprehensive End-to-End Integration Suite with Auth & RBAC (Sprint 5 Final)
 * Full closed-loop platform testing covering 5 sequential phases:
 * Phase 1: Identity & Access (Register Customer, Login Admin)
 * Phase 2: PC Builder & Compatibility Validation (AM5 Compatible, Socket Conflict Incompatible)
 * Phase 3: Guest vs Authenticated Checkout & Inventory Locking (Guest null ID, Auth customer ID, Stock deduction)
 * Phase 4: Customer Portal Data Isolation (Query own orders with token, 401 Unauthorized without token)
 * Phase 5: RBAC Enforcement & Admin Operations (Customer blocked 403, Admin restocks +10 successfully)
 * TearDown: Clean truncate of test customer, e2e orders, restored hardware stock, and flushed Redis cache.
 */

import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Server } from 'node:http';
import { app } from '../../app';
import { db } from '../../core/db';
import { redis } from '../../core/redis';
import { HardwareCategory } from '../../modules/hardware/hardware.model';
import { hardwareService } from '../../modules/hardware/hardware.service';
import { orderService } from '../../modules/orders/order.service';
import { config } from '../../core/config';
import { buildWebhookHeaders } from '../../core/security/hmac-webhook.util';

describe('Task E2E-02: Comprehensive End-to-End Integration Suite with Auth & RBAC', () => {
  let server: Server;
  let baseUrl: string;

  // State transferred across phases
  let customerToken: string;
  let customerRefreshToken: string;
  let customerId: string;
  let adminToken: string;
  let selectedHardwareId: string = 'cpu-i5-13600k';
  let initialHardwareStock: number;
  let authenticatedOrderId: string;

  const testCustomerEmail = 'customer.e2e@cyberrig.vn';
  const testCustomerPassword = 'Password123!';

  before(async () => {
    // 1. Initial cleanup of previous test data if any
    try {
      await db.query(
        `DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE customer_email LIKE '%e2e%');`
      );
      await db.query(`DELETE FROM orders WHERE customer_email LIKE '%e2e%';`);
      await db.query(`DELETE FROM users WHERE LOWER(email) = $1;`, [testCustomerEmail.toLowerCase()]);
    } catch {
      // Offline fallback mode
    }

    await redis.flushTestData();
    orderService.resetFallbackData();

    // 2. Start Express server on dynamic port
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });

    // 3. Resolve a valid hardware item for checkout tests
    try {
      const hwRes = await fetch(`${baseUrl}/api/hardware?limit=5`);
      const hwJson = (await hwRes.json()) as any;
      if (hwJson.success && hwJson.data?.length > 0) {
        const found = hwJson.data.find((h: any) => h.stockQuantity >= 5) || hwJson.data[0];
        selectedHardwareId = found.id;
      }
    } catch {}

    const initialHw = await hardwareService.getHardwareById(selectedHardwareId);
    initialHardwareStock = initialHw.stockQuantity;
  });

  after(async () => {
    // 1. Restore hardware stock
    try {
      const currentHw = await hardwareService.getHardwareById(selectedHardwareId);
      if (currentHw.stockQuantity !== initialHardwareStock) {
        const delta = initialHardwareStock - currentHw.stockQuantity;
        if (delta > 0) {
          await hardwareService.restockHardware(selectedHardwareId, delta);
        } else if (delta < 0) {
          await hardwareService.deductStock(selectedHardwareId, Math.abs(delta));
        }
      }
    } catch {}

    // 2. Clean up test orders and users
    try {
      await db.query(
        `DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE customer_email LIKE '%e2e%');`
      );
      await db.query(`DELETE FROM orders WHERE customer_email LIKE '%e2e%';`);
      await db.query(`DELETE FROM users WHERE LOWER(email) = $1;`, [testCustomerEmail.toLowerCase()]);
    } catch {}

    orderService.resetFallbackData();
    await redis.flushTestData();

    // 3. Terminate HTTP server cleanly
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  // =========================================================================
  // GIAI ĐOẠN 1: IDENTITY & ACCESS (ĐĂNG KÝ / ĐĂNG NHẬP)
  // =========================================================================
  test('Giai đoạn 1.1: Tạo tài khoản Customer mới qua POST /api/auth/register', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testCustomerEmail,
        password: testCustomerPassword,
        fullName: 'Customer E2E User',
        phone: '0901234567',
      }),
    });

    assert.strictEqual(res.status, 201, `Register must return HTTP 201. Status: ${res.status}`);
    const json = (await res.json()) as any;
    assert.strictEqual(json.success, true);
    assert.ok(json.data.accessToken, 'Must return accessToken');
    assert.ok(json.data.refreshToken, 'Must return refreshToken');
    assert.ok(json.data.user?.id, 'Must return user with valid ID');
    assert.strictEqual(json.data.user.email.toLowerCase(), testCustomerEmail.toLowerCase());
    assert.strictEqual(json.data.user.role, 'CUSTOMER');

    // Store credentials for subsequent phases
    customerToken = json.data.accessToken;
    customerRefreshToken = json.data.refreshToken;
    customerId = json.data.user.id;
  });

  test('Giai đoạn 1.2: Đăng nhập tài khoản Admin có sẵn qua POST /api/auth/login', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@cyberig.vn',
        password: 'Admin@Password123',
      }),
    });

    assert.strictEqual(res.status, 200, `Admin login must return HTTP 200. Status: ${res.status}`);
    const json = (await res.json()) as any;
    assert.strictEqual(json.success, true);
    assert.ok(json.data.accessToken, 'Must return admin accessToken');
    assert.strictEqual(json.data.user?.role, 'ADMIN', 'Must have role ADMIN');

    adminToken = json.data.accessToken;
  });

  // =========================================================================
  // GIAI ĐOẠN 2: PC BUILDER & COMPATIBILITY VALIDATION
  // =========================================================================
  test('Giai đoạn 2.1: Gửi payload cấu hình linh kiện hợp lệ AM5 đến engine thẩm định', async () => {
    const validAm5Build = [
      {
        id: 'cpu-am5-7800x3d',
        categoryId: HardwareCategory.CPU,
        name: 'AMD Ryzen 7 7800X3D',
        brand: 'AMD',
        model: '7800X3D',
        price: 9990000,
        stockQuantity: 10,
        specs: { socket: 'AM5', tdpWatts: 120 },
      },
      {
        id: 'mb-am5-b650',
        categoryId: HardwareCategory.MOTHERBOARD,
        name: 'ASUS TUF GAMING B650-PLUS WIFI',
        brand: 'ASUS',
        model: 'B650-PLUS',
        price: 4990000,
        stockQuantity: 10,
        specs: { socket: 'AM5', ramType: 'DDR5', ramSlots: 4 },
      },
      {
        id: 'ram-ddr5-corsair',
        categoryId: HardwareCategory.RAM,
        name: 'Corsair Vengeance 32GB DDR5 5600MHz',
        brand: 'Corsair',
        model: 'CMK32GX5',
        price: 3290000,
        stockQuantity: 10,
        specs: { generation: 'DDR5', capacityGb: 32, modulesCount: 2 },
      },
      {
        id: 'psu-750w-corsair',
        categoryId: HardwareCategory.PSU,
        name: 'Corsair RM750e 750W 80 Plus Gold',
        brand: 'Corsair',
        model: 'RM750E',
        price: 2690000,
        stockQuantity: 10,
        specs: { wattage: 750 },
      },
    ];

    const res = await fetch(`${baseUrl}/api/compatibility/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: validAm5Build }),
    });

    assert.strictEqual(res.status, 200);
    const json = (await res.json()) as any;
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.status, 'COMPATIBLE', 'Build should be evaluated as COMPATIBLE');
    assert.ok(json.data.totalEstimatedWattage > 0, 'Should calculate estimated wattage');
    const warnings = (json.data.warnings || json.data.issues?.filter((i: any) => i.type === 'WARNING') || []);
    assert.deepStrictEqual(warnings, [], 'Should have no warnings for standard compatible build');
  });

  test('Giai đoạn 2.2: Gửi payload xung đột Socket (CPU Intel LGA1700 với Mainboard AMD AM5)', async () => {
    const conflictBuild = [
      {
        id: 'cpu-intel-13600k',
        categoryId: HardwareCategory.CPU,
        name: 'Intel Core i5-13600K',
        brand: 'Intel',
        model: 'BX8071513600K',
        price: 7690000,
        stockQuantity: 10,
        specs: { socket: 'LGA1700', tdpWatts: 125 },
      },
      {
        id: 'mb-am5-b650',
        categoryId: HardwareCategory.MOTHERBOARD,
        name: 'ASUS TUF GAMING B650-PLUS WIFI (Socket AM5)',
        brand: 'ASUS',
        model: 'B650-PLUS',
        price: 4990000,
        stockQuantity: 10,
        specs: { socket: 'AM5', ramType: 'DDR5' },
      },
    ];

    const res = await fetch(`${baseUrl}/api/compatibility/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: conflictBuild }),
    });

    assert.strictEqual(res.status, 200);
    const json = (await res.json()) as any;
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.status, 'INCOMPATIBLE', 'Build must be evaluated as INCOMPATIBLE');
    assert.ok(json.data.issues?.length > 0, 'Must provide detailed conflict issues');
    assert.ok(
      json.data.issues.some((iss: any) => iss.rule === 'SOCKET' || iss.message?.toLowerCase().includes('socket')),
      'Should report a socket conflict'
    );
  });

  // =========================================================================
  // GIAI ĐOẠN 3: GUEST VS AUTHENTICATED CHECKOUT & INVENTORY LOCKING
  // =========================================================================
  test('Giai đoạn 3.1: Gửi request tạo đơn hàng PC POST /api/orders KHÔNG có token (Guest Checkout)', async () => {
    const guestPayload = {
      customerName: 'Khách Vãng Lai E2E',
      customerEmail: 'guest.e2e@cyberrig.vn',
      customerPhone: '0912345678',
      shippingAddress: '123 Đường Bạch Đằng, Quận Hải Châu, Đà Nẵng',
      items: [{ hardwareId: selectedHardwareId, quantity: 1 }],
    };

    const res = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '198.51.100.50',
      },
      body: JSON.stringify(guestPayload),
    });

    assert.strictEqual(res.status, 201, `Guest checkout must return HTTP 201. Status: ${res.status}`);
    const json = (await res.json()) as any;
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.status, 'PENDING_PAYMENT');
    assert.strictEqual(json.data.customerId, null, 'Guest order must have customerId = null');
  });

  test('Giai đoạn 3.2: Gửi request tạo đơn hàng PC POST /api/orders ĐÍNH KÈM Bearer customerToken và trừ tồn kho sau khi confirm', async () => {
    const hwBefore = await hardwareService.getHardwareById(selectedHardwareId);
    const stockBeforeOrder = hwBefore.stockQuantity;

    const authPayload = {
      customerName: 'Customer E2E User',
      customerEmail: testCustomerEmail,
      customerPhone: '0901234567',
      shippingAddress: '456 Cyber St, Quận 1, TP. Hồ Chí Minh',
      items: [{ hardwareId: selectedHardwareId, quantity: 1 }],
    };

    const res = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`,
        'x-forwarded-for': '198.51.100.51',
      },
      body: JSON.stringify(authPayload),
    });

    assert.strictEqual(res.status, 201, `Authenticated checkout must return HTTP 201. Status: ${res.status}`);
    const json = (await res.json()) as any;
    assert.strictEqual(json.success, true);
    assert.strictEqual(
      json.data.customerId,
      customerId,
      'Order customerId must exactly match authenticated Customer userId'
    );
    assert.strictEqual(json.data.status, 'PENDING_PAYMENT');

    authenticatedOrderId = json.data.id;

    // Confirm order via HMAC-SHA256 Signed VietQR Webhook to trigger physical inventory reduction
    const webhookHeaders = buildWebhookHeaders(config.security.webhookSecret, authenticatedOrderId);
    const confirmRes = await fetch(`${baseUrl}/api/orders/${authenticatedOrderId}/confirm`, {
      method: 'POST',
      headers: webhookHeaders,
    });
    assert.strictEqual(confirmRes.status, 200, 'Order confirmation must return HTTP 200');

    // Verify physical stock quantity decreased by 1
    const hwAfter = await hardwareService.getHardwareById(selectedHardwareId);
    assert.strictEqual(
      hwAfter.stockQuantity,
      stockBeforeOrder - 1,
      'Physical warehouse stock must decrease by 1 after confirmed purchase'
    );
  });

  // =========================================================================
  // GIAI ĐOẠN 4: CUSTOMER PORTAL DATA ISOLATION
  // =========================================================================
  test('Giai đoạn 4.1: Gọi GET /api/customer/orders với customerToken trả về đúng đơn hàng vừa tạo', async () => {
    const res = await fetch(`${baseUrl}/api/customer/orders`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${customerToken}`,
      },
    });

    assert.strictEqual(res.status, 200, `Customer portal orders must return HTTP 200. Status: ${res.status}`);
    const json = (await res.json()) as any;
    assert.strictEqual(json.success, true);
    assert.ok(Array.isArray(json.data), 'Customer orders should be an array');

    const matchedOrder = json.data.find((ord: any) => ord.id === authenticatedOrderId);
    assert.ok(matchedOrder, 'Customer order history must contain the newly created order');
    assert.strictEqual(matchedOrder.items?.[0]?.hardwareId, selectedHardwareId);
  });

  test('Giai đoạn 4.2: Gọi GET /api/customer/orders mà KHÔNG gửi token bị chặn với HTTP 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/customer/orders`, {
      method: 'GET',
    });

    assert.strictEqual(res.status, 401, 'Unauthenticated request must be blocked with HTTP 401');
    const json = (await res.json()) as any;
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.error?.code, 'UNAUTHORIZED');
  });

  // =========================================================================
  // GIAI ĐOẠN 5: RBAC ENFORCEMENT & ADMIN OPERATIONS
  // =========================================================================
  test('Giai đoạn 5.1: Dùng customerToken cố tình gọi API Admin PATCH /api/admin/hardware/:id/stock bị chặn HTTP 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/admin/hardware/${selectedHardwareId}/stock`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ addStock: 5 }),
    });

    assert.strictEqual(res.status, 403, 'Customer role must be blocked from admin endpoints with HTTP 403');
    const json = (await res.json()) as any;
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.error?.code, 'FORBIDDEN');
  });

  test('Giai đoạn 5.2: Dùng adminToken gọi API PATCH /api/admin/hardware/:id/stock để nhập thêm 10 chiếc vào kho', async () => {
    const hwBefore = await hardwareService.getHardwareById(selectedHardwareId);
    const stockBeforeRestock = hwBefore.stockQuantity;

    const res = await fetch(`${baseUrl}/api/admin/hardware/${selectedHardwareId}/stock`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ addStock: 10 }),
    });

    assert.strictEqual(res.status, 200, `Admin restock must return HTTP 200. Status: ${res.status}`);
    const json = (await res.json()) as any;
    assert.strictEqual(json.success, true);
    assert.strictEqual(
      json.data.stockQuantity,
      stockBeforeRestock + 10,
      'Hardware stock in response must increase by exactly 10 units'
    );

    const hwAfter = await hardwareService.getHardwareById(selectedHardwareId);
    assert.strictEqual(
      hwAfter.stockQuantity,
      stockBeforeRestock + 10,
      'Physical warehouse stock in database must increase by exactly 10 units'
    );
  });
});
