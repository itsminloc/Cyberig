/**
 * Diagnostics & Quotation Service Unit Tests
 * Aligned with Task BE-08 specification.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DiagnosticsService } from './diagnostics.service';
import { TicketService } from './ticket.service';
import { HardwareService } from '../hardware/hardware.service';
import { TicketStatus, RepairTicketRow, TicketLogRow } from './ticket.model';
import { DatabaseClient, DatabaseHealthCheckResult } from '../../core/db';
import {
  EntityNotFoundError,
  InvalidStateTransitionError,
  InsufficientStockError,
} from '../../core/errors';

/**
 * Mock DB Client for isolated Diagnostics Service testing
 */
class MockDatabaseClient implements DatabaseClient {
  tickets: RepairTicketRow[] = [];
  logs: TicketLogRow[] = [];
  quotations: any[] = [];
  quotationItems: any[] = [];

  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  isConnected(): boolean {
    return true;
  }
  async ping(): Promise<boolean> {
    return true;
  }
  async healthCheck(): Promise<DatabaseHealthCheckResult> {
    return { status: 'healthy', latencyMs: 1, timestamp: new Date() };
  }

  async query<T extends Record<string, any> = Record<string, any>>(
    sql: string,
    params: unknown[] = []
  ): Promise<T[]> {
    const cleanSql = sql.trim().toUpperCase();

    // 1. SELECT * FROM repair_tickets
    if (cleanSql.includes('SELECT * FROM REPAIR_TICKETS')) {
      const identifier = String(params[0]);
      const found = this.tickets.filter(
        (t) => t.id === identifier || t.ticket_code === identifier
      );
      return found as unknown as T[];
    }

    // 2. UPDATE repair_tickets
    if (cleanSql.includes('UPDATE REPAIR_TICKETS')) {
      // Could be status update or quote_amount update
      if (cleanSql.includes('STATUS = $1')) {
        const newStatus = String(params[0]);
        const id = String(params[1]);
        const idx = this.tickets.findIndex((t) => t.id === id);
        if (idx !== -1) {
          this.tickets[idx] = {
            ...this.tickets[idx],
            status: newStatus,
            updated_at: new Date(),
          };
          return [this.tickets[idx]] as unknown as T[];
        }
      } else if (cleanSql.includes('QUOTE_AMOUNT = $1')) {
        const quoteAmount = Number(params[0]);
        const diagNotes = String(params[1] || '');
        const id = String(params[2]);
        const idx = this.tickets.findIndex((t) => t.id === id);
        if (idx !== -1) {
          this.tickets[idx] = {
            ...this.tickets[idx],
            quote_amount: quoteAmount,
            diagnosis_notes: diagNotes,
            updated_at: new Date(),
          };
          return [this.tickets[idx]] as unknown as T[];
        }
      }
      return [] as unknown as T[];
    }

    // 3. INSERT INTO ticket_logs
    if (cleanSql.includes('INSERT INTO TICKET_LOGS')) {
      const logEntry: TicketLogRow = {
        id: `log-${Date.now()}-${Math.random()}`,
        ticket_id: String(params[0]),
        from_status: params[1] ? String(params[1]) : null,
        to_status: String(params[2]),
        note: String(params[3] || ''),
        technician_id: params[4] ? String(params[4]) : null,
        created_at: new Date(),
      };
      this.logs.push(logEntry);
      return [logEntry] as unknown as T[];
    }

    // 4. SELECT * FROM ticket_logs
    if (cleanSql.includes('SELECT * FROM TICKET_LOGS')) {
      const ticketId = String(params[0]);
      const found = this.logs.filter((l) => l.ticket_id === ticketId);
      return found as unknown as T[];
    }

    // 5. INSERT INTO ticket_quotations
    if (cleanSql.includes('INSERT INTO TICKET_QUOTATIONS')) {
      const row = {
        id: `quote-${Date.now()}-${Math.random()}`,
        ticket_id: String(params[0]),
        technician_id: params[1] ? String(params[1]) : null,
        labor_cost: Number(params[2]),
        parts_cost: Number(params[3]),
        total_cost: Number(params[4]),
        notes: String(params[5] || ''),
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.quotations.push(row);
      return [row] as unknown as T[];
    }

    // 6. INSERT INTO ticket_quotation_items
    if (cleanSql.includes('INSERT INTO TICKET_QUOTATION_ITEMS')) {
      const row = {
        id: `q-item-${Date.now()}-${Math.random()}`,
        quotation_id: String(params[0]),
        hardware_id: String(params[1]),
        part_name: String(params[2]),
        quantity: Number(params[3]),
        price_at_quote: Number(params[4]),
        created_at: new Date(),
      };
      this.quotationItems.push(row);
      return [row] as unknown as T[];
    }

    // 7. SELECT * FROM ticket_quotations
    if (cleanSql.includes('SELECT * FROM TICKET_QUOTATIONS')) {
      const ticketId = String(params[0]);
      const found = this.quotations.filter((q) => q.ticket_id === ticketId);
      return found as unknown as T[];
    }

    // 8. SELECT * FROM ticket_quotation_items
    if (cleanSql.includes('SELECT * FROM TICKET_QUOTATION_ITEMS')) {
      const quotationId = String(params[0]);
      const found = this.quotationItems.filter((qi) => qi.quotation_id === quotationId);
      return found as unknown as T[];
    }

    // 9. SELECT * FROM hardware_items
    if (cleanSql.includes('SELECT * FROM HARDWARE_ITEMS')) {
      const id = String(params[0]);
      const found = (new HardwareService() as any).fallbackHardware.filter(
        (h: any) => h.id === id
      );
      return (found || []) as unknown as T[];
    }

    return [] as T[];
  }
}


describe('Technician Diagnostics & Quotation Service (Task BE-08)', () => {
  let mockDb: MockDatabaseClient;
  let ticketService: TicketService;
  let hardwareService: HardwareService;
  let diagnosticsService: DiagnosticsService;

  beforeEach(() => {
    mockDb = new MockDatabaseClient();

    // Populate mock tickets
    mockDb.tickets = [
      {
        id: 'ticket-uuid-diagnosing',
        ticket_code: 'TK-1001',
        customer_name: 'Trần Minh Hoàng',
        customer_phone: '0987654321',
        device_type: 'PC Gaming Cyber Rig Intel Gen 13',
        serial_number: 'SN-CR-1001-VN',
        initial_condition: 'Bật nguồn quạt quay nhưng không lên màn',
        fault_description: 'Nghi ngờ khe RAM lỗi',
        status: TicketStatus.DIAGNOSING,
        warranty_months: 12,
        created_at: new Date('2026-09-08T08:00:00Z'),
        updated_at: new Date('2026-09-08T08:00:00Z'),
      },
      {
        id: 'ticket-uuid-received',
        ticket_code: 'TK-1002',
        customer_name: 'Nguyễn Văn An',
        customer_phone: '0901234567',
        device_type: 'Laptop ASUS ROG',
        serial_number: 'SN-ROG-002',
        initial_condition: 'Trầy nhẹ mặt đáy',
        fault_description: 'Nhiệt độ cao',
        status: TicketStatus.RECEIVED,
        warranty_months: 6,
        created_at: new Date('2026-09-08T08:00:00Z'),
        updated_at: new Date('2026-09-08T08:00:00Z'),
      },
      {
        id: 'ticket-uuid-repairing',
        ticket_code: 'TK-1003',
        customer_name: 'Lê Thu Trang',
        customer_phone: '0912345678',
        device_type: 'VGA RTX 3080',
        serial_number: 'SN-VGA-003',
        initial_condition: 'Mất tem',
        fault_description: 'Chập nguồn 12V',
        status: TicketStatus.REPAIRING,
        warranty_months: 3,
        created_at: new Date('2026-09-08T08:00:00Z'),
        updated_at: new Date('2026-09-08T08:00:00Z'),
      },
    ];

    ticketService = new TicketService(mockDb);
    hardwareService = new HardwareService(mockDb);
    diagnosticsService = new DiagnosticsService(mockDb, ticketService, hardwareService);
  });

  test('Test 1 (Happy Path): Tạo báo giá thành công khi phiếu ở trạng thái DIAGNOSING, tính chuẩn laborCost + partsCost, chuyển trạng thái sang QUOTED', async () => {
    // ram-kingston-ddr4-16: price 1,290,000, stock 50
    const laborCost = 250000;
    const ramItem = await hardwareService.getHardwareById('ram-kingston-ddr4-16');
    assert.ok(ramItem);

    const result = await diagnosticsService.createTicketQuotation('TK-1001', {
      diagnosticNotes: 'Hỏng khe RAM 1, đề xuất thay 1 thanh RAM Kingston Fury 16GB DDR4',
      technicianId: 'tech-nv-nam',
      laborCost,
      parts: [
        {
          hardwareId: 'ram-kingston-ddr4-16',
          quantity: 1,
        },
      ],
    });

    assert.ok(result);
    assert.strictEqual(result.ticketId, 'ticket-uuid-diagnosing');
    assert.strictEqual(result.laborCost, 250000);
    assert.strictEqual(result.partsCost, 1290000);
    assert.strictEqual(result.totalCost, 1540000);
    assert.strictEqual(result.items.length, 1);
    assert.strictEqual(result.items[0].partName, ramItem.name);
    assert.strictEqual(result.items[0].unitPrice, 1290000);
    assert.strictEqual(result.items[0].quantity, 1);
    assert.strictEqual(result.status, TicketStatus.QUOTED);

    // Verify ticket in DB updated status to QUOTED and quote_amount recorded
    const updatedTicket = mockDb.tickets.find((t) => t.ticket_code === 'TK-1001')!;
    assert.strictEqual(updatedTicket.status, TicketStatus.QUOTED);
    assert.strictEqual(updatedTicket.quote_amount, 1540000);
  });

  test('Test 2 (Wrong Status): Ném InvalidStateTransitionError nếu tạo báo giá cho phiếu đang ở trạng thái RECEIVED hoặc REPAIRING', async () => {
    // 1. Thử tạo báo giá cho phiếu ở trạng thái RECEIVED (TK-1002)
    await assert.rejects(
      async () => {
        await diagnosticsService.createTicketQuotation('TK-1002', {
          diagnosticNotes: 'Thử báo giá sớm khi chưa chẩn đoán',
          technicianId: 'tech-nv-nam',
          laborCost: 100000,
          parts: [],
        });
      },
      (err: any) => {
        assert.ok(err instanceof InvalidStateTransitionError);
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /DIAGNOSING/);
        return true;
      }
    );

    // 2. Thử tạo báo giá cho phiếu ở trạng thái REPAIRING (TK-1003)
    await assert.rejects(
      async () => {
        await diagnosticsService.createTicketQuotation('TK-1003', {
          diagnosticNotes: 'Thử báo giá khi đang sửa',
          technicianId: 'tech-nv-nam',
          laborCost: 100000,
          parts: [],
        });
      },
      (err: any) => {
        assert.ok(err instanceof InvalidStateTransitionError);
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /DIAGNOSING/);
        return true;
      }
    );
  });

