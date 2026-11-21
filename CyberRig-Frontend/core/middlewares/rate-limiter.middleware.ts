/**
 * Redis-backed Rate Limiter Middleware
 * Protects endpoints from abuse, brute-force, and stock-reservation spamming.
 * Aligned with Task BE-10 specification.
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { redis } from '../redis';

export interface RateLimiterOptions {
  windowSec: number;
  maxRequests: number;
  keyPrefix: string;
}

/**
 * Creates an Express rate-limiting middleware using Redis atomic sliding-window counter.
 */
export function createRateLimiter(options: {
  windowSec: number;
  maxRequests: number;
  keyPrefix: string;
}): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. Identify client IP
      const forwarded = req.headers['x-forwarded-for'];
      const clientIp = typeof forwarded === 'string'
        ? forwarded.split(',')[0].trim()
        : req.ip || req.socket.remoteAddress || '127.0.0.1';

      const key = `${options.keyPrefix}:${clientIp}`;

      // 2. Increment atomic counter in Redis / memory fallback
      const { count, ttl } = await redis.incrementRateLimit(key, options.windowSec);
      const remaining = Math.max(0, options.maxRequests - count);

      // 3. Set standard RFC rate limit headers
      res.setHeader('RateLimit-Limit', options.maxRequests);
      res.setHeader('RateLimit-Remaining', remaining);

      // 4. Check if limit exceeded
      if (count > options.maxRequests) {
        res.setHeader('Retry-After', ttl > 0 ? ttl : options.windowSec);
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Quá nhiều yêu cầu từ IP của bạn. Vui lòng thử lại sau.',
          },
        });
        return;
      }

      next();
    } catch (err) {
      // On internal rate limiter error, fail-open to avoid blocking valid traffic
      console.error('[RateLimiter Error]:', err);
      next();
    }
  };
}

/**
 * 1. Đặt hàng PC Builder (POST /api/orders): Tối đa 5 requests / phút (chống spam giữ kho Redis)
 */
export const orderRateLimiter = createRateLimiter({
  windowSec: 60,
  maxRequests: 5,
  keyPrefix: 'rl:orders:create',
});

/**
 * 2. Tra cứu phiếu sửa chữa (GET /api/tickets/:id*): Tối đa 30 requests / phút (tránh brute-force)
 */
export const ticketLookupRateLimiter = createRateLimiter({
  windowSec: 60,
  maxRequests: 30,
  keyPrefix: 'rl:tickets:lookup',
});

/**
 * 3. Danh mục phần cứng (GET /api/hardware): Tối đa 120 requests / phút
 */
export const hardwareRateLimiter = createRateLimiter({
  windowSec: 60,
  maxRequests: 120,
  keyPrefix: 'rl:hardware:list',
});

export default createRateLimiter;
