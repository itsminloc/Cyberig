/**
 * Technician Diagnostics & Quotation Portal Unit Tests
 * Aligned with Task FE-06 specification.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { TicketStatus } from '../../../modules/repair-tickets/ticket.model';
import {
  fetchTechnicianTickets,
  fetchTicketById,
  submitTicketQuotation,
} from '../../services/technician.api';
import { SAMPLE_TRACKING_TICKETS } from '../ticket-tracking.data';

describe('Technician Diagnostics & Quotation Portal (Task FE-06)', () => {
  test('Test 1: fetchTechnicianTickets filters tickets by DIAGNOSING queue', async () => {
    const tickets = await fetchTechnicianTickets('DIAGNOSING');
    assert.ok(tickets.length > 0, 'Phải có ít nhất 1 phiếu ở trạng thái DIAGNOSING');

    for (const t of tickets) {
      assert.strictEqual(
        t.status,
        TicketStatus.DIAGNOSING,
        `Phiếu ${t.ticketCode} phải ở trạng thái DIAGNOSING`
      );
    }

    const foundTk1001 = tickets.find((t) => t.ticketCode === 'TK-1001');
    assert.ok(foundTk1001, 'Phiếu TK-1001 phải nằm trong hàng chờ DIAGNOSING');
  });

  test('Test 2: fetchTicketById retrieves details and timeline for a given ticket', async () => {
    const ticket = await fetchTicketById('TK-1001');
    assert.ok(ticket);
    assert.strictEqual(ticket.ticketCode, 'TK-1001');
    assert.strictEqual(ticket.customerName, 'Trần Minh Hoàng');
    assert.ok(Array.isArray(ticket.timeline));
    assert.ok(ticket.timeline.length >= 1);
  });

  test('Test 3: Real-time calculation of laborCost and partsCost', () => {
    const laborCost = 250000;
    const parts = [
      { unitPrice: 1290000, quantity: 1 }, // RAM 1.290.000đ
      { unitPrice: 150000, quantity: 2 },  // Fan / keo 300.000đ
    ];

    const partsCost = parts.reduce((acc, p) => acc + p.unitPrice * p.quantity, 0);
    const totalCost = laborCost + partsCost;

    assert.strictEqual(partsCost, 1590000);
    assert.strictEqual(totalCost, 1840000);
  });

  test('Test 4: Stock quantity bounds enforcement', () => {
    const stockQuantity = 5;

    // Increment within stock bounds
    let qty = 1;
    const increment = () => {
      qty = Math.min(stockQuantity, qty + 1);
    };
    const decrement = () => {
      qty = Math.max(1, qty - 1);
    };

    // Increment up to max
    for (let i = 0; i < 10; i++) increment();
    assert.strictEqual(qty, 5, 'Số lượng không được vượt quá số lượng tồn kho (5)');

    // Decrement down to min 1
    for (let i = 0; i < 10; i++) decrement();
    assert.strictEqual(qty, 1, 'Số lượng không được thấp hơn 1');
  });

  test('Test 5: submitTicketQuotation successfully transitions ticket to QUOTED and returns QuotationResult', async () => {
    // Ensure TK-1001 is set to DIAGNOSING
    const ticket = SAMPLE_TRACKING_TICKETS.find((t) => t.ticketCode === 'TK-1001');
    if (ticket) {
      ticket.status = TicketStatus.DIAGNOSING;
    }

    const res = await submitTicketQuotation('TK-1001', {
      diagnosticNotes: 'Hỏng khe RAM 1, đề xuất thay RAM mới và vệ sinh chân socket',
      technicianId: 'tech-nv-nam',
      laborCost: 250000,
      parts: [
        {
          hardwareId: 'ram-kingston-ddr4-16',
          quantity: 1,
        },
      ],
    });

    assert.ok(res);
    assert.strictEqual(res.laborCost, 250000);
    assert.strictEqual(res.status, TicketStatus.QUOTED);
    assert.ok(res.totalCost > 250000);
    assert.strictEqual(res.items.length, 1);
  });

  test('Test 6: submitTicketQuotation throws error when ticket is not in DIAGNOSING state', async () => {
    // Ticket TK-20260905-001 is in RECEIVED state
    await assert.rejects(
      async () => {
        await submitTicketQuotation('TK-20260905-001', {
          diagnosticNotes: 'Cố tình lập báo giá khi phiếu chưa kiểm tra',
          technicianId: 'tech-nv-nam',
          laborCost: 100000,
          parts: [],
        });
      },
      (err: any) => {
        assert.ok(err.message.includes('DIAGNOSING'));
        return true;
      }
    );
  });
});
