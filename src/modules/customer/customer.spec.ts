/**
 * Customer Portal Integration Tests
 * Validates personalized query endpoints (orders, repair tickets) and isolation guarantees.
 * Aligned with Task BE-PORTALS specification.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../../app';
import { db } from '../../core/db';
import { signAccessToken } from '../auth/jwt.util';
import { orderService } from '../orders/order.service';
import { ticketService } from '../repair-tickets/ticket.service';
import { TicketPriority } from '../repair-tickets/ticket.model';

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

describe('Customer Portal APIs (Task BE-PORTALS / Sprint 5)', () => {
  const customerA = {
    userId: '11111111-aaaa-bbbb-cccc-111111111111',
    email: 'customera@cyberig.vn',
    role: 'CUSTOMER' as const,
  };

  const customerB = {
    userId: '22222222-aaaa-bbbb-cccc-222222222222',
    email: 'customerb@cyberig.vn',
    role: 'CUSTOMER' as const,
  };

  const tokenCustomerA = signAccessToken(customerA);
  const tokenCustomerB = signAccessToken(customerB);

  before(async () => {
    try {
      await db.query(
        `INSERT INTO users (id, email, password_hash, role, full_name, phone, is_active)
         VALUES
           ($1, $2, '$2b$10$testplaceholderhash0000000000000000000000000000000000', 'CUSTOMER', 'Customer A', '0901111111', TRUE),
           ($3, $4, '$2b$10$testplaceholderhash0000000000000000000000000000000000', 'CUSTOMER', 'Customer B', '0902222222', TRUE)
         ON CONFLICT (id) DO NOTHING;`,
        [customerA.userId, customerA.email, customerB.userId, customerB.email]
      );
    } catch {
      // Offline mode without PostgreSQL
    }
  });

  after(async () => {
    try {
      await db.query(`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE customer_id IN ($1, $2));`, [customerA.userId, customerB.userId]);
      await db.query(`DELETE FROM orders WHERE customer_id IN ($1, $2);`, [customerA.userId, customerB.userId]);
      await db.query(`DELETE FROM repair_tickets WHERE customer_id IN ($1, $2);`, [customerA.userId, customerB.userId]);
    } catch {}
  });

  test('Test 1: GET /api/customer/orders trả về HTTP 401 nếu gọi không có token', async () => {
    const res = await testRequest('GET', '/api/customer/orders');

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error?.code, 'UNAUTHORIZED');
  });

  test('Test 2: Bản ghi trả về từ GET /api/customer/orders tuyệt đối không chứa đơn hàng của customer_id khác', async () => {
    // 1. Tạo đơn hàng cho Customer A
    const orderA = await orderService.createOrder({
      customerId: customerA.userId,
      customerName: 'Customer A',
      customerEmail: customerA.email,
      customerPhone: '0901111111',
      shippingAddress: '123 Cyber Street, Q1, HCM',
      items: [{ hardwareId: 'cpu-i5-13600k', quantity: 1 }],
    });

    // 2. Tạo đơn hàng cho Customer B
    const orderB = await orderService.createOrder({
      customerId: customerB.userId,
      customerName: 'Customer B',
      customerEmail: customerB.email,
      customerPhone: '0902222222',
      shippingAddress: '456 Matrix Boulevard, Q7, HCM',
      items: [{ hardwareId: 'mb-b760-plus', quantity: 1 }],
    });

    // 3. Customer A gọi GET /api/customer/orders
    const resA = await testRequest('GET', '/api/customer/orders', undefined, {
      Authorization: `Bearer ${tokenCustomerA}`,
    });

    assert.equal(resA.status, 200);
    assert.equal(resA.body.success, true);
    assert.ok(Array.isArray(resA.body.data));

    const ordersA: any[] = resA.body.data;
    // Phải tìm thấy đơn hàng của Customer A
    assert.ok(ordersA.some((o) => o.id === orderA.id));
    // Tuyệt đối KHÔNG chứa đơn hàng của Customer B
    assert.ok(!ordersA.some((o) => o.id === orderB.id));
    // Tất cả đơn hàng trả về phải có customerId = customerA.userId
    for (const ord of ordersA) {
      assert.equal(ord.customerId, customerA.userId);
    }

    // 4. Customer B gọi GET /api/customer/orders
    const resB = await testRequest('GET', '/api/customer/orders', undefined, {
      Authorization: `Bearer ${tokenCustomerB}`,
    });

    assert.equal(resB.status, 200);
    assert.equal(resB.body.success, true);
    const ordersB: any[] = resB.body.data;
    assert.ok(ordersB.some((o) => o.id === orderB.id));
    assert.ok(!ordersB.some((o) => o.id === orderA.id));
    for (const ord of ordersB) {
      assert.equal(ord.customerId, customerB.userId);
    }
  });

  test('Test 3: GET /api/customer/tickets trả về HTTP 401 nếu gọi không có token', async () => {
    const res = await testRequest('GET', '/api/customer/tickets');

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error?.code, 'UNAUTHORIZED');
  });

  test('Test 4: GET /api/customer/tickets chỉ trả về phiếu sửa chữa của customer đang đăng nhập', async () => {
    // 1. Tạo phiếu cho Customer A
    const ticketA = await ticketService.createTicket({
      customerId: customerA.userId,
      customerName: 'Customer A',
      customerPhone: '0901111111',
      customerEmail: customerA.email,
      deviceType: 'CyberRig Alpha Gaming',
      serialNumber: 'SN-CR-ALPHA-01',
      initialCondition: 'Vỏ máy xước nhẹ',
      faultDescription: 'Màn hình xanh khi chơi game',
      priority: TicketPriority.URGENT,
    });

    // 2. Tạo phiếu cho Customer B
    const ticketB = await ticketService.createTicket({
      customerId: customerB.userId,
      customerName: 'Customer B',
      customerPhone: '0902222222',
      customerEmail: customerB.email,
      deviceType: 'CyberRig Beta Workstation',
      serialNumber: 'SN-CR-BETA-02',
      initialCondition: 'Bụi bám tản nhiệt',
      faultDescription: 'Nhiệt độ CPU quá cao',
      priority: TicketPriority.STANDARD,
    });

    // 3. Customer A gọi GET /api/customer/tickets
    const resA = await testRequest('GET', '/api/customer/tickets', undefined, {
      Authorization: `Bearer ${tokenCustomerA}`,
    });

    assert.equal(resA.status, 200);
    assert.equal(resA.body.success, true);
    const ticketsA: any[] = resA.body.data;

    assert.ok(ticketsA.some((t) => t.id === ticketA.id));
    assert.ok(!ticketsA.some((t) => t.id === ticketB.id));
    for (const tk of ticketsA) {
      assert.equal(tk.customerId, customerA.userId);
    }
  });
});
