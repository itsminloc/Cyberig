/**
 * Immutable Append-Only Security Audit Log Service
 * Records sensitive security, RBAC, inventory, and payment events to PostgreSQL (`audit_logs`)
 * with an in-memory ring buffer fallback and live forwarding to SI Monitoring SOC.
 */

import { randomUUID } from 'node:crypto';
import { db, DatabaseClient } from '../db';
import { telemetryService } from '../../modules/monitoring/telemetry.service';
import { LogLevel } from '../../modules/monitoring/monitoring.model';

export type AuditSeverity = 'INFO' | 'WARN' | 'CRITICAL';

export type AuditEventType =
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILED'
  | 'AUTH_ACCOUNT_LOCKED'
  | 'AUTH_LOGOUT'
  | 'TOKEN_REUSE_DETECTED'
  | 'MFA_ENABLED'
  | 'MFA_DISABLED'
  | 'ADMIN_HARDWARE_CREATE'
  | 'ADMIN_STOCK_UPDATE'
  | 'ADMIN_HARDWARE_DELETE'
  | 'ORDER_CONFIRMED'
  | 'ORDER_CANCELLED'
  | 'IDOR_BLOCKED'
  | 'WEBHOOK_AUTH_FAILED'
  | 'MONITORING_SCENARIO_RUN'
  | 'MONITORING_DLQ_REPLAY'
  | 'MONITORING_DLQ_CLEAR'
  | 'SECURITY_ACCESS_DENIED';

export interface AuditLogEntry {
  id: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  actorId: string | null;
  actorRole: string;
  actorEmail?: string | null;
  ipAddress: string;
  resourceType: string;
  resourceId?: string | null;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface RecordAuditInput {
  eventType: AuditEventType;
  severity?: AuditSeverity;
  actorId?: string | null;
  actorRole?: string;
  actorEmail?: string | null;
  ipAddress?: string;
  resourceType: string;
  resourceId?: string | null;
  message: string;
  metadata?: Record<string, unknown>;
}

export const AUDIT_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(64) NOT NULL,
    severity VARCHAR(16) NOT NULL DEFAULT 'INFO',
    actor_id VARCHAR(100),
    actor_role VARCHAR(32) NOT NULL DEFAULT 'GUEST',
    actor_email VARCHAR(255),
    ip_address VARCHAR(64) NOT NULL DEFAULT 'unknown',
    resource_type VARCHAR(64) NOT NULL,
    resource_id VARCHAR(128),
    message TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
`;

const MAX_MEMORY_AUDITS = 300;

export class AuditLogService {
  private memoryLogs: AuditLogEntry[] = [];

  constructor(private readonly dbClient: DatabaseClient = db) {}

  /**
   * Appends an immutable audit record and forwards security telemetry to SOC.
   */
  async record(input: RecordAuditInput): Promise<AuditLogEntry> {
    const entry: AuditLogEntry = {
      id: randomUUID(),
      eventType: input.eventType,
      severity: input.severity || 'INFO',
      actorId: input.actorId || null,
      actorRole: input.actorRole || 'GUEST',
      actorEmail: input.actorEmail || null,
      ipAddress: input.ipAddress || 'unknown',
      resourceType: input.resourceType,
      resourceId: input.resourceId || null,
      message: input.message,
      metadata: input.metadata || {},
      createdAt: new Date().toISOString(),
    };

    // 1. Append to in-memory ring buffer
    this.memoryLogs.unshift(entry);
    if (this.memoryLogs.length > MAX_MEMORY_AUDITS) {
      this.memoryLogs.pop();
    }

    // 2. Forward live signal into SI Monitoring SOC SECURITY channel
    const logLevel: LogLevel =
      entry.severity === 'CRITICAL' ? 'ERROR' : entry.severity === 'WARN' ? 'WARN' : 'INFO';
    telemetryService.emitLog(
      'SECURITY',
      logLevel,
      `Audit:${entry.eventType}`,
      `[${entry.actorRole}${entry.actorEmail ? `:${entry.actorEmail}` : ''}] ${entry.message}`,
      {
        auditId: entry.id,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        ipAddress: entry.ipAddress,
        ...entry.metadata,
      }
    );

    // 3. Best-effort append to PostgreSQL (non-blocking if offline / schema not yet seeded)
    try {
      await this.dbClient.query(
        `INSERT INTO audit_logs (
          id, event_type, severity, actor_id, actor_role, actor_email,
          ip_address, resource_type, resource_id, message, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`,
        [
          entry.id,
          entry.eventType,
          entry.severity,
          entry.actorId,
          entry.actorRole,
          entry.actorEmail,
          entry.ipAddress,
          entry.resourceType,
          entry.resourceId,
          entry.message,
          JSON.stringify(entry.metadata || {}),
          entry.createdAt,
        ]
      );
    } catch {
      // Fallback to in-memory audit buffer when DB is offline or table absent
    }

    return entry;
  }

  /**
   * Retrieves recent audit logs for Admin SOC inspection.
   */
  async listRecent(limit = 50, eventType?: string): Promise<AuditLogEntry[]> {
    const safeLimit = Math.min(Math.max(1, limit), 200);
    const filtered = eventType
      ? this.memoryLogs.filter((l) => l.eventType === eventType)
      : this.memoryLogs;
    return filtered.slice(0, safeLimit);
  }

  clearMemory(): void {
    this.memoryLogs = [];
  }
}

export const auditLogService = new AuditLogService();
export default auditLogService;
