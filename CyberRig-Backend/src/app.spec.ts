import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Server } from 'node:http';
import { app } from './app';
import { HardwareCategory } from './modules/hardware/hardware.model';
import { signAccessToken } from './modules/auth/jwt.util';
import { db } from './core/db';

describe('Server API & Global Error Middleware Integration (Task BE-06)', () => {
  let server: Server;
  let baseUrl: string;
  let techToken: string;

  before(async () => {
    try {
      await db.query(`UPDATE repair_tickets SET status = 'RECEIVED', quote_amount = null, is_quote_approved = false WHERE ticket_code = 'TK-20260905-001'`);
      await db.query(`UPDATE repair_tickets SET status = 'DIAGNOSING', quote_amount = null, is_quote_approved = false WHERE ticket_code = 'TK-1001'`);
      const tk1001 = await db.query<{ id: string }>('SELECT id FROM repair_tickets WHERE ticket_code = $1', ['TK-1001']);
      if (tk1001[0]) {
        await db.query('DELETE FROM ticket_quotations WHERE ticket_id = $1', [tk1001[0].id]);
      }
    } catch (e) {}

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://localhost:${addr.port}`;
        }
        techToken = signAccessToken({
          userId: '11112222-3333-4444-5555-666677778888',
          email: 'tech@cyberig.vn',
          role: 'TECHNICIAN',
          fullName: 'Kỹ Thuật Viên Tuấn',
        });
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  test('GET /api/health returns 200 and health status', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.status, 200);

    const body = await res.json() as { status: string; app: string };
    assert.strictEqual(body.status, 'ok');
    assert.ok(body.app);
  });

  test('POST /api/compatibility/validate returns 200 and COMPATIBLE result for standard build', async () => {
    const validItems = [
      {
        id: 'cpu-i5',
        categoryId: HardwareCategory.CPU,
        name: 'Intel Core i5-13600K',
        brand: 'Intel',
        model: 'BX8071513600K',
        price: 7690000,
        stockQuantity: 10,
        specs: { socket: 'LGA1700', tdpWatts: 125 },
      },
      {
        id: 'mb-b760',
        categoryId: HardwareCategory.MOTHERBOARD,
        name: 'ASUS TUF B760-PLUS WIFI DDR5',
        brand: 'ASUS',
        model: 'TUF-B760',
        price: 4590000,
        stockQuantity: 10,
        specs: { socket: 'LGA1700', ramType: 'DDR5', ramSlots: 4 },
      },
      {
        id: 'ram-ddr5',
        categoryId: HardwareCategory.RAM,
        name: 'Corsair Vengeance 32GB DDR5',
        brand: 'Corsair',
        model: 'CMH32GX5',
        price: 3290000,
        stockQuantity: 10,
        specs: { generation: 'DDR5', capacityGb: 32, modulesCount: 2 },
      },
      {
        id: 'gpu-4070',
        categoryId: HardwareCategory.GPU,
        name: 'RTX 4070',
        brand: 'GIGABYTE',
        model: 'RTX-4070',
        price: 16890000,
        stockQuantity: 10,
        specs: { lengthMm: 300, tdpWatts: 200 },
      },
      {
        id: 'psu-750w',
        categoryId: HardwareCategory.PSU,
        name: 'Corsair RM750e 750W',
        brand: 'Corsair',
        model: 'RM750E',
        price: 2690000,
        stockQuantity: 10,
        specs: { wattage: 750 },
      },
      {
        id: 'case-h6',
        categoryId: HardwareCategory.CASE,
        name: 'NZXT H6 Flow',
        brand: 'NZXT',
        model: 'H6-FLOW',
        price: 3490000,
        stockQuantity: 10,
        specs: { maxGpuLengthMm: 350, maxCpuCoolerHeightMm: 165 },
      },
    ];

    const res = await fetch(`${baseUrl}/api/compatibility/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: validItems }),
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json() as { success: boolean; data: { status: string; totalEstimatedWattage: number } };
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.status, 'COMPATIBLE');
    assert.ok(json.data.totalEstimatedWattage > 300);
  });

  test('POST /api/compatibility/validate returns INCOMPATIBLE when hardware conflicts', async () => {
    const conflictingItems = [
      {
        id: 'cpu-am5',
        categoryId: HardwareCategory.CPU,
        name: 'Ryzen 7 7800X3D',
        brand: 'AMD',
        model: '7800X3D',
        price: 9990000,
        stockQuantity: 10,
        specs: { socket: 'AM5', tdpWatts: 120 },
      },
      {
        id: 'mb-intel',
        categoryId: HardwareCategory.MOTHERBOARD,
        name: 'ASUS TUF B760-PLUS (LGA1700)',
        brand: 'ASUS',
        model: 'TUF-B760',
        price: 4590000,
        stockQuantity: 10,
        specs: { socket: 'LGA1700', ramType: 'DDR5' },
      },
    ];

    const res = await fetch(`${baseUrl}/api/compatibility/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: conflictingItems }),
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json() as { success: boolean; data: { status: string; issues: Array<{ rule: string }> } };
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.status, 'INCOMPATIBLE');
    assert.ok(json.data.issues.some((i) => i.rule === 'SOCKET'));
  });

  test('GET /api/tickets/:id/timeline returns 404 with ENTITY_NOT_FOUND when ticket does not exist', async () => {
    const res = await fetch(`${baseUrl}/api/tickets/non-existent-ticket-9999/timeline`);
    assert.strictEqual(res.status, 404);

    const json = await res.json() as {
      success: boolean;
      error: { code: string; message: string };
    };

    assert.strictEqual(json.success, false);
    assert.strictEqual(json.error.code, 'ENTITY_NOT_FOUND');
    assert.ok(json.error.message.includes('non-existent-ticket-9999'));
  });

  test('PATCH /api/tickets/:id/status returns 404 with ENTITY_NOT_FOUND when ticket does not exist', async () => {
    const res = await fetch(`${baseUrl}/api/tickets/non-existent-ticket-9999/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${techToken}`,
      },
      body: JSON.stringify({
        toStatus: 'DIAGNOSING',
        actorId: 'tech-01',
        note: 'Bắt đầu kiểm tra',
      }),
    });

    assert.strictEqual(res.status, 404);
    const json = await res.json() as {
      success: boolean;
      error: { code: string; message: string };
    };

    assert.strictEqual(json.success, false);
    assert.strictEqual(json.error.code, 'ENTITY_NOT_FOUND');
  });

  test('GET /api/tickets/:id/timeline returns 200 for existing seed ticket', async () => {
    const res = await fetch(`${baseUrl}/api/tickets/TK-20260905-001/timeline`);
    assert.strictEqual(res.status, 200);

    const json = await res.json() as {
      success: boolean;
      data: { ticketCode: string; status: string; timeline: Array<{ toStatus: string }> };
    };

    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.ticketCode, 'TK-20260905-001');
    assert.ok(Array.isArray(json.data.timeline));
  });

  test('PATCH /api/tickets/:id/status successfully transitions ticket and records log', async () => {
    const res = await fetch(`${baseUrl}/api/tickets/TK-20260905-001/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${techToken}`,
      },
      body: JSON.stringify({
        toStatus: 'DIAGNOSING',
        actorId: 'tech-01',
        note: 'Tiến hành chẩn đoán lỗi phần cứng qua REST API',
      }),
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json() as {
      success: boolean;
      data: { ticketCode: string; status: string; timeline: Array<{ toStatus: string; note: string }> };
    };

    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.status, 'DIAGNOSING');
    assert.ok(json.data.timeline.some((l) => l.toStatus === 'DIAGNOSING'));
  });

  test('PATCH /api/tickets/:id/status returns 400 with INVALID_STATE_TRANSITION on illegal jump', async () => {
    // Current status is DIAGNOSING; jumping directly to COMPLETED is forbidden by ALLOWED_TRANSITIONS
    const res = await fetch(`${baseUrl}/api/tickets/TK-20260905-001/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${techToken}`,
      },
      body: JSON.stringify({
        toStatus: 'COMPLETED',
        actorId: 'tech-01',
        note: 'Cố tình nhảy cóc bỏ qua kiểm thử',
      }),
    });

    assert.strictEqual(res.status, 400);
    const json = await res.json() as {
      success: boolean;
      error: { code: string; message: string };
    };

    assert.strictEqual(json.success, false);
    assert.strictEqual(json.error.code, 'INVALID_STATE_TRANSITION');
    assert.ok(json.error.message.includes('Không thể chuyển từ DIAGNOSING sang COMPLETED'));
  });

  test('GET /api/hardware with category, price range, and inStockOnly returns 200 with filtered items', async () => {
    const res = await fetch(
      `${baseUrl}/api/hardware?category=GPU&minPrice=10000000&maxPrice=20000000&inStockOnly=true`
    );
    assert.strictEqual(res.status, 200);

    const json = await res.json() as {
      success: boolean;
      data: Array<{ categoryId: string; price: number; stockQuantity: number }>;
      pagination: { total: number; page: number; limit: number; totalPages: number };
    };

    assert.strictEqual(json.success, true);
    assert.ok(Array.isArray(json.data));
    assert.ok(json.data.length > 0);
    assert.ok(json.pagination.total >= 1);

    for (const item of json.data) {
      assert.strictEqual(item.categoryId, 'GPU');
      assert.ok(item.price >= 10000000 && item.price <= 20000000);
      assert.ok(item.stockQuantity > 0);
    }
  });

  test('GET /api/hardware/:id returns 200 for valid hardware item', async () => {
    const res = await fetch(`${baseUrl}/api/hardware/cpu-i5-13600k`);
    assert.strictEqual(res.status, 200);

    const json = await res.json() as {
      success: boolean;
      data: { id: string; name: string; brand: string; price: number };
    };

    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.id, 'cpu-i5-13600k');
    assert.strictEqual(json.data.brand, 'Intel');
  });

  test('GET /api/hardware/:id returns 404 with ENTITY_NOT_FOUND for invalid ID', async () => {
    const res = await fetch(`${baseUrl}/api/hardware/non-existent-hw-uuid-99999`);
    assert.strictEqual(res.status, 404);

    const json = await res.json() as {
      success: boolean;
      error: { code: string; message: string };
    };

    assert.strictEqual(json.success, false);
    assert.strictEqual(json.error.code, 'ENTITY_NOT_FOUND');
    assert.ok(json.error.message.includes('non-existent-hw-uuid-99999'));
  });

  test('POST /api/tickets/:id/quotation successfully creates quotation and returns 201', async () => {
    const res = await fetch(`${baseUrl}/api/tickets/TK-1001/quotation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${techToken}`,
      },
      body: JSON.stringify({
        diagnosticNotes: 'Lỗi khe RAM, thay thế 1 thanh RAM Kingston Fury 16GB',
        technicianId: 'tech-nv-nam',
        laborCost: 250000,
        parts: [
          {
            hardwareId: 'ram-kingston-ddr4-16',
            quantity: 1,
          },
        ],
      }),
    });

    assert.strictEqual(res.status, 201);
    const json = (await res.json()) as {
      success: boolean;
      data: {
        ticketId: string;
        laborCost: number;
        partsCost: number;
        totalCost: number;
        status: string;
        items: Array<{ hardwareId: string; quantity: number }>;
      };
    };

    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.laborCost, 250000);
    assert.strictEqual(json.data.partsCost, 1290000);
    assert.strictEqual(json.data.totalCost, 1540000);
    assert.strictEqual(json.data.status, 'QUOTED');
    assert.strictEqual(json.data.items.length, 1);
  });

  test('GET /api/tickets/:id/quotation returns 200 with quotation details', async () => {
    const res = await fetch(`${baseUrl}/api/tickets/TK-1001/quotation`);
    assert.strictEqual(res.status, 200);

    const json = (await res.json()) as {
      success: boolean;
      data: {
        totalCost: number;
        items: Array<{ hardwareId: string }>;
      };
    };

    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.totalCost, 1540000);
    assert.strictEqual(json.data.items[0].hardwareId, 'ram-kingston-ddr4-16');
  });

  test('POST /api/orders successfully creates order with stock reservation and price snapshot', async () => {
    const res = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Hoàng Long',
        customerEmail: 'long.hoang@cyberrig.vn',
        customerPhone: '0901122334',
        shippingAddress: '15 Tôn Đức Thắng, Quận 1, TP.HCM',
        items: [{ hardwareId: 'cpu-i5-13600k', quantity: 1 }],
      }),
    });

    assert.strictEqual(res.status, 201);
    const json = (await res.json()) as any;
    assert.strictEqual(json.success, true);
    assert.ok(json.data.id);
    assert.strictEqual(json.data.status, 'PENDING_PAYMENT');
    assert.strictEqual(json.data.items[0].priceAtPurchase, 7690000);
    assert.strictEqual(json.data.totalAmount, 7690000);

    // Verify GET /api/orders/:id
    const getRes = await fetch(`${baseUrl}/api/orders/${json.data.id}`);
    assert.strictEqual(getRes.status, 200);
    const getJson = (await getRes.json()) as any;
    assert.strictEqual(getJson.data.id, json.data.id);
    assert.strictEqual(getJson.data.totalAmount, 7690000);

    // Verify POST /api/orders/:id/confirm
    const confirmRes = await fetch(`${baseUrl}/api/orders/${json.data.id}/confirm`, {
      method: 'POST',
    });
    assert.strictEqual(confirmRes.status, 200);
    const confirmJson = (await confirmRes.json()) as any;
    assert.strictEqual(confirmJson.success, true);
  });

  test('POST /api/orders returns 400 OUT_OF_STOCK when requested quantity exceeds warehouse inventory', async () => {
    const res = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Vũ Quốc Huy',
        customerEmail: 'huy.vu@cyberrig.vn',
        customerPhone: '0909988776',
        shippingAddress: '23 Bà Triệu, Hà Nội',
        items: [{ hardwareId: 'cpu-i5-13600k', quantity: 9999 }],
      }),
    });

    assert.strictEqual(res.status, 400);
    const json = (await res.json()) as any;
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.error.code, 'OUT_OF_STOCK');
  });

  test('GET unknown route returns 404 with ROUTE_NOT_FOUND', async () => {
    const res = await fetch(`${baseUrl}/api/unknown-endpoint-path`);
    assert.strictEqual(res.status, 404);

    const json = (await res.json()) as {
      success: boolean;
      error: { code: string };
    };
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.error.code, 'ROUTE_NOT_FOUND');
  });
});

