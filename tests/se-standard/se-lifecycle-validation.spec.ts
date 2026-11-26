/**
 * CyberRig Software Engineering Standard Test Specification Suite
 * Standard Compliance: IEEE 829 Test Documentation & ISTQB V-Model (4 Levels)
 *
 * Techniques Applied:
 *  - TC-SE-01: Equivalence Partitioning (EP) — Canonical Slug / SKU Model / Invalid ID Resolution
 *  - TC-SE-02: Boundary Value Analysis (BVA) — Order Quantity [0, -1, 1, Stock + 1] & Atomic Rollback
 *  - TC-SE-03: State Transition Testing — Order FSM (PENDING_PAYMENT -> CONFIRMED / CANCELLED & Illegal Paths)
 *  - TC-SE-04: Security RBAC Gate & Zero-Wait Logout Token Revocation (jti Blacklist)
 *  - TC-SE-05: Non-Functional Performance SLA — Smooth Login Latency (< 500ms SLA)
 */

import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Server } from 'node:http';
import { performance } from 'node:perf_hooks';
import { app } from '../../src/app';
import { config } from '../../src/core/config';
import { db } from '../../src/core/db';
import { redis } from '../../src/core/redis';
import { hardwareService } from '../../src/modules/hardware/hardware.service';
import { orderService } from '../../src/modules/orders/order.service';
import { buildWebhookHeaders } from '../../src/core/security/hmac-webhook.util';
import { tokenBlacklistService } from '../../src/core/security/token-blacklist.service';
import { signAccessToken } from '../../src/modules/auth/jwt.util';

