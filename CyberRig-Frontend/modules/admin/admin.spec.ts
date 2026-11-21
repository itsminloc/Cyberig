/**
 * Admin Inventory Control Integration Tests
 * Validates RBAC protection (ADMIN only), hardware creation, restocking, and soft deletion.
 * Aligned with Task BE-PORTALS specification.
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

describe('Admin Inventory Control APIs (Task BE-PORTALS / Sprint 5)', () => {
  const adminUser = {
    userId: '99999999-aaaa-bbbb-cccc-999999999999',
    email: 'admin@cyberig.vn',
    role: 'ADMIN' as const,
  };

  const techUser = {
    userId: '88888888-aaaa-bbbb-cccc-888888888888',
    email: 'tech@cyberig.vn',
    role: 'TECHNICIAN' as const,
  };

  const customerUser = {
    userId: '77777777-aaaa-bbbb-cccc-777777777777',
    email: 'customer@cyberig.vn',
    role: 'CUSTOMER' as const,
  };

  const tokenAdmin = signAccessToken(adminUser);
  const tokenTech = signAccessToken(techUser);
  const tokenCustomer = signAccessToken(customerUser);

  const sampleHardwarePayload = {
    category: 'GPU',
    name: 'ASUS ROG Strix GeForce RTX 4080 SUPER 16GB OC',
    brand: 'ASUS',
    model: 'ROG-STRIX-RTX4080S-O16G',
    price: 31990000,
    stockQuantity: 10,
    specs: {
      vramGb: 16,
      tdpWatts: 320,
      lengthMm: 357,
      powerConnectors: ['16-pin 12VHPWR'],
    },
  };

  test('Test 1: User không có token gọi POST /api/admin/hardware bị chặn bởi HTTP 401 Unauthorized', async () => {
    const res = await testRequest('POST', '/api/admin/hardware', sampleHardwarePayload);

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error?.code, 'UNAUTHORIZED');
  });

  test('Test 2: User role CUSTOMER gọi POST /api/admin/hardware bị chặn bởi lỗi HTTP 403 Forbidden', async () => {
    const res = await testRequest('POST', '/api/admin/hardware', sampleHardwarePayload, {
      Authorization: `Bearer ${tokenCustomer}`,
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error?.code, 'FORBIDDEN');
  });

  test('Test 3: User role TECHNICIAN gọi POST /api/admin/hardware bị chặn bởi HTTP 403 Forbidden', async () => {
    const res = await testRequest('POST', '/api/admin/hardware', sampleHardwarePayload, {
      Authorization: `Bearer ${tokenTech}`,
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error?.code, 'FORBIDDEN');
  });

  test('Test 4: User role ADMIN gọi POST /api/admin/hardware tạo mới linh kiện thành công (HTTP 201)', async () => {
    const res = await testRequest('POST', '/api/admin/hardware', sampleHardwarePayload, {
      Authorization: `Bearer ${tokenAdmin}`,
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data?.id);
    assert.equal(res.body.data.name, sampleHardwarePayload.name);
    assert.equal(res.body.data.brand, sampleHardwarePayload.brand);
    assert.equal(res.body.data.model, sampleHardwarePayload.model);
    assert.equal(res.body.data.price, sampleHardwarePayload.price);
    assert.equal(res.body.data.stockQuantity, sampleHardwarePayload.stockQuantity);
    assert.equal(res.body.data.isActive, true);
  });

  test('Test 5: User role ADMIN gọi API Restock PATCH /api/admin/hardware/:id/stock cập nhật thành công tồn kho và giá bán mới', async () => {
    // 1. Tạo một item để restock
    const createRes = await testRequest('POST', '/api/admin/hardware', {
      category: 'RAM',
      name: 'Kingston Fury Beast 16GB DDR5 5600MHz',
      brand: 'Kingston',
      model: 'KF556C40BB-16',
      price: 1450000,
      stockQuantity: 5,
      specs: { capacityGb: 16, speedMhz: 5600 },
    }, {
      Authorization: `Bearer ${tokenAdmin}`,
    });

    assert.equal(createRes.status, 201);
    const createdItem = createRes.body.data;
    const itemId = createdItem.id;

    // 2. Gọi PATCH restock: addStock = 20, newPrice = 1390000
    const restockRes = await testRequest('PATCH', `/api/admin/hardware/${itemId}/stock`, {
      addStock: 20,
      newPrice: 1390000,
    }, {
      Authorization: `Bearer ${tokenAdmin}`,
    });

    assert.equal(restockRes.status, 200);
    assert.equal(restockRes.body.success, true);
    assert.equal(restockRes.body.data.stockQuantity, 5 + 20); // 25
    assert.equal(restockRes.body.data.price, 1390000);
  });

  test('Test 6: User role ADMIN gọi DELETE /api/admin/hardware/:id thực hiện soft delete thành công và sản phẩm không còn xuất hiện trong GET /api/hardware', async () => {
    // 1. Tạo linh kiện chuẩn bị soft delete
    const uniqueModel = `TEST-DELETE-${Date.now()}`;
    const uniqueName = `Samsung 990 Pro 2TB NVMe ${uniqueModel}`;
    const createRes = await testRequest('POST', '/api/admin/hardware', {
      category: 'STORAGE',
      name: uniqueName,
      brand: 'Samsung',
      model: uniqueModel,
      price: 4990000,
      stockQuantity: 15,
      specs: { capacityGb: 2000, type: 'NVME_M2' },
    }, {
      Authorization: `Bearer ${tokenAdmin}`,
    });

    assert.equal(createRes.status, 201);
    const itemId = createRes.body.data.id;

    // 2. Xác nhận linh kiện đang xuất hiện trên public catalog
    const catalogBefore = await testRequest('GET', `/api/hardware?search=${encodeURIComponent(uniqueModel)}`);
    assert.equal(catalogBefore.status, 200);
    assert.ok(catalogBefore.body.data?.some((i: any) => i.id === itemId));

    // 3. Admin gọi DELETE soft delete
    const deleteRes = await testRequest('DELETE', `/api/admin/hardware/${itemId}`, undefined, {
      Authorization: `Bearer ${tokenAdmin}`,
    });

    assert.equal(deleteRes.status, 200);
    assert.equal(deleteRes.body.success, true);
    assert.equal(deleteRes.body.data.isActive, false);

    // 4. Xác nhận sau khi soft delete, sản phẩm bị loại bỏ khỏi public catalog GET /api/hardware
    const catalogAfter = await testRequest('GET', `/api/hardware?search=${encodeURIComponent(uniqueModel)}`);
    assert.equal(catalogAfter.status, 200);
    assert.ok(!catalogAfter.body.data?.some((i: any) => i.id === itemId));
  });

  test('Test 7: Gọi restock hoặc delete cho mã ID không tồn tại trả về HTTP 404', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const restockRes = await testRequest('PATCH', `/api/admin/hardware/${nonExistentId}/stock`, {
      addStock: 10,
    }, {
      Authorization: `Bearer ${tokenAdmin}`,
    });

    assert.equal(restockRes.status, 404);
    assert.equal(restockRes.body.success, false);
    assert.equal(restockRes.body.error?.code, 'ENTITY_NOT_FOUND');

    const deleteRes = await testRequest('DELETE', `/api/admin/hardware/${nonExistentId}`, undefined, {
      Authorization: `Bearer ${tokenAdmin}`,
    });

    assert.equal(deleteRes.status, 404);
    assert.equal(deleteRes.body.success, false);
    assert.equal(deleteRes.body.error?.code, 'ENTITY_NOT_FOUND');
  });
});
