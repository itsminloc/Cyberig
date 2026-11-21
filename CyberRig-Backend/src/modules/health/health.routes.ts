/**
 * CyberRig Healthcheck Route Module
 * Provides GET /healthz and GET /api/healthz endpoint checking Postgres & Redis connectivity.
 * Aligned with Task DEVOPS-01 specification.
 */

import { Router, Request, Response } from 'express';
import db from '../../core/db';
import redis from '../../core/redis';

export const healthRouter = Router();

export interface HealthCheckResponse {
  status: 'ok' | 'degraded';
  db: 'up' | 'down';
  redis: 'up' | 'down';
  uptime: number;
  timestamp: string;
}

/**
 * Core health check handler
 */
export async function handleHealthCheck(_req: Request, res: Response): Promise<void> {
  let dbStatus: 'up' | 'down' = 'down';
  let redisStatus: 'up' | 'down' = 'down';

  // 1. Check PostgreSQL connectivity
  try {
    await db.query('SELECT 1;');
    dbStatus = 'up';
  } catch {
    dbStatus = 'down';
  }

  // 2. Check Redis connectivity
  try {
    const isRedisHealthy = await redis.ping();
    redisStatus = isRedisHealthy ? 'up' : 'down';
  } catch {
    redisStatus = 'down';
  }

  const isHealthy = dbStatus === 'up' && redisStatus === 'up';
  const statusCode = isHealthy ? 200 : 503;

  const payload: HealthCheckResponse = {
    status: isHealthy ? 'ok' : 'degraded',
    db: dbStatus,
    redis: redisStatus,
    uptime: Math.round(process.uptime() * 100) / 100,
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(payload);
}

// Mount both root /healthz and /api/healthz for flexibility
healthRouter.get('/healthz', handleHealthCheck);
healthRouter.get('/api/healthz', handleHealthCheck);

export default healthRouter;
