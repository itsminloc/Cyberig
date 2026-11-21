/**
 * Orders Module Auth & Identity Integration Tests
 * Tests customer_id attachment on authenticated checkout and guest checkout fallback.
 * Aligned with Task BE-12 specification.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../../app';
import { signAccessToken } from '../auth/jwt.util';

// Helper function to send requests to the Express application
async function testRequest(
  method: string,
  path: string,
  body?: any,
  headers: Record<string, string> = {}
): Promise<{ status: number; headers: Record<string, string>; body: any }> {
  const { createServer } = await import('node:http');
  const server = createServer(app);

  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        server.close();
        return reject(new Error('Failed to get server address'));
      }
      const port = addr.port;
      const url = `http://127.0.0.1:${port}${path}`;

      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers,
      };

      fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      })
        .then(async (res) => {
          const resHeaders: Record<string, string> = {};
          res.headers.forEach((v, k) => {
            resHeaders[k.toLowerCase()] = v;
          });
          const text = await res.text();
          let parsed: any;
          try {
            parsed = JSON.parse(text);
          } catch {
            parsed = text;
          }
          server.close(() => {
            resolve({
              status: res.status,
              headers: resHeaders,
              body: parsed,
            });
          });
        })
        .catch((err) => {
          server.close(() => reject(err));
        });
    });
  });
}

describe('Orders Auth & Identity Integration (Task BE-12 / Sprint 4)', () => {
  let sampleHardwareId: string = 'cpu-i5-13600k';

  test('Test 1: POST /api/orders có Bearer token hợp lệ thì đơn hàng được gán đúng customer_id', async () => {
    // Lấy hardwareId hợp lệ từ API
    const hwRes = await testRequest('GET', '/api/hardware?limit=1');
    if (hwRes.status === 200 && hwRes.body.data && hwRes.body.data.length > 0) {
      sampleHardwareId = hwRes.body.data[0].id;
    }

    // Đăng nhập tài khoản customer benchmark có sẵn (hoặc fallback mock token nếu DB offline)
    let customerUserId = '99998888-7777-6666-5555-444433332222';
    let customerToken = signAccessToken({
      userId: customerUserId,
      email: 'customer@cyberig.vn',
      role: 'CUSTOMER',
      fullName: 'Nguyễn Văn Khách',
    });

    const loginRes = await testRequest(
      'POST',
      '/api/auth/login',
      { email: 'customer@cyberig.vn', password: 'Customer@Password123' },
      { 'x-forwarded-for': '198.51.100.10' }
    );
    if (loginRes.status === 200 && loginRes.body.data?.accessToken) {
      customerToken = loginRes.body.data.accessToken;
      customerUserId = loginRes.body.data.user.id;
    }

    const payload = {
      customerName: 'Nguyễn Văn Khách',
      customerEmail: 'customer@cyberig.vn',
      customerPhone: '0901234567',
      shippingAddress: '123 Cyber Street, Q1, TP.HCM',
      items: [
        {
          hardwareId: sampleHardwareId,
          quantity: 1,
        },
      ],
    };

    const res = await testRequest(
      'POST',
      '/api/orders',
      payload,
      {
        Authorization: `Bearer ${customerToken}`,
        'x-forwarded-for': '198.51.100.11',
      }
    );

    assert.equal(res.status, 201, `Expected HTTP 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id, 'Đơn hàng phải có ID');
    assert.equal(
      res.body.data.customerId,
      customerUserId,
      'customerId trong đơn hàng phải khớp với userId từ JWT token'
    );

    // Kiểm tra truy vấn lại qua GET /api/orders/:id với đúng chủ sở hữu (Anti-IDOR)
    const getRes = await testRequest('GET', `/api/orders/${res.body.data.id}`, undefined, {
      Authorization: `Bearer ${customerToken}`,
    });
    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.data.customerId, customerUserId);
  });

  test('Test 2: POST /api/orders không có token (Guest Checkout) tạo đơn bình thường với customer_id = null', async () => {
    const payload = {
      customerName: 'Khách Vãng Lai',
      customerEmail: 'guest@cyberig.vn',
      customerPhone: '0908888888',
      shippingAddress: '456 Guest Road, Q3, TP.HCM',
      items: [
        {
          hardwareId: sampleHardwareId,
          quantity: 1,
        },
      ],
    };

    const res = await testRequest(
      'POST',
      '/api/orders',
      payload,
      {
        'x-forwarded-for': '198.51.100.12',
      }
    );

    assert.equal(res.status, 201, `Expected HTTP 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    assert.equal(
      res.body.data.customerId,
      null,
      'Đơn hàng Guest phải có customerId là null'
    );
  });

  test('Test 3: POST /api/orders với Bearer token sai format vẫn được xử lý an toàn dưới dạng Guest', async () => {
    const payload = {
      customerName: 'Khách Token Lỗi',
      customerEmail: 'badtoken@cyberig.vn',
      customerPhone: '0907777777',
      shippingAddress: '789 Malformed St, Q5, TP.HCM',
      items: [
        {
          hardwareId: sampleHardwareId,
          quantity: 1,
        },
      ],
    };

    const res = await testRequest(
      'POST',
      '/api/orders',
      payload,
      {
        Authorization: 'Bearer invalid.token.payload',
        'x-forwarded-for': '198.51.100.13',
      }
    );

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.customerId, null);
  });
});
