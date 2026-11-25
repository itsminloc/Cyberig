/**
 * Distributed Request Tracing & Structured Service Logger (SE445 Case Study 01/02)
 * Propagates X-Correlation-ID / X-Request-ID across gateway, controllers, and event envelopes.
 */

import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

export interface StructuredLogEntry {
  timestamp: string;
  service: string;
  correlationId: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  meta?: Record<string, unknown>;
}

/**
 * Attaches and echoes X-Correlation-ID for end-to-end distributed request tracing.
 */
export function correlationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incomingCorrelation = req.headers['x-correlation-id'];
  const incomingRequest = req.headers['x-request-id'];
  const raw =
    (typeof incomingCorrelation === 'string' ? incomingCorrelation : '') ||
    (typeof incomingRequest === 'string' ? incomingRequest : '');

  const clean = raw.trim().slice(0, 128);
  const correlationId = clean.length > 0 ? clean : `req-${crypto.randomUUID()}`;

  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
}

export class ServiceLogger {
  constructor(private readonly serviceName: string) {}

  private emit(
    level: StructuredLogEntry['level'],
    message: string,
    correlationId = 'system',
    meta?: Record<string, unknown>
  ): void {
    if (process.env.NODE_ENV === 'test' && level !== 'ERROR') return;
    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      correlationId,
      level,
      message,
      ...(meta ? { meta } : {}),
    };
    const serialized = JSON.stringify(entry);
    if (level === 'ERROR') console.error(serialized);
    else console.log(serialized);
  }

  info(message: string, correlationId?: string, meta?: Record<string, unknown>): void {
    this.emit('INFO', message, correlationId, meta);
  }

  warn(message: string, correlationId?: string, meta?: Record<string, unknown>): void {
    this.emit('WARN', message, correlationId, meta);
  }

  error(message: string, correlationId?: string, meta?: Record<string, unknown>): void {
    this.emit('ERROR', message, correlationId, meta);
  }

  debug(message: string, correlationId?: string, meta?: Record<string, unknown>): void {
    this.emit('DEBUG', message, correlationId, meta);
  }
}

export function createLogger(serviceName: string): ServiceLogger {
  return new ServiceLogger(serviceName);
}
