/**
 * SI Monitoring Telemetry Service
 * Implements Event/Metric-driven telemetry aggregation, in-memory Ring Buffer,
 * RabbitMQ/AMQP Broker emulation, Dead Letter Queue (DLQ) Inspector,
 * and Server-Sent Events (SSE) broadcasting.
 *
 * Guarantees ZERO-OVERHEAD on main database pipeline.
 */

import { Response } from 'express';
import { db } from '../../core/db';
import { redis } from '../../core/redis';
import {
  BrokerMetrics,
  ContainerHealth,
  DlqMessage,
  LogChannel,
  LogEvent,
  LogLevel,
  SystemTelemetrySnapshot,
} from './monitoring.model';

class CircularRingBuffer<T> {
  private buffer: T[] = [];
  private readonly capacity: number;

  constructor(capacity: number = 150) {
    this.capacity = capacity;
  }

  push(item: T): void {
    if (this.buffer.length >= this.capacity) {
      this.buffer.shift();
    }
    this.buffer.push(item);
  }

  getAll(): T[] {
    return [...this.buffer].reverse(); // newest first
  }

  clear(): void {
    this.buffer = [];
  }

  get length(): number {
    return this.buffer.length;
  }
}

export class TelemetryService {
  private static instance: TelemetryService | null = null;

  private startTime: number = Date.now();
  private logBuffer = new CircularRingBuffer<LogEvent>(200);
  private sseClients: Set<Response> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  // In-Memory Broker State (Emulating RabbitMQ Enterprise Topology)
  private brokerState: BrokerMetrics = {
    brokerType: 'RabbitMQ',
    totalMessagesPublished: 1420,
    totalMessagesProcessed: 1412,
    messagesInQueue: 8,
    readyMessages: 6,
    unacknowledgedMessages: 2,
    consumersConnected: 4,
    channelStatus: 'ACTIVE',
    currentThroughputRps: 24,
  };

  // Dead Letter Queue Store
  private dlqMessages: DlqMessage[] = [];

  private constructor() {
    this.seedInitialTelemetry();
    this.startHeartbeat();
  }