  test('Test 3 (Out of Stock): Ném lỗi cảnh báo khi số lượng linh kiện kê vượt quá tồn kho thực tế (stock_quantity)', async () => {
    // cpu-r5-5600x có tồn kho = 0 trong hardware.service fallback dataset
    await assert.rejects(
      async () => {
        await diagnosticsService.createTicketQuotation('TK-1001', {
          diagnosticNotes: 'Thay thế CPU đã hết hàng trong kho',
          technicianId: 'tech-nv-nam',
          laborCost: 200000,
          parts: [
            {
              hardwareId: 'cpu-r5-5600x',
              quantity: 1, // tồn kho là 0
            },
          ],
        });
      },
      (err: any) => {
        assert.ok(err instanceof InsufficientStockError);
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /không đủ tồn kho/i);
        return true;
      }
    );

    // Hoặc yêu cầu số lượng vượt quá tồn kho còn lại (ví dụ tồn 25, yêu cầu 100)
    await assert.rejects(
      async () => {
        await diagnosticsService.createTicketQuotation('TK-1001', {
          diagnosticNotes: 'Yêu cầu 100 chiếc CPU i5',
          technicianId: 'tech-nv-nam',
          laborCost: 200000,
          parts: [
            {
              hardwareId: 'cpu-i5-13600k',
              quantity: 100, // tồn là 25
            },
          ],
        });
      },
      (err: any) => {
        assert.ok(err instanceof InsufficientStockError);
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /không đủ tồn kho/i);
        return true;
      }
    );
  });

  test('Test 4 (Invalid Hardware): Ném EntityNotFoundError khi truyền mã linh kiện không tồn tại', async () => {
    await assert.rejects(
      async () => {
        await diagnosticsService.createTicketQuotation('TK-1001', {
          diagnosticNotes: 'Thay linh kiện mã lạ',
          technicianId: 'tech-nv-nam',
          laborCost: 150000,
          parts: [
            {
              hardwareId: 'non-existent-hw-uuid-99999',
              quantity: 1,
            },
          ],
        });
      },
      (err: any) => {
        assert.ok(err instanceof EntityNotFoundError);
        assert.strictEqual(err.statusCode, 404);
        assert.match(err.message, /non-existent-hw-uuid-99999/);
        return true;
      }
    );
  });

  test('Bonus Test: Truy vấn lấy lại chi tiết báo giá bằng getTicketQuotation', async () => {
    // 1. Tạo báo giá
    await diagnosticsService.createTicketQuotation('TK-1001', {
      diagnosticNotes: 'Báo giá nguồn RM750e',
      technicianId: 'tech-nv-nam',
      laborCost: 300000,
      parts: [
        {
          hardwareId: 'psu-corsair-rm750e',
          quantity: 1,
        },
      ],
    });

    // 2. Lấy lại chi tiết báo giá bằng getTicketQuotation
    const quote = await diagnosticsService.getTicketQuotation('TK-1001');
    assert.ok(quote);
    assert.strictEqual(quote.laborCost, 300000);
    assert.strictEqual(quote.partsCost, 2690000);
    assert.strictEqual(quote.totalCost, 2990000);
    assert.strictEqual(quote.items.length, 1);
    assert.strictEqual(quote.items[0].hardwareId, 'psu-corsair-rm750e');
  });

  test('Bonus Test: getTicketQuotation ném EntityNotFoundError nếu phiếu chưa có báo giá', async () => {
    await assert.rejects(
      async () => {
        await diagnosticsService.getTicketQuotation('TK-1002');
      },
      (err: any) => {
        assert.ok(err instanceof EntityNotFoundError);
        assert.strictEqual(err.statusCode, 404);
        return true;
      }
    );
  });
});