describe('IEEE 829 / ISTQB Software Engineering Lifecycle Validation Suite', () => {
  let server: Server;
  let baseUrl: string;
  const cleanupEmails: string[] = [];

  before(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  after(async () => {
    try {
      for (const em of cleanupEmails) {
        await db.query(
          `DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE customer_email = $1);`,
          [em]
        );
        await db.query(`DELETE FROM orders WHERE customer_email = $1;`, [em]);
        await db.query(`DELETE FROM users WHERE LOWER(email) = $1;`, [em.toLowerCase()]);
      }
    } catch {
      // Offline mode safe cleanup
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(async () => {
    await redis.flushTestData();
    orderService.resetFallbackData();
    tokenBlacklistService.clearLocal();
  });

  test('TC-SE-01 [ISTQB Equivalence Partitioning]: Resolves Storefront Slug (EC1), Manufacturer SKU (EC2), and rejects Invalid ID (EC3)', async () => {
    const cpuRef = await hardwareService.getHardwareById('cpu-i5-13600k');
    const mbRef = await hardwareService.getHardwareById('mb-b760-plus');
    const testEmail = `ep.se01.${Date.now()}@cyberig.vn`;
    cleanupEmails.push(testEmail);

    // EC1 (Storefront/Preset Slug) + EC2 (Manufacturer Model Code) -> Valid Partition (HTTP 201)
    const validRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '198.51.100.201',
      },
      body: JSON.stringify({
        customerName: 'Kiểm Thử Phân Vùng Tương Đương',
        customerEmail: testEmail,
        customerPhone: '0901112233',
        shippingAddress: '01 Võ Văn Ngân, TP. Thủ Đức',
        items: [
          { hardwareId: 'cpu-i5-13600k', quantity: 1 },
          { hardwareId: mbRef.model, quantity: 1 },
        ],
      }),
    });

    assert.strictEqual(validRes.status, 201);
    const validJson = (await validRes.json()) as any;
    assert.strictEqual(validJson.data.status, 'PENDING_PAYMENT');
    assert.strictEqual(
      Number(validJson.data.totalAmount),
      Number(cpuRef.price) + Number(mbRef.price),
      'Price snapshot must equal sum of canonical catalog prices'
    );

    // EC3 (Non-existent Hardware Identifier) -> Invalid Partition (HTTP 404)
    const invalidRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '198.51.100.202',
      },
      body: JSON.stringify({
        customerName: 'Kiểm Thử Mã Lỗi',
        customerEmail: testEmail,
        customerPhone: '0901112233',
        shippingAddress: '01 Võ Văn Ngân, TP. Thủ Đức',
        items: [{ hardwareId: 'sku-khong-ton-tai-9999', quantity: 1 }],
      }),
    });
    assert.strictEqual(invalidRes.status, 404);
  });

  test('TC-SE-02 [ISTQB Boundary Value Analysis]: Enforces Quantity Boundaries [0, -1, 1, Stock+1] with Atomic Redis Rollback', async () => {
    const ramItem = await hardwareService.getHardwareById('ram-corsair-ddr5-32');
    const availableStock = ramItem.stockQuantity;
    const bvaEmail = `bva.se02.${Date.now()}@cyberig.vn`;
    cleanupEmails.push(bvaEmail);

    const postOrderWithQty = (qty: number, ipSuffix: number) =>
      fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': `198.51.100.${ipSuffix}`,
        },
        body: JSON.stringify({
          customerName: 'Kiểm Thử Giá Trị Biên',
          customerEmail: bvaEmail,
          customerPhone: '0902223344',
          shippingAddress: '268 Lý Thường Kiệt, Quận 10, TP.HCM',
          items: [{ hardwareId: ramItem.id, quantity: qty }],
        }),
      });

    // BVA Lower Invalid Boundaries: 0 and -1 -> HTTP 400
    const resZero = await postOrderWithQty(0, 203);
    assert.strictEqual(resZero.status, 400);

    const resNeg = await postOrderWithQty(-1, 204);
    assert.strictEqual(resNeg.status, 400);

    // BVA Upper Invalid Boundary: availableStock + 1 -> HTTP 400 OUT_OF_STOCK & 0 leaked locks
    const resOver = await postOrderWithQty(availableStock + 1, 205);
    assert.strictEqual(resOver.status, 400);
    assert.strictEqual(await redis.getReservedStock(ramItem.id), 0, 'Failed boundary must leave 0 reserved stock');

    // BVA Lower Valid Boundary: 1 -> HTTP 201 & exact 1 unit locked
    const resMinValid = await postOrderWithQty(1, 206);
    assert.strictEqual(resMinValid.status, 201);
    assert.strictEqual(await redis.getReservedStock(ramItem.id), 1);
  });

  test('TC-SE-03 [ISTQB State Transition Testing]: Validates Legal & Illegal Order Finite State Machine Transitions', async () => {
    const fsmEmail = `fsm.se03.${Date.now()}@cyberig.vn`;
    cleanupEmails.push(fsmEmail);
    const ownerToken = signAccessToken({
      userId: '44444444-4444-4444-8444-444444444444',
      email: fsmEmail,
      role: 'CUSTOMER',
      fullName: 'FSM Customer',
    });

    const createOrder = async (ipSuffix: number) => {
      const r = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ownerToken}`,
          'x-forwarded-for': `198.51.100.${ipSuffix}`,
        },
        body: JSON.stringify({
          customerName: 'FSM Customer',
          customerEmail: fsmEmail,
          customerPhone: '0903334455',
          shippingAddress: '12 Nguyễn Văn Bảo, Gò Vấp',
          items: [{ hardwareId: 'psu-corsair-rm750e', quantity: 1 }],
        }),
      });
      assert.strictEqual(r.status, 201);
      return ((await r.json()) as any).data.id as string;
    };

    // Path A: PENDING_PAYMENT -> CONFIRMED (Valid), then CONFIRMED -> CONFIRMED (Illegal 400)
    const orderA = await createOrder(207);
    const whA = buildWebhookHeaders(config.security.webhookSecret, orderA);
    const confirmA1 = await fetch(`${baseUrl}/api/orders/${orderA}/confirm`, { method: 'POST', headers: whA });
    assert.strictEqual(confirmA1.status, 200);

    const confirmA2 = await fetch(`${baseUrl}/api/orders/${orderA}/confirm`, { method: 'POST', headers: whA });
    assert.strictEqual(confirmA2.status, 400, 'Duplicate CONFIRM transition must be rejected with 400');

    // Path B: PENDING_PAYMENT -> CANCELLED (Valid), then CANCELLED -> CONFIRMED (Illegal 400)
    const orderB = await createOrder(208);
    const cancelB1 = await fetch(`${baseUrl}/api/orders/${orderB}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.strictEqual(cancelB1.status, 200);

    const whB = buildWebhookHeaders(config.security.webhookSecret, orderB);
    const confirmAfterCancel = await fetch(`${baseUrl}/api/orders/${orderB}/confirm`, { method: 'POST', headers: whB });
    assert.strictEqual(confirmAfterCancel.status, 400, 'CANCELLED -> CONFIRMED illegal transition must return 400');
  });

  test('TC-SE-04 [Security Auth Gate & Instant Logout]: Enforces 401/403 RBAC Gates and 0ms Token Revocation on Logout', async () => {
    const authEmail = `auth.se04.${Date.now()}@cyberig.vn`;
    cleanupEmails.push(authEmail);

    // 1. Unauthenticated requests to protected endpoints must return 401
    const unauthMe = await fetch(`${baseUrl}/api/auth/me`);
    assert.strictEqual(unauthMe.status, 401);

    const unauthAdmin = await fetch(`${baseUrl}/api/admin/crawler/state`);
    assert.strictEqual(unauthAdmin.status, 401);

    // 2. Register CUSTOMER & verify 403 on ADMIN endpoint
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.209' },
      body: JSON.stringify({
        email: authEmail,
        password: 'CustomerSafe#2026',
        fullName: 'Khách Hàng Chuẩn SE',
        phone: '0904445566',
      }),
    });
    assert.strictEqual(regRes.status, 201);
    const customerAccess = ((await regRes.json()) as any).data.accessToken as string;

    const forbiddenAdmin = await fetch(`${baseUrl}/api/admin/crawler/state`, {
      headers: { Authorization: `Bearer ${customerAccess}` },
    });
    assert.strictEqual(forbiddenAdmin.status, 403);

    // 3. Instant Logout immediately revokes JWT jti
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerAccess}` },
    });
    assert.strictEqual(logoutRes.status, 200);

    const afterLogoutMe = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${customerAccess}` },
    });
    assert.strictEqual(afterLogoutMe.status, 401);
  });

  test('TC-SE-05 [Non-Functional Performance SLA]: POST /api/auth/login completes smoothly under 500ms SLA', async () => {
    const perfEmail = `sla.se05.${Date.now()}@cyberig.vn`;
    cleanupEmails.push(perfEmail);

    const reg = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.210' },
      body: JSON.stringify({
        email: perfEmail,
        password: 'FastLogin#2026',
        fullName: 'Kiểm Thử Hiệu Năng SLA',
        phone: '0905556677',
      }),
    });
    assert.strictEqual(reg.status, 201);

    const t0 = performance.now();
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.211' },
      body: JSON.stringify({ email: perfEmail, password: 'FastLogin#2026' }),
    });
    const elapsedMs = performance.now() - t0;

    assert.strictEqual(loginRes.status, 200);
    const loginJson = (await loginRes.json()) as any;
    assert.ok(loginJson.data.accessToken, 'Must return valid JWT accessToken');
    assert.ok(
      elapsedMs < 500,
      `Login SLA violated: expected < 500ms but took ${elapsedMs.toFixed(1)}ms`
    );
  });
});
