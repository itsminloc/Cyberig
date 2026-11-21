import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { TicketStatus } from '../../../modules/repair-tickets/ticket.state';
import { EntityNotFoundError } from '../../../core/errors';
import {
  SAMPLE_TRACKING_TICKETS,
  lookupTicket,
} from '../../pages/ticket-tracking.data';

describe('Repair Ticket Tracking & Cyberpunk Timeline UI (Task FE-04)', () => {
  test('Sample tickets dataset contains all 4 lifecycle states (RECEIVED, REPAIRING, COMPLETED, CANCELLED)', () => {
    assert.strictEqual(SAMPLE_TRACKING_TICKETS.length, 4);

    const receivedTicket = SAMPLE_TRACKING_TICKETS.find((t) => t.status === TicketStatus.RECEIVED);
    assert.ok(receivedTicket);
    assert.strictEqual(receivedTicket.ticketCode, 'TK-20260905-001');

    const inRepairTicket = SAMPLE_TRACKING_TICKETS.find((t) => t.status === TicketStatus.REPAIRING);
    assert.ok(inRepairTicket);
    assert.strictEqual(inRepairTicket.ticketCode, 'TK-20260904-082');

    const completedTicket = SAMPLE_TRACKING_TICKETS.find((t) => t.status === TicketStatus.COMPLETED);
    assert.ok(completedTicket);
    assert.strictEqual(completedTicket.ticketCode, 'TK-20260903-015');

    const cancelledTicket = SAMPLE_TRACKING_TICKETS.find((t) => t.status === TicketStatus.CANCELLED);
    assert.ok(cancelledTicket);
    assert.strictEqual(cancelledTicket.ticketCode, 'TK-20260901-099');
  });

  test('lookupTicket successfully finds ticket by TicketCode (case-insensitive)', async () => {
    const result = await lookupTicket('tk-20260904-082');
    assert.ok(result);
    assert.strictEqual(result.ticketCode, 'TK-20260904-082');
    assert.strictEqual(result.customerName, 'Lê Minh Tuấn');
    assert.strictEqual(result.status, TicketStatus.REPAIRING);
    assert.ok(result.timeline && result.timeline.length >= 5);
  });

  test('lookupTicket successfully finds ticket by customer phone number', async () => {
    const result = await lookupTicket('0901234567');
    assert.ok(result);
    assert.strictEqual(result.ticketCode, 'TK-20260905-001');
    assert.strictEqual(result.customerName, 'Nguyễn Văn An');
    assert.strictEqual(result.status, TicketStatus.RECEIVED);
  });

  test('lookupTicket throws EntityNotFoundError with 404 when ticket is not found', async () => {
    await assert.rejects(
      async () => {
        await lookupTicket('TK-NON-EXISTENT-999');
      },
      (err: unknown) => {
        assert.ok(err instanceof EntityNotFoundError);
        assert.strictEqual(err.statusCode, 404);
        assert.strictEqual(err.code, 'ENTITY_NOT_FOUND');
        assert.ok(err.message.includes('TK-NON-EXISTENT-999'));
        return true;
      }
    );
  });

  test('Timeline logs for completed ticket are ordered chronologically and cover full lifecycle', () => {
    const completedTicket = SAMPLE_TRACKING_TICKETS.find(
      (t) => t.status === TicketStatus.COMPLETED
    )!;
    assert.ok(completedTicket.timeline);
    assert.strictEqual(completedTicket.timeline.length, 7);

    // Verify chronological order
    for (let i = 0; i < completedTicket.timeline.length - 1; i++) {
      const current = new Date(completedTicket.timeline[i].createdAt).getTime();
      const next = new Date(completedTicket.timeline[i + 1].createdAt).getTime();
      assert.ok(current <= next, 'Log entries must be ordered chronologically');
    }

    // Verify initial toStatus is RECEIVED and final toStatus is COMPLETED
    assert.strictEqual(completedTicket.timeline[0].toStatus, TicketStatus.RECEIVED);
    assert.strictEqual(completedTicket.timeline[6].toStatus, TicketStatus.COMPLETED);
  });

  test('Cancelled ticket records transition to CANCELLED in timeline', () => {
    const cancelledTicket = SAMPLE_TRACKING_TICKETS.find(
      (t) => t.status === TicketStatus.CANCELLED
    )!;
    assert.ok(cancelledTicket.timeline);
    const lastLog = cancelledTicket.timeline[cancelledTicket.timeline.length - 1];
    assert.strictEqual(lastLog.toStatus, TicketStatus.CANCELLED);
    assert.strictEqual(lastLog.fromStatus, TicketStatus.WAITING_CUSTOMER);
    assert.ok(lastLog.note.includes('Khách hàng từ chối'));
  });
});
