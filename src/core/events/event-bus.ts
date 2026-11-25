/**
 * Dual-Mode Event-Driven Architecture (EDA) Integration Bus (SE445 Case Study 01 & 02)
 * Implements Topic Exchange routing, 3x Retry with backoff, Dead Letter Exchange -> DLQ quarantine,
 * 1-click DLQ Replay, Idempotent Consumer Deduplication, Outbox tracking, and optional RabbitMQ AMQP bridge.
 */

import {
  BrokerUnavailableError,
  BusActivityHookPayload,
  BusDlqEntry,
  CYBERRIG_DLQ,
  CYBERRIG_DLX,
  CYBERRIG_EXCHANGE,
  EventEnvelope,
  EventHandler,
  MAX_RETRIES,
  OutboxRecord,
  QueueRegistration,
} from './event-bus.types';

export type { EventEnvelope, BusDlqEntry, OutboxRecord, BusActivityHookPayload, EventHandler };
export { BrokerUnavailableError, CYBERRIG_EXCHANGE, CYBERRIG_DLX, CYBERRIG_DLQ };

export class IntegrationEventBus {
  private static instance: IntegrationEventBus | null = null;
  private mode: 'RABBITMQ_BRIDGE' | 'IN_MEMORY' = 'IN_MEMORY';
  private brokerOnline = true;
  private queues = new Map<string, QueueRegistration>();
  private dlqStore: BusDlqEntry[] = [];
  private outbox: OutboxRecord[] = [];
  private metrics = { published: 0, processed: 0, retries: 0, duplicatesSkipped: 0 };
  private hooks: Array<(entry: BusActivityHookPayload) => void> = [];

  public static getInstance(): IntegrationEventBus {
    if (!IntegrationEventBus.instance) {
      IntegrationEventBus.instance = new IntegrationEventBus();
    }
    return IntegrationEventBus.instance;
  }

  public onActivity(hook: (entry: BusActivityHookPayload) => void): void {
    this.hooks.push(hook);
  }

  private emit(entry: BusActivityHookPayload): void {
    for (const hook of this.hooks) hook(entry);
  }

  public configureMode(rabbitmqMgmtUrl?: string): 'RABBITMQ_BRIDGE' | 'IN_MEMORY' {
    if (process.env.NODE_ENV !== 'test' && process.env.USE_IN_MEMORY_BROKER !== 'true' && rabbitmqMgmtUrl) {
      this.mode = 'RABBITMQ_BRIDGE';
    } else {
      this.mode = 'IN_MEMORY';
    }
    return this.mode;
  }

  public subscribe(queueName: string, routingKey: string, handler: EventHandler): void {
    const existing = this.queues.get(queueName);
    if (existing) {
      existing.handler = handler;
      existing.routingKey = routingKey;
      return;
    }
    this.queues.set(queueName, {
      queueName,
      routingKey,
      handler,
      paused: false,
      buffered: [],
      processedEvents: new Set<string>(),
    });
  }

  public async publish(
    routingKey: string,
    event: EventEnvelope,
    aggregateId?: string
  ): Promise<void> {
    if (!this.brokerOnline) {
      this.outbox.unshift({
        eventId: event.eventId,
        aggregateId: aggregateId || event.eventId,
        eventType: event.eventType,
        correlationId: event.correlationId,
        status: 'PENDING_RETRY',
        createdAt: event.occurredAt,
      });
      this.emit({
        channel: 'BROKER',
        level: 'ERROR',
        source: 'EventBus',
        message: `Publish blocked (Broker offline) for ${event.eventId} [${routingKey}]`,
        metadata: { correlationId: event.correlationId },
      });
      throw new BrokerUnavailableError('RabbitMQ Broker offline — sự kiện đã được ghi vào Outbox (PENDING_RETRY).');
    }

    this.metrics.published += 1;
    this.outbox.unshift({
      eventId: event.eventId,
      aggregateId: aggregateId || event.eventId,
      eventType: event.eventType,
      correlationId: event.correlationId,
      status: 'PUBLISHED',
      createdAt: event.occurredAt,
      publishedAt: new Date().toISOString(),
    });
    if (this.outbox.length > 100) this.outbox.pop();

    this.emit({
      channel: 'BROKER',
      level: 'INFO',
      source: 'TopicExchange',
      message: `Dispatched ${event.eventType} (${event.eventId}) -> ${CYBERRIG_EXCHANGE} [${routingKey}]`,
      metadata: { correlationId: event.correlationId },
    });

    const targets = [...this.queues.values()].filter((q) => q.routingKey === routingKey);
    const deliveries: Array<Promise<void>> = [];

    for (const q of targets) {
      if (q.paused) {
        q.buffered.push({ event, attempt: 1 });
        this.emit({
          channel: 'BROKER',
          level: 'WARN',
          source: q.queueName,
          message: `Consumer paused — buffered ${event.eventId} (pending=${q.buffered.length})`,
        });
      } else {
        deliveries.push(this.deliver(q, event, 1));
      }
    }

    await Promise.all(deliveries);
  }

