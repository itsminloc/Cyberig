/**
 * CyberRig Database Client Interface & Lifecycle
 * Encapsulates PostgreSQL Pool connection logic, fast-fail circuit breaker, and health diagnostics.
 */

import { Pool, QueryResultRow } from 'pg';
import { config } from './config';

export interface DatabaseHealthCheckResult {
  status: 'healthy' | 'unhealthy';
  latencyMs: number;
  timestamp: Date;
  database?: string;
  serverVersion?: string;
  error?: string;
}

export interface DatabaseClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  query<T extends QueryResultRow = QueryResultRow>(sql: string, params?: unknown[]): Promise<T[]>;
  ping(): Promise<boolean>;
  healthCheck(): Promise<DatabaseHealthCheckResult>;
}

const CIRCUIT_COOLDOWN_MS = 10_000;

function isConnectionFailure(err: unknown): boolean {
  const msg = String((err as Error)?.message || err || '').toLowerCase();
  const code = String((err as { code?: string })?.code || '');
  return (
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'ENOTFOUND' ||
    code === '57P01' ||
    msg.includes('econnrefused') ||
    msg.includes('connection timeout') ||
    msg.includes('connection terminated') ||
    msg.includes('timeout expired')
  );
}

class PostgresDatabaseClient implements DatabaseClient {
  private pool: Pool | null = null;
  private connected = false;
  private unreachableUntil = 0;

  private getPool(): Pool {
    if (!this.pool) {
      this.pool = new Pool({
        connectionString: config.database.url,
        connectionTimeoutMillis: 1200,
        idleTimeoutMillis: 10000,
        allowExitOnIdle: true,
        max: 10,
      });

      this.pool.on('error', (err) => {
        console.error('[Database Pool Error]:', err.message);
        this.connected = false;
      });
    }
    return this.pool;
  }

  async connect(): Promise<void> {
    const pool = this.getPool();
    const client = await pool.connect();
    try {
      this.connected = true;
      this.unreachableUntil = 0;
      console.log(`[Database] Successfully connected to ${config.database.url.replace(/:[^:@]+@/, ':****@')}`);
    } finally {
      client.release();
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.connected = false;
      this.unreachableUntil = 0;
      console.log('[Database] Disconnected pool successfully.');
    }
  }

  isConnected(): boolean {
    return this.connected && Date.now() >= this.unreachableUntil;
  }

  async query<T extends QueryResultRow = QueryResultRow>(sql: string, params?: unknown[]): Promise<T[]> {
    if (Date.now() < this.unreachableUntil) {
      const fastErr = new Error('ECONNREFUSED: Database circuit breaker open') as Error & { code?: string };
      fastErr.code = 'ECONNREFUSED';
      throw fastErr;
    }
    try {
      const pool = this.getPool();
      const res = await pool.query<T>(sql, params);
      this.connected = true;
      this.unreachableUntil = 0;
      return res.rows;
    } catch (err) {
      if (isConnectionFailure(err)) {
        this.connected = false;
        this.unreachableUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
      }
      throw err;
    }
  }

  async ping(): Promise<boolean> {
    try {
      const result = await this.healthCheck();
      return result.status === 'healthy';
    } catch {
      return false;
    }
  }

  async healthCheck(): Promise<DatabaseHealthCheckResult> {
    const start = Date.now();
    try {
      const pool = this.getPool();
      const res = await pool.query<{
        server_version: string;
        current_db: string;
      }>('SELECT version() AS server_version, current_database() AS current_db;');
      const latencyMs = Date.now() - start;
      this.connected = true;
      this.unreachableUntil = 0;

      const row = res.rows[0];
      return {
        status: 'healthy',
        latencyMs,
        timestamp: new Date(),
        database: row?.current_db,
        serverVersion: row?.server_version?.split(' ')?.[1] || row?.server_version,
      };
    } catch (err) {
      const latencyMs = Date.now() - start;
      this.connected = false;
      this.unreachableUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
      const error = err as Error & { code?: string };
      const errorMsg = error?.message || error?.code || String(err);
      return {
        status: 'unhealthy',
        latencyMs,
        timestamp: new Date(),
        error: errorMsg || 'Connection refused (ECONNREFUSED) - Server not reachable',
      };
    }
  }
}

export const db: DatabaseClient = new PostgresDatabaseClient();
export default db;
