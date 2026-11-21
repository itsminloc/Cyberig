import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseClient, DatabaseHealthCheckResult } from '../../core/db';
import {
  DomainError,
  IncompatibleHardwareError,
  InvalidStateTransitionError,
  EntityNotFoundError,
} from '../../core/errors';
import { TicketStatus, ALLOWED_TRANSITIONS, isValidTransition } from './ticket.state';
import { TicketService } from './ticket.service';
import { RepairTicketRow, TicketLogRow, TicketPriority } from './ticket.model';

/**
 * In-Memory Mock Database Client for Isolated Unit Testing
 */
class InMemoryDatabaseClient implements DatabaseClient {
  tickets: RepairTicketRow[] = [];
  logs: TicketLogRow[] = [];

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

    // 1. SELECT * FROM repair_tickets WHERE id = $1 OR ticket_code = $1
    if (cleanSql.includes('SELECT * FROM REPAIR_TICKETS')) {
      const identifier = String(params[0]);
      const found = this.tickets.filter(
        (t) => t.id === identifier || t.ticket_code === identifier
      );
      return found as unknown as T[];
    }

    // 2. UPDATE repair_tickets SET status = $1, updated_at = NOW() WHERE id = $2
    if (cleanSql.includes('UPDATE REPAIR_TICKETS')) {
      const newStatus = String(params[0]);
      const id = String(params[1]);
      const index = this.tickets.findIndex((t) => t.id === id);
      if (index !== -1) {
        this.tickets[index] = {
          ...this.tickets[index],
          status: newStatus,
          updated_at: new Date(),
        };
        return [this.tickets[index]] as unknown as T[];
      }
      return [] as unknown as T[];
    }

    // 3. INSERT INTO ticket_logs
    if (cleanSql.includes('INSERT INTO TICKET_LOGS')) {
      const ticketId = String(params[0]);
      const fromStatus = params[1] ? String(params[1]) : null;
      const toStatus = String(params[2]);
      const note = String(params[3] || '');
      const technicianId = params[4] ? String(params[4]) : null;

      const logEntry: TicketLogRow = {
        id: `log-${Date.now()}-${Math.random()}`,
        ticket_id: ticketId,
        from_status: fromStatus,
        to_status: toStatus,
        note,
        technician_id: technicianId,
        created_at: new Date(),
      };
      this.logs.push(logEntry);
      return [logEntry] as unknown as T[];
    }

    // 4. SELECT * FROM ticket_logs WHERE ticket_id = $1 ORDER BY created_at ASC
    if (cleanSql.includes('SELECT * FROM TICKET_LOGS')) {
      const ticketId = String(params[0]);
      const foundLogs = this.logs.filter((l) => l.ticket_id === ticketId);
      return foundLogs as unknown as T[];
    }

    // 5. INSERT INTO repair_tickets
    if (cleanSql.includes('INSERT INTO REPAIR_TICKETS')) {
      let offset = 0;
      let customerId: string | null = null;
      if (cleanSql.includes('CUSTOMER_ID')) {
        customerId = params[0] ? String(params[0]) : null;
        offset = 1;
      }
      const newTicket: RepairTicketRow = {
        id: `ticket-${Date.now()}-${Math.random()}`,
        customer_id: customerId,
        ticket_code: String(params[offset + 0]),
        customer_name: String(params[offset + 1]),
        customer_phone: String(params[offset + 2]),
        customer_email: params[offset + 3] ? String(params[offset + 3]) : null,
        device_type: String(params[offset + 4]),
        serial_number: String(params[offset + 5]),
        initial_condition: String(params[offset + 6]),
        fault_description: String(params[offset + 7]),
        priority: String(params[offset + 8] || 'STANDARD'),
        status: String(params[offset + 9] || TicketStatus.RECEIVED),
        technician_id: params[offset + 10] ? String(params[offset + 10]) : null,
        quote_amount: null,
        is_quote_approved: false,
        warranty_months: Number(params[offset + 11]) || 0,
        created_at: new Date(),
        updated_at: new Date(),
      };
      this.tickets.push(newTicket);
      return [newTicket] as unknown as T[];
    }

    return [] as T[];
  }
}

