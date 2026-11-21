/**
 * CyberRig Database Client Interface & Lifecycle
 * Encapsulates PostgreSQL Pool connection logic, querying, and health-check diagnostics.
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

class PostgresDatabaseClient implements DatabaseClient {
  private pool: Pool | null = null;
  private connected = false;

  private getPool(): Pool {
    if (!this.pool) {
      this.pool = new Pool({
        connectionString: config.database.url,
        connectionTimeoutMillis: 5000,
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

  /**
   * Initializes and establishes connection to PostgreSQL.
   */
  async connect(): Promise<void> {
    const pool = this.getPool();
    const client = await pool.connect();
    try {
      this.connected = true;
      console.log(`[Database] Successfully connected to ${config.database.url.replace(/:[^:@]+@/, ':****@')}`);
    } finally {
      client.release();
    }
  }

  /**
   * Closes all active connections in the pool.
   */
  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.connected = false;
      console.log('[Database] Disconnected pool successfully.');
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Executes a parameterized SQL query.
   */
  async query<T extends QueryResultRow = QueryResultRow>(sql: string, params?: unknown[]): Promise<T[]> {
    const pool = this.getPool();
    const res = await pool.query<T>(sql, params);
    this.connected = true;
    return res.rows;
  }

  /**
   * Performs a lightweight ping check.
   * Returns true if database responds within timeout, false otherwise.
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.healthCheck();
      return result.status === 'healthy';
    } catch {
      return false;
    }
  }

  /**
   * Detailed health check diagnostics with measured latency (round-trip time in ms).
   */
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

// Run standalone health check when executed directly via CLI
if (process.argv[1]?.includes('db.ts')) {
  (async () => {
    console.log('----------------------------------------------------');
    console.log('[CyberRig Diagnostics] Testing Database Connection...');
    console.log(`[Target URL]: ${config.database.url.replace(/:[^:@]+@/, ':****@')}`);
    console.log('----------------------------------------------------');

    const result = await db.healthCheck();
    if (result.status === 'healthy') {
      console.log('✅ DATABASE STATUS: HEALTHY');
      console.log(`⏱️  Latency: ${result.latencyMs}ms`);
      console.log(`📦 Database: ${result.database}`);
      console.log(`🏷️  Server Version: ${result.serverVersion}`);
    } else {
      console.log('❌ DATABASE STATUS: UNHEALTHY');
      console.log(`⏱️  Attempt Latency: ${result.latencyMs}ms`);
      console.log(`⚠️  Error Details: ${result.error}`);
      console.log('\n💡 Hint: Have you started the local containers?');
      console.log('👉 Run: docker compose -f docker-compose.dev.yml up -d');
    }
    console.log('----------------------------------------------------');
    await db.disconnect();
    process.exit(result.status === 'healthy' ? 0 : 1);
  })();
}
