/**
 * Integration Event Bus Type Definitions & Constants (SE445 Case Study 01 & 02)
 */

export interface EventEnvelope<T = Record<string, unknown>> {
  eventId: string;
  eventType: string;
  eventVersion: string;
  occurredAt: string;
  correlationId: string;
  sourceChannel: string;
  data: T;
}

export interface BusDlqEntry {
  id: string;
  queueName: string;
  exchange: string;
  routingKey: string;
  event: EventEnvelope;
  errorReason: string;
  retryCount: number;
  maxRetries: number;
  rejectedAt: string;
  status: 'PENDING_INSPECTION' | 'REPLAYED' | 'DISCARDED';
}

export interface OutboxRecord {
  eventId: string;
  aggregateId: string;
  eventType: string;
  correlationId: string;
  status: 'PUBLISHED' | 'PENDING_RETRY';
  createdAt: string;
  publishedAt?: string;
}

export interface BusActivityHookPayload {
  channel: 'BROKER' | 'DLQ' | 'SCENARIO' | 'HEALTH' | 'SECURITY';
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  source: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export type EventHandler = (event: EventEnvelope, attempt: number) => Promise<void>;

export interface QueueRegistration {
  queueName: string;
  routingKey: string;
  handler: EventHandler;
  paused: boolean;
  buffered: Array<{ event: EventEnvelope; attempt: number }>;
  processedEvents: Set<string>;
}

export class BrokerUnavailableError extends Error {
  public readonly statusCode = 503;
  public readonly code = 'BROKER_UNAVAILABLE';
  constructor(message = 'Event Broker tạm thời gián đoạn kết nối.') {
    super(message);
    this.name = 'BrokerUnavailableError';
  }
}

export const CYBERRIG_EXCHANGE = 'cyberrig.orders';
export const CYBERRIG_DLX = 'cyberrig.dlx';
export const CYBERRIG_DLQ = 'cyberrig.orders.dlq';
export const MAX_RETRIES = 3;
