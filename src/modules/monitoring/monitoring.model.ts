/**
 * SI Monitoring & Testing Dashboard Data Models
 * Defines schemas for Telemetry, Container Health, Broker Metrics,
 * Dead Letter Queue (DLQ), Event Logging, and 6 Integration Scenarios.
 */

export type ContainerStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'STARTING';

export interface ContainerHealth {
  id: string;
  name: string;
  role: string;
  port: number;
  status: ContainerStatus;
  uptimeSeconds: number;
  latencyMs: number;
  memoryUsageMb: number;
  lastCheckedAt: string;
}

export interface BrokerMetrics {
  brokerType: 'RabbitMQ' | 'In-Memory AMQP Bridge';
  totalMessagesPublished: number;
  totalMessagesProcessed: number;
  messagesInQueue: number;
  readyMessages: number;
  unacknowledgedMessages: number;
  consumersConnected: number;
  channelStatus: 'ACTIVE' | 'IDLE' | 'THROTTLED';
  currentThroughputRps: number;
}

export interface DlqMessage {
  id: string;
  queueName: string;
  originalExchange: string;
  originalRoutingKey: string;
  payload: Record<string, any>;
  errorMessage: string;
  failureReason: 'SCHEMA_VALIDATION_FAILED' | 'CONSUMER_TIMEOUT' | 'STOCK_LOCK_REJECTED' | 'UNHANDLED_EXCEPTION';
  retryCount: number;
  maxRetries: number;
  rejectedAt: string;
  status: 'PENDING_INSPECTION' | 'REPLAYED' | 'DISCARDED';
}

export type ScenarioId =
  | 'scenario-1-order-placement'
  | 'scenario-2-stock-check'
  | 'scenario-3-trigger-dlq'
  | 'scenario-4-ai-mapping'
  | 'scenario-5-rate-limiting'
  | 'scenario-6-system-health';

export interface ScenarioDefinition {
  id: ScenarioId;
  name: string;
  category: 'PIPELINE' | 'CONCURRENCY' | 'RESILIENCE' | 'AI_ENGINE' | 'SECURITY' | 'DIAGNOSTIC';
  description: string;
  expectedOutcome: string;
}

export interface ScenarioExecutionResult {
  scenarioId: ScenarioId;
  scenarioName: string;
  status: 'PASSED' | 'FAILED' | 'PARTIALLY_PASSED';
  executionTimeMs: number;
  triggeredAt: string;
  triggeredBy: string;
  steps: {
    stepNumber: number;
    stepName: string;
    status: 'SUCCESS' | 'WARN' | 'ERROR';
    durationMs: number;
    details: string;
  }[];
  summary: string;
  outputPayload?: Record<string, any>;
}

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS' | 'DEBUG';
export type LogChannel = 'ALL' | 'BROKER' | 'DLQ' | 'SCENARIO' | 'HEALTH' | 'SECURITY';

export interface LogEvent {
  id: string;
  timestamp: string;
  channel: LogChannel;
  level: LogLevel;
  source: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface SystemTelemetrySnapshot {
  systemUptimeSeconds: number;
  serverTimestamp: string;
  activeMode: 'REALTIME_MONITORING' | 'SCENARIO_TESTING';
  containers: ContainerHealth[];
  broker: BrokerMetrics;
  dlq: {
    totalDeadLetters: number;
    pendingInspection: number;
    replayedCount: number;
    recentMessages: DlqMessage[];
  };
  traffic: {
    requestsPerSecond: number;
    p95LatencyMs: number;
    errorRatePercentage: number;
  };
  recentLogs: LogEvent[];
}
