import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Server } from 'node:http';
import { app } from '../../src/app';
import { redis } from '../../src/core/redis';
import { hardwareService } from '../../src/modules/hardware/hardware.service';
import { orderService } from '../../src/modules/orders/order.service';
import { config } from '../../src/core/config';
import { buildWebhookHeaders } from '../../src/core/security/hmac-webhook.util';

describe('E2E Integration & API Hardening Suite (Task BE-10 / PB-14)', () => {
  let server: Server;
  let baseUrl: string;

  before(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://localhost:${addr.port}`;
        }
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  beforeEach(async () => {
    await redis.flushTestData();
    orderService.resetFallbackData();
  });

  test('Kịch bản 1 (Full Flow Happy Path): Hardware Catalog -> Compatibility Validate -> Order Create -> Order Confirm', async () => {
    // 1. Query Hardware Items for CPU and Motherboard
    const cpuRes = await fetch(`${baseUrl}/api/hardware?category=CPU`);
    assert.strictEqual(cpuRes.status, 200);
    const cpuData = (await cpuRes.json()) as any;
    assert.ok(cpuData.success);
    assert.ok(cpuData.data.length > 0);
    const selectedCpu = cpuData.data.find((item: any) => item.id === 'cpu-i5-13600k') || cpuData.data[0];

    const mbRes = await fetch(`${baseUrl}/api/hardware?category=MOTHERBOARD`);
    assert.strictEqual(mbRes.status, 200);
    const mbData = (await mbRes.json()) as any;
    assert.ok(mbData.success);
    assert.ok(mbData.data.length > 0);
    const selectedMb = mbData.data.find((item: any) => item.id === 'mb-b760-plus') || mbData.data[0];

    // Fetch supporting RAM and PSU to form a fully valid build
    const ramRes = await fetch(`${baseUrl}/api/hardware?category=RAM`);
    const ramData = (await ramRes.json()) as any;
    const selectedRam = ramData.data.find((item: any) => item.id === 'ram-corsair-ddr5-32') || ramData.data[0];

    const psuRes = await fetch(`${baseUrl}/api/hardware?category=PSU`);
    const psuData = (await psuRes.json()) as any;
    const selectedPsu = psuData.data.find((item: any) => item.id === 'psu-corsair-750w') || psuData.data[0];

    // 2. Validate Compatibility
    const compatRes = await fetch(`${baseUrl}/api/compatibility/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [selectedCpu, selectedMb, selectedRam, selectedPsu],
      }),
    });
    assert.strictEqual(compatRes.status, 200);
    const compatData = (await compatRes.json()) as any;
    assert.ok(compatData.success);
    assert.strictEqual(compatData.data.status, 'COMPATIBLE');

    // 3. Create Order & Reserve Stock
    const initialHwCpu = await hardwareService.getHardwareById(selectedCpu.id);
    const initialCpuStock = initialHwCpu.stockQuantity;

    const orderPayload = {
      customerName: 'Trần Văn Hoàng (E2E)',
      customerEmail: 'hoang.tran.e2e@cyberrig.vn',
      customerPhone: '0987654321',
      shippingAddress: '77 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
      items: [
        { hardwareId: selectedCpu.id, quantity: 1 },
        { hardwareId: selectedMb.id, quantity: 1 },
      ],
    };

    const orderRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
    });
    assert.strictEqual(orderRes.status, 201);
    const orderData = (await orderRes.json()) as any;
    assert.ok(orderData.success);
    assert.strictEqual(orderData.data.status, 'PENDING_PAYMENT');
    const orderId = orderData.data.id;

    // Verify stock was temporarily reserved in Redis
    const reservedCpu = await redis.getReservedStock(selectedCpu.id);
    assert.strictEqual(reservedCpu, 1, 'Stock must be reserved in Redis');

    // 4. Confirm Order via HMAC-SHA256 Signed Payment Webhook
    const webhookHeaders = buildWebhookHeaders(config.security.webhookSecret, orderId);
    const confirmRes = await fetch(`${baseUrl}/api/orders/${orderId}/confirm`, {
      method: 'POST',
      headers: webhookHeaders,
    });
    assert.strictEqual(confirmRes.status, 200);
    const confirmData = (await confirmRes.json()) as any;
    assert.ok(confirmData.success);

    // Verify Redis lock released and physical warehouse stock deducted
    const postConfirmReserved = await redis.getReservedStock(selectedCpu.id);
    assert.strictEqual(postConfirmReserved, 0, 'Redis reservation must be released after confirm');

    const updatedHwCpu = await hardwareService.getHardwareById(selectedCpu.id);
    assert.strictEqual(
      updatedHwCpu.stockQuantity,
      initialCpuStock - 1,
      'Physical stock in catalog must decrease by 1'
    );
  });

  test('Kịch bản 2 (Rate Limit Trigger): Gửi liên tiếp 6 request POST /api/orders từ cùng một IP -> Request thứ 6 bị chặn HTTP 429', async () => {
    const testIp = '203.0.113.88'; // Simulated dedicated client IP
    const payload = {
      customerName: 'Rate Limit Test User',
      customerEmail: 'ratelimit@test.com',
      customerPhone: '0901234567',
      shippingAddress: 'Test Address',
      items: [{ hardwareId: 'cpu-i5-13600k', quantity: 1 }],
    };

    // Send 5 requests (Limit is 5 per 60s)
    for (let i = 1; i <= 5; i++) {
      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': testIp,
        },
        body: JSON.stringify(payload),
      });

      assert.strictEqual(res.status, 201, `Request #${i} should succeed`);
      assert.strictEqual(res.headers.get('RateLimit-Limit'), '5');
      assert.strictEqual(res.headers.get('RateLimit-Remaining'), (5 - i).toString());
    }

    // 6th request: Must exceed limit and receive HTTP 429
    const blockedRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': testIp,
      },
      body: JSON.stringify(payload),
    });

    assert.strictEqual(blockedRes.status, 429, '6th request must be rejected with 429');
    assert.strictEqual(blockedRes.headers.get('RateLimit-Limit'), '5');
    assert.strictEqual(blockedRes.headers.get('RateLimit-Remaining'), '0');
    assert.ok(blockedRes.headers.get('Retry-After'));

    const blockedJson = (await blockedRes.json()) as any;
    assert.strictEqual(blockedJson.success, false);
    assert.strictEqual(blockedJson.error.code, 'RATE_LIMIT_EXCEEDED');
    assert.ok(blockedJson.error.message.includes('Quá nhiều yêu cầu từ IP của bạn'));
  });

  test('Kịch bản 3 (API Hardening & Security Headers): Kiểm tra Security Headers và ẩn X-Powered-By', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.status, 200);

    // 1. Anti-Clickjacking header
    assert.strictEqual(res.headers.get('X-Frame-Options'), 'SAMEORIGIN');

    // 2. Anti-MIME sniffing header
    assert.strictEqual(res.headers.get('X-Content-Type-Options'), 'nosniff');

    // 3. X-XSS-Protection header
    assert.strictEqual(res.headers.get('X-XSS-Protection'), '1; mode=block');

    // 4. X-Powered-By is hidden for security
    assert.strictEqual(res.headers.get('X-Powered-By'), null);

    // 5. CORS Preflight OPTIONS check
    const optionsRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
      },
    });
    assert.strictEqual(optionsRes.status, 204);
    assert.ok(optionsRes.headers.get('Access-Control-Allow-Methods')?.includes('POST'));
  });
});
