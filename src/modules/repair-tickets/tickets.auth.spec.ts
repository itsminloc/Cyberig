/**
 * Repair Tickets Auth & RBAC Integration Tests
 * Verifies route protection, role permissions (TECHNICIAN/ADMIN), and actor identity injection.
 * Aligned with Task BE-12 specification.
 */

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../../app';
import { signAccessToken } from '../auth/jwt.util';
import { ticketService } from './ticket.service';

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

describe('Repair Tickets Auth & RBAC Guards (Task BE-12 / Sprint 4)', () => {
  let sampleTicketId: string;
  const techUserId = '11112222-3333-4444-5555-666677778888';
  const customerUserId = '99998888-7777-6666-5555-444433332222';
  const adminUserId = '00001111-2222-3333-4444-555566667777';

  let technicianToken: string;
  let customerToken: string;
  let adminToken: string;

  before(async () => {
    technicianToken = signAccessToken({
      userId: techUserId,
      email: 'tech.tuan@cyberig.vn',
      role: 'TECHNICIAN',
      fullName: 'Kỹ Thuật Viên Tuấn',
    });

    customerToken = signAccessToken({
      userId: customerUserId,
      email: 'customer@cyberig.vn',
      role: 'CUSTOMER',
      fullName: 'Khách Hàng',
    });

    adminToken = signAccessToken({
      userId: adminUserId,
      email: 'admin@cyberig.vn',
      role: 'ADMIN',
      fullName: 'Admin Quản Trị',
    });

    // Tạo phiếu sửa chữa mẫu cho các kịch bản test
    const newTicket = await ticketService.createTicket({
      customerName: 'Nguyễn Văn Test',
      customerPhone: '0901234567',
      customerEmail: 'test@cyberig.vn',
      deviceType: 'PC Gaming Test Rig',
      serialNumber: 'SN-TEST-888',
      initialCondition: 'Máy bật không lên nguồn',
      faultDescription: 'Nghi hỏng nguồn hoặc mainboard',
    });

    sampleTicketId = newTicket.id;
  });

  test('Test 1: POST /api/tickets/:id/quotation trả về HTTP 401 Unauthorized nếu không gửi token', async () => {
    const res = await testRequest(
      'POST',
      `/api/tickets/${sampleTicketId}/quotation`,
      {
        diagnosticNotes: 'Hỏng chip nguồn',
        laborCost: 150000,
        parts: [],
      }
    );

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  });

  test('Test 2: POST /api/tickets/:id/quotation trả về HTTP 403 Forbidden nếu user có role CUSTOMER', async () => {
    const res = await testRequest(
      'POST',
      `/api/tickets/${sampleTicketId}/quotation`,
      {
        diagnosticNotes: 'Khách hàng tự kê báo giá trái phép',
        laborCost: 100000,
        parts: [],
      },
      {
        Authorization: `Bearer ${customerToken}`,
      }
    );

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'FORBIDDEN');
    assert.match(res.body.error.message, /Bạn không có quyền thực hiện hành động này/);
  });

  test('Test 3: PATCH /api/tickets/:id/status bị chặn HTTP 403 đối với CUSTOMER', async () => {
    const res = await testRequest(
      'PATCH',
      `/api/tickets/${sampleTicketId}/status`,
      {
        toStatus: 'DIAGNOSING',
        note: 'Khách hàng cố chuyển trạng thái',
      },
      {
        Authorization: `Bearer ${customerToken}`,
      }
    );

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  test('Test 4: PATCH /api/tickets/:id/status thành công với role TECHNICIAN và tự động gán actorId từ token', async () => {
    const res = await testRequest(
      'PATCH',
      `/api/tickets/${sampleTicketId}/status`,
      {
        toStatus: 'DIAGNOSING',
        note: 'Bắt đầu kiểm tra chẩn đoán linh kiện',
      },
      {
        Authorization: `Bearer ${technicianToken}`,
      }
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'DIAGNOSING');

    // Kiểm tra timeline log có technicianId khớp với token
    const lastLog = res.body.data.timeline[res.body.data.timeline.length - 1];
    assert.equal(lastLog.toStatus, 'DIAGNOSING');
    assert.equal(lastLog.technicianId, techUserId);
  });

  test('Test 5: POST /api/tickets/:id/quotation thành công với role TECHNICIAN và lưu đúng technician_id từ token', async () => {
    const res = await testRequest(
      'POST',
      `/api/tickets/${sampleTicketId}/quotation`,
      {
        diagnosticNotes: 'Thay thế nguồn mới và vệ sinh máy',
        laborCost: 200000,
        parts: [],
      },
      {
        Authorization: `Bearer ${technicianToken}`,
      }
    );

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.ticketId, sampleTicketId);
    assert.equal(res.body.data.laborCost, 200000);

    // Phiếu tự động chuyển sang trạng thái QUOTED
    const timelineRes = await testRequest('GET', `/api/tickets/${sampleTicketId}/timeline`);
    assert.equal(timelineRes.status, 200);
    assert.equal(timelineRes.body.data.status, 'QUOTED');
  });

  test('Test 6: POST /api/tickets/:id/quotation và PATCH status cũng được phép với role ADMIN', async () => {
    // Tạo phiếu mới cho Admin
    const adminTicket = await ticketService.createTicket({
      customerName: 'Khách VIP',
      customerPhone: '0909999999',
      customerEmail: 'vip@cyberig.vn',
      deviceType: 'Workstation Extreme',
      serialNumber: 'SN-ADMIN-001',
      initialCondition: 'Cần nâng cấp gấp',
      faultDescription: 'Bảo dưỡng định kỳ',
    });

    // Admin chuyển sang DIAGNOSING
    const patchRes = await testRequest(
      'PATCH',
      `/api/tickets/${adminTicket.id}/status`,
      {
        toStatus: 'DIAGNOSING',
        note: 'Admin duyệt kiểm tra ưu tiên',
      },
      {
        Authorization: `Bearer ${adminToken}`,
      }
    );

    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.body.data.status, 'DIAGNOSING');

    // Admin tạo báo giá
    const quoteRes = await testRequest(
      'POST',
      `/api/tickets/${adminTicket.id}/quotation`,
      {
        diagnosticNotes: 'Báo giá phê duyệt bởi quản trị viên',
        laborCost: 350000,
        parts: [],
      },
      {
        Authorization: `Bearer ${adminToken}`,
      }
    );

    assert.equal(quoteRes.status, 201);
    assert.equal(quoteRes.body.success, true);
  });
});