describe('Core Domain Errors Infrastructure (Task BE-05 - Phần 1)', () => {
  test('DomainError is abstract base class with statusCode and code properties', () => {
    class CustomError extends DomainError {
      constructor() {
        super('Custom test domain error', 418, 'I_AM_A_TEAPOT');
      }
    }
    const err = new CustomError();
    assert.ok(err instanceof Error);
    assert.ok(err instanceof DomainError);
    assert.strictEqual(err.name, 'CustomError');
    assert.strictEqual(err.statusCode, 418);
    assert.strictEqual(err.code, 'I_AM_A_TEAPOT');
    assert.strictEqual(err.message, 'Custom test domain error');
    assert.ok(err.stack);
  });

  test('IncompatibleHardwareError defaults to 422 HARDWARE_INCOMPATIBLE', () => {
    const err = new IncompatibleHardwareError('Socket LGA1700 không khớp AM5');
    assert.ok(err instanceof DomainError);
    assert.strictEqual(err.statusCode, 422);
    assert.strictEqual(err.code, 'HARDWARE_INCOMPATIBLE');
    assert.strictEqual(err.name, 'IncompatibleHardwareError');
  });

  test('InvalidStateTransitionError defaults to 400 INVALID_STATE_TRANSITION', () => {
    const err = new InvalidStateTransitionError('Không thể chuyển trạng thái');
    assert.ok(err instanceof DomainError);
    assert.strictEqual(err.statusCode, 400);
    assert.strictEqual(err.code, 'INVALID_STATE_TRANSITION');
    assert.strictEqual(err.name, 'InvalidStateTransitionError');
  });

  test('EntityNotFoundError defaults to 404 ENTITY_NOT_FOUND', () => {
    const err = new EntityNotFoundError('Phiếu sửa chữa không tồn tại: TK-001');
    assert.ok(err instanceof DomainError);
    assert.strictEqual(err.statusCode, 404);
    assert.strictEqual(err.code, 'ENTITY_NOT_FOUND');
    assert.strictEqual(err.name, 'EntityNotFoundError');
  });
});