  private async deliver(q: QueueRegistration, event: EventEnvelope, attempt: number): Promise<void> {
    if (q.processedEvents.has(event.eventId)) {
      this.metrics.duplicatesSkipped += 1;
      this.emit({
        channel: 'BROKER',
        level: 'INFO',
        source: q.queueName,
        message: `Idempotency guard ACK: duplicate ${event.eventId} skipped safely.`,
        metadata: { correlationId: event.correlationId },
      });
      return;
    }

    try {
      await q.handler(event, attempt);
      q.processedEvents.add(event.eventId);
      this.metrics.processed += 1;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      if (attempt < MAX_RETRIES) {
        this.metrics.retries += 1;
        this.emit({
          channel: 'DLQ',
          level: 'WARN',
          source: q.queueName,
          message: `Retry ${attempt}/${MAX_RETRIES} for ${event.eventId}: ${reason}`,
        });
        await new Promise((resolve) => setTimeout(resolve, 10 * attempt));
        return this.deliver(q, event, attempt + 1);
      }

      const dlqEntry: BusDlqEntry = {
        id: `dlq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        queueName: q.queueName,
        exchange: CYBERRIG_EXCHANGE,
        routingKey: q.routingKey,
        event,
        errorReason: reason,
        retryCount: attempt,
        maxRetries: MAX_RETRIES,
        rejectedAt: new Date().toISOString(),
        status: 'PENDING_INSPECTION',
      };
      this.dlqStore.unshift(dlqEntry);
      this.emit({
        channel: 'DLQ',
        level: 'ERROR',
        source: 'DeadLetterExchange',
        message: `NACK after ${MAX_RETRIES} retries -> quarantined ${event.eventId} into ${CYBERRIG_DLQ}: ${reason}`,
        metadata: { dlqId: dlqEntry.id, correlationId: event.correlationId },
      });
    }
  }

  public async replayDlqMessage(dlqId: string, clearSimulatedFailure = true): Promise<boolean> {
    const entry = this.dlqStore.find((item) => item.id === dlqId);
    if (!entry) return false;

    const q = this.queues.get(entry.queueName);
    entry.status = 'REPLAYED';
    if (clearSimulatedFailure && entry.event.data) {
      entry.event = {
        ...entry.event,
        data: { ...entry.event.data, simulateTmsFailure: false },
      };
    }

    this.emit({
      channel: 'DLQ',
      level: 'SUCCESS',
      source: 'DLQ-Replay',
      message: `Replaying ${entry.event.eventId} back to ${entry.queueName}`,
      metadata: { dlqId },
    });

    if (q) {
      await this.deliver(q, entry.event, 1);
    }
    return true;
  }

  public setBrokerOnline(online: boolean): void {
    this.brokerOnline = online;
    this.emit({
      channel: 'BROKER',
      level: online ? 'SUCCESS' : 'ERROR',
      source: 'BrokerControl',
      message: `Event Broker state changed to ${online ? 'ONLINE' : 'OFFLINE'}`,
    });
  }

  public pauseQueue(queueName: string): boolean {
    const q = this.queues.get(queueName);
    if (!q) return false;
    q.paused = true;
    return true;
  }

  public async resumeQueue(queueName: string): Promise<number> {
    const q = this.queues.get(queueName);
    if (!q) return 0;
    q.paused = false;
    const pending = q.buffered.splice(0, q.buffered.length);
    for (const item of pending) {
      await this.deliver(q, item.event, item.attempt);
    }
    return pending.length;
  }

  public seedInitialDlq(entry: BusDlqEntry): void {
    this.dlqStore.unshift(entry);
  }

  public getDlqMessages(): BusDlqEntry[] {
    return this.dlqStore;
  }

  public getOutboxRecords(): OutboxRecord[] {
    return this.outbox.slice(0, 30);
  }

  public clearDlq(): void {
    this.dlqStore = [];
  }

  public getStatus() {
    return {
      mode: this.mode,
      online: this.brokerOnline,
      exchange: CYBERRIG_EXCHANGE,
      dlx: CYBERRIG_DLX,
      dlq: CYBERRIG_DLQ,
      metrics: { ...this.metrics },
      queues: [...this.queues.values()].map((q) => ({
        queueName: q.queueName,
        routingKey: q.routingKey,
        paused: q.paused,
        readyMessages: q.buffered.length,
        processedUniqueEvents: q.processedEvents.size,
      })),
      pendingDlqCount: this.dlqStore.filter((d) => d.status === 'PENDING_INSPECTION').length,
      outboxCount: this.outbox.length,
    };
  }

  public resetForTest(): void {
    this.brokerOnline = true;
    this.dlqStore = [];
    this.outbox = [];
    this.metrics = { published: 0, processed: 0, retries: 0, duplicatesSkipped: 0 };
    for (const q of this.queues.values()) {
      q.paused = false;
      q.buffered = [];
      q.processedEvents.clear();
    }
  }
}

export const eventBus = IntegrationEventBus.getInstance();
