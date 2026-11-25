/**
 * SI Monitoring Telemetry Service
 * Implements Event/Metric-driven telemetry aggregation, Circular Ring Buffer,
 * Integration Event Bus bridging, Dead Letter Queue (DLQ) Inspector,
 * and Server-Sent Events (SSE) broadcasting without impacting main OLTP queries.
 */

import { Response } from 'express';
import { config } from '../../core/config';
import { eventBus } from '../../core/events';
import {
  BrokerMetrics, DlqMessage, LogChannel, LogEvent, LogLevel, SystemTelemetrySnapshot,
} from './monitoring.model';
import {
  CircularRingBuffer, createSeedDlqEntries, mapBusEntryToDlqMessage, probeCoreContainers,
} from './telemetry-probes.util';

export class TelemetryService {
  private static instance: TelemetryService | null = null;

  private startTime: number = Date.now();
  private logBuffer = new CircularRingBuffer<LogEvent>(200);
  private sseClients: Set<Response> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private basePublished = 1420;
  private baseProcessed = 1412;

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

  private dlqMessages: DlqMessage[] = [];

  private constructor() {
    this.seedInitialTelemetry();
    this.wireEventBus();
    this.startHeartbeat();
  }

  public static getInstance(): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService();
    }
    return TelemetryService.instance;
  }

  private seedInitialTelemetry(): void {
    const { dlqItem, busEntry } = createSeedDlqEntries();
    this.dlqMessages = [dlqItem];
    eventBus.seedInitialDlq(busEntry);

    this.emitLog('BROKER', 'INFO', 'RabbitMQ-Cluster', 'RabbitMQ AMQP Broker connected. Exchanges: [cyberrig.orders, cyberrig.dlx]');
    this.emitLog('HEALTH', 'INFO', 'DockerRuntime', 'Health probes initialized for 4 core containers.');
    this.emitLog('SCENARIO', 'INFO', 'ScenarioEngine', 'Interactive Integration Testing Lab online and ready.');
  }

  private wireEventBus(): void {
    eventBus.configureMode(config.integration.rabbitmqMgmtUrl);
    eventBus.onActivity((entry) => {
      this.syncBusMetrics();
      this.syncBusDlqEntries();
      this.emitLog(entry.channel, entry.level, entry.source, entry.message, entry.metadata);
    });
  }

  private syncBusMetrics(): void {
    const status = eventBus.getStatus();
    const ready = status.queues.reduce((sum, q) => sum + q.readyMessages, 0);
    this.brokerState.totalMessagesPublished = this.basePublished + status.metrics.published;
    this.brokerState.totalMessagesProcessed = this.baseProcessed + status.metrics.processed;
    this.brokerState.readyMessages = Math.max(0, 6 + ready);
    this.brokerState.messagesInQueue = this.brokerState.readyMessages + this.brokerState.unacknowledgedMessages;
    this.brokerState.consumersConnected = Math.max(3, status.queues.length);
    this.brokerState.channelStatus = status.online ? 'ACTIVE' : 'THROTTLED';
  }

  private syncBusDlqEntries(): void {
    const existingIds = new Set(this.dlqMessages.map((m) => m.id));
    for (const entry of eventBus.getDlqMessages()) {
      if (!existingIds.has(entry.id)) {
        const mapped = mapBusEntryToDlqMessage(entry);
        this.dlqMessages.unshift(mapped);
        this.broadcast('dlq:new', mapped);
      }
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(async () => {
      if (this.sseClients.size === 0) return;
      const variance = Math.floor(Math.random() * 5) - 2;
      this.brokerState.currentThroughputRps = Math.max(12, 25 + variance);
      const snapshot = await this.getTelemetrySnapshot();
      this.broadcast('telemetry:tick', snapshot);
    }, 3000);

    if (this.heartbeatInterval.unref) {
      this.heartbeatInterval.unref();
    }
  }

  public emitLog(
    channel: LogChannel,
    level: LogLevel,
    source: string,
    message: string,
    metadata?: Record<string, unknown>
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

  public registerSseClient(res: Response): void {
    this.sseClients.add(res);
    this.getTelemetrySnapshot().then((snapshot) => {
      res.write(`event: telemetry:init\ndata: ${JSON.stringify(snapshot)}\n\n`);
    });
    res.on('close', () => {
      this.sseClients.delete(res);
    });
  }

  public broadcast(eventType: string, data: unknown): void {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.sseClients) {
      try {
        client.write(payload);
      } catch {
        this.sseClients.delete(client);
      }
    }
  }

  public async getTelemetrySnapshot(): Promise<SystemTelemetrySnapshot> {
    this.syncBusMetrics();
    this.syncBusDlqEntries();

    const containers = await probeCoreContainers(this.startTime);
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

  public recordMessagePublished(count = 1): void {
    this.basePublished += count;
    this.syncBusMetrics();
  }

  public recordMessageProcessed(count = 1): void {
    this.baseProcessed += count;
    this.syncBusMetrics();
  }

  public addDlqMessage(
    queueName: string,
    exchange: string,
    routingKey: string,
    payload: Record<string, unknown>,
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
    this.syncBusDlqEntries();
    return this.dlqMessages;
  }

  /**
   * Synchronously marks DLQ item as REPLAYED and triggers async Event Bus redelivery.
   */
  public replayDlqMessage(id: string): boolean {
    this.syncBusDlqEntries();
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
    void eventBus.replayDlqMessage(id).catch(() => undefined);
    return true;
  }

  public clearDlq(): void {
    this.dlqMessages = [];
    eventBus.clearDlq();
    this.emitLog('DLQ', 'WARN', 'DLQ-Inspector', 'All Dead Letter Queue messages discarded by operator.');
    this.broadcast('dlq:cleared', {});
  }
}

export const telemetryService = TelemetryService.getInstance();