describe('Repair Ticket State Machine & Service (Task BE-05 - Phần 2 & 3)', () => {
  let mockDb: InMemoryDatabaseClient;
  let service: TicketService;

  const sampleTicketId = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';
  const sampleTicketCode = 'TK-20260905-001';

  beforeEach(() => {
    mockDb = new InMemoryDatabaseClient();
    service = new TicketService(mockDb);

    // Nạp sẵn 1 phiếu ở trạng thái RECEIVED ban đầu
    mockDb.tickets.push({
      id: sampleTicketId,
      ticket_code: sampleTicketCode,
      customer_name: 'Trần Văn Bảo',
      customer_phone: '0987654321',
      customer_email: 'bao.tran@example.com',
      device_type: 'PC Gaming CyberRig',
      serial_number: 'SN-CYBER-9988',
      initial_condition: 'Máy bật không lên nguồn',
      fault_description: 'Có mùi khét từ khu vực VRM',
      diagnosis_notes: null,
      priority: 'STANDARD',
      technician_id: null,
      status: TicketStatus.RECEIVED,
      quote_amount: null,
      is_quote_approved: false,
      warranty_months: 0,
      created_at: new Date('2026-09-05T08:00:00Z'),
      updated_at: new Date('2026-09-05T08:00:00Z'),
    });
  });

  test('Ma trận ALLOWED_TRANSITIONS tuân thủ đúng quy tắc nghiệp vụ', () => {
    assert.deepStrictEqual(ALLOWED_TRANSITIONS[TicketStatus.RECEIVED], [
      TicketStatus.DIAGNOSING,
      TicketStatus.CANCELLED,
    ]);
    assert.deepStrictEqual(ALLOWED_TRANSITIONS[TicketStatus.DIAGNOSING], [
      TicketStatus.QUOTED,
      TicketStatus.CANCELLED,
    ]);
    assert.deepStrictEqual(ALLOWED_TRANSITIONS[TicketStatus.QUOTED], [
      TicketStatus.WAITING_CUSTOMER,
      TicketStatus.CANCELLED,
    ]);
    assert.deepStrictEqual(ALLOWED_TRANSITIONS[TicketStatus.WAITING_CUSTOMER], [
      TicketStatus.REPAIRING,
      TicketStatus.CANCELLED,
    ]);
    assert.deepStrictEqual(ALLOWED_TRANSITIONS[TicketStatus.REPAIRING], [
      TicketStatus.TESTING_QC,
    ]);
    assert.deepStrictEqual(ALLOWED_TRANSITIONS[TicketStatus.TESTING_QC], [
      TicketStatus.COMPLETED,
      TicketStatus.REPAIRING,
    ]);
    assert.deepStrictEqual(ALLOWED_TRANSITIONS[TicketStatus.COMPLETED], []);
    assert.deepStrictEqual(ALLOWED_TRANSITIONS[TicketStatus.CANCELLED], []);
  });

  test('Test 1 (Pass): Chuyển tuần tự RECEIVED -> DIAGNOSING -> QUOTED thành công và tạo log chuẩn', async () => {
    const actorId = '77777777-8888-9999-aaaa-bbbbccccdddd';

    // 1. Chuyển RECEIVED -> DIAGNOSING
    const res1 = await service.transitionStatus(
      sampleTicketId,
      TicketStatus.DIAGNOSING,
      actorId,
      'Kỹ thuật viên tiếp nhận đo nguồn 12V và kiểm tra VRM'
    );
    assert.strictEqual(res1.status, TicketStatus.DIAGNOSING);

    // 2. Chuyển DIAGNOSING -> QUOTED
    const res2 = await service.transitionStatus(
      sampleTicketCode, // Hỗ trợ cả ticket_code
      TicketStatus.QUOTED,
      actorId,
      'Báo giá thay 2 tụ nguồn VRM và vệ sinh máy: 450.000 VNĐ'
    );
    assert.strictEqual(res2.status, TicketStatus.QUOTED);

    // 3. Kiểm tra Timeline và logs
    const timelineTicket = await service.getTicketTimeline(sampleTicketId);
    assert.strictEqual(timelineTicket.timeline?.length, 2);

    const log1 = timelineTicket.timeline![0];
    assert.strictEqual(log1.fromStatus, TicketStatus.RECEIVED);
    assert.strictEqual(log1.toStatus, TicketStatus.DIAGNOSING);
    assert.strictEqual(log1.note, 'Kỹ thuật viên tiếp nhận đo nguồn 12V và kiểm tra VRM');

    const log2 = timelineTicket.timeline![1];
    assert.strictEqual(log2.fromStatus, TicketStatus.DIAGNOSING);
    assert.strictEqual(log2.toStatus, TicketStatus.QUOTED);
    assert.strictEqual(log2.note, 'Báo giá thay 2 tụ nguồn VRM và vệ sinh máy: 450.000 VNĐ');
  });

  test('Test 2 (Fail Transition): Chuyển nhảy cóc từ RECEIVED sang REPAIRING ném InvalidStateTransitionError status 400', async () => {
    await assert.rejects(
      async () => {
        await service.transitionStatus(
          sampleTicketId,
          TicketStatus.REPAIRING,
          'tech-01',
          'Cố tình nhảy cóc bỏ qua chẩn đoán và báo giá'
        );
      },
      (err: unknown) => {
        assert.ok(err instanceof InvalidStateTransitionError);
        assert.strictEqual(err.statusCode, 400);
        assert.strictEqual(err.code, 'INVALID_STATE_TRANSITION');
        assert.ok(err.message.includes('Không thể chuyển từ RECEIVED sang REPAIRING'));
        return true;
      }
    );

    // Trạng thái phiếu phải giữ nguyên ở RECEIVED
    const unchanged = await service.getTicketTimeline(sampleTicketId);
    assert.strictEqual(unchanged.status, TicketStatus.RECEIVED);
  });

  test('Test 3 (Policy Check): Đang sửa chữa REPAIRING không thể hủy sang CANCELLED', async () => {
    // Đưa phiếu đến trạng thái REPAIRING hợp lệ
    await service.transitionStatus(sampleTicketId, TicketStatus.DIAGNOSING, 'tech-01');
    await service.transitionStatus(sampleTicketId, TicketStatus.QUOTED, 'tech-01');
    await service.transitionStatus(sampleTicketId, TicketStatus.WAITING_CUSTOMER, 'tech-01');
    await service.transitionStatus(sampleTicketId, TicketStatus.REPAIRING, 'tech-01', 'Bắt đầu hàn tụ');

    // Thử hủy phiếu khi đang trong quá trình sửa chữa
    await assert.rejects(
      async () => {
        await service.transitionStatus(
          sampleTicketId,
          TicketStatus.CANCELLED,
          'tech-01',
          'Khách đổi ý muốn hủy ngang khi linh kiện đã tháo ra hàn'
        );
      },
      (err: unknown) => {
        assert.ok(err instanceof InvalidStateTransitionError);
        assert.strictEqual(err.statusCode, 400);
        assert.strictEqual(err.code, 'INVALID_STATE_TRANSITION');
        assert.ok(err.message.includes('Không thể chuyển từ REPAIRING sang CANCELLED'));
        return true;
      }
    );
  });

  test('Test 4 (Not Found): Truy vấn mã phiếu không tồn tại ném EntityNotFoundError status 404', async () => {
    const invalidId = 'non-existent-ticket-uuid-999999';

    await assert.rejects(
      async () => {
        await service.transitionStatus(
          invalidId,
          TicketStatus.DIAGNOSING,
          'tech-01'
        );
      },
      (err: unknown) => {
        assert.ok(err instanceof EntityNotFoundError);
        assert.strictEqual(err.statusCode, 404);
        assert.strictEqual(err.code, 'ENTITY_NOT_FOUND');
        assert.ok(err.message.includes(invalidId));
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await service.getTicketTimeline(invalidId);
      },
      (err: unknown) => {
        assert.ok(err instanceof EntityNotFoundError);
        assert.strictEqual(err.statusCode, 404);
        return true;
      }
    );
  });

  test('Bonus Test: Chu trình kiểm thử QC không đạt có thể quay lại REPAIRING', async () => {
    // Đưa phiếu đến TESTING_QC
    await service.transitionStatus(sampleTicketId, TicketStatus.DIAGNOSING, 'tech-01');
    await service.transitionStatus(sampleTicketId, TicketStatus.QUOTED, 'tech-01');
    await service.transitionStatus(sampleTicketId, TicketStatus.WAITING_CUSTOMER, 'tech-01');
    await service.transitionStatus(sampleTicketId, TicketStatus.REPAIRING, 'tech-01');
    await service.transitionStatus(sampleTicketId, TicketStatus.TESTING_QC, 'tech-01', 'Chạy FurMark stress test');

    // QC không đạt: Quay lại REPAIRING
    const rework = await service.transitionStatus(
      sampleTicketId,
      TicketStatus.REPAIRING,
      'tech-01',
      'Nhiệt độ VRM quá 95C sau 15 phút, cần thay thế pad tản nhiệt'
    );
    assert.strictEqual(rework.status, TicketStatus.REPAIRING);

    // Sửa lại xong: Tiến hành QA lại
    const retest = await service.transitionStatus(
      sampleTicketId,
      TicketStatus.TESTING_QC,
      'tech-01',
      'Đã thay thermal pad mới, nhiệt độ ổn định 68C'
    );
    assert.strictEqual(retest.status, TicketStatus.TESTING_QC);

    // Đạt chuẩn: Hoàn thành COMPLETED
    const completed = await service.transitionStatus(
      sampleTicketId,
      TicketStatus.COMPLETED,
      'tech-01',
      'Nghiệm thu thành công, dán tem bảo hành 3 tháng'
    );
    assert.strictEqual(completed.status, TicketStatus.COMPLETED);

    // Trạng thái kết thúc COMPLETED không thể chuyển tiếp
    await assert.rejects(async () => {
      await service.transitionStatus(sampleTicketId, TicketStatus.REPAIRING, 'tech-01');
    }, InvalidStateTransitionError);
  });

  test('Tạo phiếu tiếp nhận kiểm tra/sửa chữa thiết bị mua tại CyberRig', async () => {
    const ticket = await service.createTicket({
      customerId: 'a1f97373-9c6d-47b6-9d9a-b266c609793f',
      customerName: 'Nguyễn Văn Khách',
      customerPhone: '0909123456',
      customerEmail: 'customer@cyberig.vn',
      deviceType: 'PC Gaming CyberRig i5-13400F / RTX 4060',
      serialNumber: 'CR-SN-8821-VN',
      initialCondition: '[NGUỒN GỐC: THIẾT BỊ MUA TẠI CYBERRIG] Máy còn nguyên tem, case kính đẹp',
      faultDescription: 'Màn hình xanh BSOD khi vào game nặng',
      priority: TicketPriority.STANDARD,
    });

    assert.ok(ticket.id);
    assert.match(ticket.ticketCode, /^TK-\d{8}-\d{4}$/);
    assert.strictEqual(ticket.status, TicketStatus.RECEIVED);
    assert.strictEqual(ticket.customerName, 'Nguyễn Văn Khách');
    assert.ok(ticket.initialCondition.includes('MUA TẠI CYBERRIG'));
    assert.ok(ticket.timeline.length >= 1);
    assert.strictEqual(ticket.timeline[0].toStatus, TicketStatus.RECEIVED);
  });

  test('Tạo phiếu tiếp nhận kiểm tra/sửa chữa linh kiện/máy mua bên ngoài (Khách vãng lai)', async () => {
    const ticket = await service.createTicket({
      customerName: 'Trần Văn Ngoài',
      customerPhone: '0988776655',
      deviceType: 'Card VGA MSI RTX 3070 Ti Gaming X',
      serialNumber: 'MSI-VGA-99120',
      initialCondition: '[NGUỒN GỐC: LINH KIỆN / MÁY MUA BÊN NGOÀI] Không tem CyberRig, quạt bị rít',
      faultDescription: 'Quạt tản nhiệt quay kêu to, sập nguồn khi stress test',
      priority: TicketPriority.URGENT,
    });

    assert.ok(ticket.id);
    assert.match(ticket.ticketCode, /^TK-\d{8}-\d{4}$/);
    assert.strictEqual(ticket.status, TicketStatus.RECEIVED);
    assert.strictEqual(ticket.customerName, 'Trần Văn Ngoài');
    assert.ok(ticket.initialCondition.includes('MUA BÊN NGOÀI'));
    assert.strictEqual(ticket.priority, TicketPriority.URGENT);
  });
});

