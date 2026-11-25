/**
 * SE445 Core Event Bus, Distributed Tracing & Decree 13 PII Redaction Unit Tests
 * Covers UNIT-01..05 and TC02..TC07 resilience invariants.
 */

import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Request, Response } from 'express';
import { correlationMiddleware } from '../middlewares/correlation.middleware';
import { maskRawTextPii } from '../security/pii-mask.util';
import { BrokerUnavailableError, EventEnvelope, IntegrationEventBus } from './event-bus';

describe('SE445 Core Integration Primitives (Tracing, PII Mask & Event Bus)', () => {
  const bus = IntegrationEventBus.getInstance();

  beforeEach(() => {
    bus.resetForTest();
  });

  afterEach(() => {
    bus.setBrokerOnline(true);
  });

  test('UNIT-01: correlationMiddleware preserves incoming X-Correlation-ID and generates one when missing', () => {
    const req1 = { headers: { 'x-correlation-id': 'corr-client-xyz' }, method: 'GET', originalUrl: '/test' } as unknown as Request;
    const headers1: Record<string, string> = {};
    const res1 = { setHeader: (k: string, v: string) => { headers1[k] = v; } } as unknown as Response;
    let nextCalled1 = false;
    correlationMiddleware(req1, res1, () => { nextCalled1 = true; });

    assert.strictEqual(nextCalled1, true);
    assert.strictEqual(req1.correlationId, 'corr-client-xyz');
    assert.strictEqual(headers1['X-Correlation-ID'], 'corr-client-xyz');

    const req2 = { headers: {}, method: 'POST', originalUrl: '/api/orders' } as unknown as Request;
    const headers2: Record<string, string> = {};
    const res2 = { setHeader: (k: string, v: string) => { headers2[k] = v; } } as unknown as Response;
    correlationMiddleware(req2, res2, () => {});
    assert.ok(req2.correlationId && req2.correlationId.length >= 16);
    assert.strictEqual(headers2['X-Correlation-ID'], req2.correlationId);
  });

  test('UNIT-02: maskRawTextPii scrubs Vietnamese phone numbers and email addresses before AI prompts', () => {
    const raw = 'Khach Nguyen Van A, SDT: 0901234567, Email: customer.vip@gmail.com dat 1x RTX 4080';
    const masked = maskRawTextPii(raw);

    assert.ok(!masked.includes('0901234567'));
    assert.ok(!masked.includes('customer.vip@gmail.com'));
    assert.ok(masked.includes('RTX 4080'));
  });

  test('TC02 & TC06: EventBus fans out to subscribers and deduplicates duplicate deliveries (Idempotency)', async () => {
    let deliveryCount = 0;
    bus.subscribe('test.inventory', 'order.created', async () => {
      deliveryCount += 1;
    });

    const envelope: EventEnvelope = {
      eventId: 'evt-idem-001',
      eventType: 'OrderPlaced',
      eventVersion: '1.0',
      occurredAt: new Date().toISOString(),
      correlationId: 'corr-idem-001',
      sourceChannel: 'WEB_STOREFRONT',
      data: { orderId: 'ORD-001' },
    };

    await bus.publish('order.created', envelope, 'ORD-001');
    await bus.publish('order.created', envelope, 'ORD-001');

    assert.strictEqual(deliveryCount, 1);
    assert.strictEqual(bus.getStatus().metrics.duplicatesSkipped, 1);
  });

  test('TC03 & TC04: EventBus retries 3x on failure, quarantines to DLQ, and recovers on 1-click replay', async () => {
    bus.subscribe('test.tms', 'order.created', async (event) => {
      if (event.data.simulateTmsFailure) throw new Error('Simulated 504 TMS Carrier Timeout');
    });

    const poisonEvent: EventEnvelope = {
      eventId: 'evt-dlq-001',
      eventType: 'OrderPlaced',
      eventVersion: '1.0',
      occurredAt: new Date().toISOString(),
      correlationId: 'corr-dlq-001',
      sourceChannel: 'PARTNER_B2B_API',
      data: { orderId: 'ORD-FAIL-001', simulateTmsFailure: true },
    };

    await bus.publish('order.created', poisonEvent, 'ORD-FAIL-001');

    const dlq = bus.getDlqMessages();
    assert.strictEqual(dlq.length, 1);
    assert.strictEqual(dlq[0].retryCount, 3);
    assert.strictEqual(dlq[0].status, 'PENDING_INSPECTION');

    const replayed = await bus.replayDlqMessage(dlq[0].id, true);
    assert.strictEqual(replayed, true);
    assert.strictEqual(dlq[0].status, 'REPLAYED');
  });

  test('TC05: Pausing and resuming a queue buffers in-flight events without data loss', async () => {
    let processed = 0;
    bus.subscribe('test.crm', 'order.created', async () => {
      processed += 1;
    });

    assert.strictEqual(bus.pauseQueue('test.crm'), true);
    await bus.publish(
      'order.created',
      {
        eventId: 'evt-pause-001',
        eventType: 'OrderPlaced',
        eventVersion: '1.0',
        occurredAt: new Date().toISOString(),
        correlationId: 'corr-pause-001',
        sourceChannel: 'MOBILE_APP',
        data: { orderId: 'ORD-PAUSE' },
      },
      'ORD-PAUSE'
    );
    assert.strictEqual(processed, 0);

    const flushed = await bus.resumeQueue('test.crm');
    assert.strictEqual(flushed, 1);
    assert.strictEqual(processed, 1);
  });

  test('TC07: Offline Broker throws BrokerUnavailableError (503) and records Outbox PENDING_RETRY', async () => {
    bus.setBrokerOnline(false);

    await assert.rejects(
      () =>
        bus.publish(
          'order.created',
          {
            eventId: 'evt-offline-001',
            eventType: 'OrderPlaced',
            eventVersion: '1.0',
            occurredAt: new Date().toISOString(),
            correlationId: 'corr-off-001',
            sourceChannel: 'WEB_STOREFRONT',
            data: { orderId: 'ORD-OFF' },
          },
          'ORD-OFF'
        ),
      (err: unknown) => err instanceof BrokerUnavailableError && err.statusCode === 503
    );

    const outbox = bus.getOutboxRecords();
    assert.strictEqual(outbox[0].status, 'PENDING_RETRY');
    assert.strictEqual(outbox[0].aggregateId, 'ORD-OFF');
  });
});