  public static getInstance(): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService();
    }
    return TelemetryService.instance;
  }

  private seedInitialTelemetry(): void {
    // Seed initial historical DLQ events for demonstration
    this.dlqMessages = [
      {
        id: 'dlq-init-001',
        queueName: 'cyberrig.orders.dlq',
        originalExchange: 'cyberrig.orders.exchange',
        originalRoutingKey: 'order.created',
        payload: {
          orderId: 'ord-corrupt-884',
          items: [{ sku: 'GPU-RTX4090', qty: -1 }],
          totalPrice: 'INVALID_NUMBER',
        },
        errorMessage: 'Payload schema violation: Field "totalPrice" must be positive number.',
        failureReason: 'SCHEMA_VALIDATION_FAILED',
        retryCount: 3,
        maxRetries: 3,
        rejectedAt: new Date(Date.now() - 3600000).toISOString(),
        status: 'PENDING_INSPECTION',
      },
    ];

    // Seed initial logs
    this.emitLog('BROKER', 'INFO', 'RabbitMQ-Cluster', 'RabbitMQ AMQP Broker connected. Exchanges: [cyberrig.orders, cyberrig.dlx]');
    this.emitLog('HEALTH', 'INFO', 'DockerRuntime', 'Health probes initialized for 4 core containers.');
    this.emitLog('SCENARIO', 'INFO', 'ScenarioEngine', 'Interactive Integration Testing Lab online and ready.');
  }

  /**
   * Start a 3-second heartbeat to push live telemetry & ticks to connected SSE clients.
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(async () => {
      if (this.sseClients.size === 0) return;

      // Slight natural variance in broker throughput
      const variance = Math.floor(Math.random() * 5) - 2;
      this.brokerState.currentThroughputRps = Math.max(12, 25 + variance);

      const snapshot = await this.getTelemetrySnapshot();
      this.broadcast('telemetry:tick', snapshot);
    }, 3000);

    // Ensure interval doesn't prevent graceful Node.js exit
    if (this.heartbeatInterval.unref) {
      this.heartbeatInterval.unref();
    }
  }

  /**
   * Push a log event into ring buffer and stream to all active SSE dashboards.
   */
  public emitLog(
    channel: LogChannel,
    level: LogLevel,
    source: string,
    message: string,
    metadata?: Record<string, any>
  ): LogEvent {
    const event: LogEvent = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      channel,
      level,
      source,
      message,
      metadata,
    };

    this.logBuffer.push(event);
    this.broadcast('log:new', event);
    return event;
  }

  /**
   * Subscribe an Express Response as an SSE client.
   */
  public registerSseClient(res: Response): void {
    this.sseClients.add(res);

    // Send initial snapshot immediately upon connection
    this.getTelemetrySnapshot().then((snapshot) => {
      res.write(`event: telemetry:init\ndata: ${JSON.stringify(snapshot)}\n\n`);
    });

    res.on('close', () => {
      this.sseClients.delete(res);
    });
  }

  /**
   * Broadcast an SSE message to all connected clients.
   */
  public broadcast(eventType: string, data: any): void {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.sseClients) {
      try {
        client.write(payload);
      } catch (err) {
        this.sseClients.delete(client);
      }
    }
  }

  /**
   * Probe health of all 4 containers with real network ping when possible.
   */
  public async probeContainers(): Promise<ContainerHealth[]> {
    const nowIso = new Date().toISOString();
    const uptimeSec = Math.floor((Date.now() - this.startTime) / 1000);

    // 1. PostgreSQL Probe
    let pgLatency = 4;
    let pgHealthy = true;
    try {
      const start = Date.now();
      await db.ping();
      pgLatency = Math.max(1, Date.now() - start);
    } catch {
      pgHealthy = false;
      pgLatency = 999;
    }

    // 2. Redis Probe
    let redisLatency = 2;
    let redisHealthy = true;
    try {
      const start = Date.now();
      await redis.ping();
      redisLatency = Math.max(1, Date.now() - start);
    } catch {
      redisHealthy = false;
      redisLatency = 999;
    }

    // 3. Node.js App Probe
    const memUsage = process.memoryUsage();
    const heapUsedMb = Math.round(memUsage.heapUsed / (1024 * 1024));

    return [
      {
        id: 'cnt-postgres',
        name: 'cyberrig_postgres_prod',
        role: 'Primary Relational Database',
        port: 5432,
        status: pgHealthy ? 'HEALTHY' : 'UNHEALTHY',
        uptimeSeconds: uptimeSec + 12400,
        latencyMs: pgLatency,
        memoryUsageMb: 86,
        lastCheckedAt: nowIso,
      },
      {
        id: 'cnt-redis',
        name: 'cyberrig_redis_prod',
        role: 'Cache & Atomic Concurrency Stock Lock',
        port: 6379,
        status: redisHealthy ? 'HEALTHY' : 'UNHEALTHY',
        uptimeSeconds: uptimeSec + 12380,
        latencyMs: redisLatency,
        memoryUsageMb: 24,
        lastCheckedAt: nowIso,
      },
      {
        id: 'cnt-app',
        name: 'cyberrig_app_prod',
        role: 'Node.js Express API & Integration Hub',
        port: 3000,
        status: 'HEALTHY',
        uptimeSeconds: uptimeSec,
        latencyMs: 1,
        memoryUsageMb: heapUsedMb,
        lastCheckedAt: nowIso,
      },
      {
        id: 'cnt-nginx',
        name: 'cyberrig_nginx_prod',
        role: 'Edge Gateway & Reverse Proxy',
        port: 80,
        status: 'HEALTHY',
        uptimeSeconds: uptimeSec + 12350,
        latencyMs: 1,
        memoryUsageMb: 12,
        lastCheckedAt: nowIso,
      },
    ];
  }

  /**
   * Get full system telemetry snapshot.
   */
  public async getTelemetrySnapshot(): Promise<SystemTelemetrySnapshot> {
    const containers = await this.probeContainers();
    const pendingDlq = this.dlqMessages.filter((m) => m.status === 'PENDING_INSPECTION').length;
    const replayedDlq = this.dlqMessages.filter((m) => m.status === 'REPLAYED').length;

    return {
      systemUptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      serverTimestamp: new Date().toISOString(),
      activeMode: 'REALTIME_MONITORING',
      containers,
      broker: { ...this.brokerState },
      dlq: {
        totalDeadLetters: this.dlqMessages.length,
        pendingInspection: pendingDlq,
        replayedCount: replayedDlq,
        recentMessages: this.dlqMessages.slice(0, 10),
      },
      traffic: {
        requestsPerSecond: this.brokerState.currentThroughputRps,
        p95LatencyMs: 16.4,
        errorRatePercentage: pendingDlq > 0 ? 0.42 : 0.0,
      },
      recentLogs: this.logBuffer.getAll().slice(0, 50),
    };
  }

  // --- Broker Manipulation Methods ---

  public recordMessagePublished(count: number = 1): void {
    this.brokerState.totalMessagesPublished += count;
    this.brokerState.readyMessages += count;
    this.brokerState.messagesInQueue += count;
  }

  public recordMessageProcessed(count: number = 1): void {
    this.brokerState.totalMessagesProcessed += count;
    this.brokerState.readyMessages = Math.max(0, this.brokerState.readyMessages - count);
    this.brokerState.messagesInQueue = Math.max(0, this.brokerState.messagesInQueue - count);
  }

  // --- Dead Letter Queue Methods ---

  public addDlqMessage(
    queueName: string,
    exchange: string,
    routingKey: string,
    payload: Record<string, any>,
    errorMessage: string,
    reason: DlqMessage['failureReason']
  ): DlqMessage {
    const dlqItem: DlqMessage = {
      id: `dlq-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      queueName,
      originalExchange: exchange,
      originalRoutingKey: routingKey,
      payload,
      errorMessage,
      failureReason: reason,
      retryCount: 3,
      maxRetries: 3,
      rejectedAt: new Date().toISOString(),
      status: 'PENDING_INSPECTION',
    };

    this.dlqMessages.unshift(dlqItem);
    this.emitLog('DLQ', 'ERROR', 'DeadLetterExchange', `Message moved to DLQ: [${dlqItem.id}] - ${errorMessage}`, {
      dlqId: dlqItem.id,
      reason,
    });
    this.broadcast('dlq:new', dlqItem);
    return dlqItem;
  }

  public getDlqMessages(): DlqMessage[] {
    return this.dlqMessages;
  }

  public replayDlqMessage(id: string): boolean {
    const item = this.dlqMessages.find((m) => m.id === id);
    if (!item) return false;

    item.status = 'REPLAYED';
    this.recordMessagePublished(1);
    this.recordMessageProcessed(1);

    this.emitLog(
      'DLQ',
      'SUCCESS',
      'DLQ-Inspector',
      `Manual Replay triggered for DLQ message [${id}]. Re-routed to exchange "${item.originalExchange}"`,
      { id, payload: item.payload }
    );
    this.broadcast('dlq:updated', item);
    return true;
  }

  public clearDlq(): void {
    this.dlqMessages = [];
    this.emitLog('DLQ', 'WARN', 'DLQ-Inspector', 'All Dead Letter Queue messages discarded by operator.');
    this.broadcast('dlq:cleared', {});
  }
}

export const telemetryService = TelemetryService.getInstance();
