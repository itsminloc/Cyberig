/**
 * CyberRig Redis Client & Stock Reservation Engine
 * Provides atomic stock reservations with TTL, rollback capabilities, and fallback simulation.
 * Aligned with Task BE-09 specification.
 */

import Redis from 'ioredis';
import { config } from './config';

export interface RedisStockReservationClient {
  reserveStock(
    hardwareId: string,
    quantity: number,
    maxStock: number,
    ttlSeconds?: number
  ): Promise<boolean>;
  rollbackReservations(
    reservations: Array<{ hardwareId: string; quantity: number }>
  ): Promise<void>;
  releaseReservation(hardwareId: string, quantity: number): Promise<void>;
  getReservedStock(hardwareId: string): Promise<number>;
  flushTestData(): Promise<void>;
  ping(): Promise<boolean>;
  disconnect(): Promise<void>;
}

const LUA_RESERVE_STOCK = `
local current = tonumber(redis.call('get', KEYS[1]) or '0')
local requested = tonumber(ARGV[1])
local maxStock = tonumber(ARGV[2])
local ttl = tonumber(ARGV[3])
if (current + requested) <= maxStock then
  local newReserved = current + requested
  redis.call('set', KEYS[1], tostring(newReserved), 'EX', ttl)
  return 1
else
  return 0
end
`;

const LUA_RELEASE_STOCK = `
local current = tonumber(redis.call('get', KEYS[1]) or '0')
local release = tonumber(ARGV[1])
if current > 0 then
  local remaining = math.max(0, current - release)
  if remaining > 0 then
    redis.call('set', KEYS[1], tostring(remaining), 'KEEPTTL')
  else
    redis.call('del', KEYS[1])
  end
end
return 1
`;

const LUA_RATE_LIMIT = `
local current = redis.call('incr', KEYS[1])
if current == 1 then
  redis.call('expire', KEYS[1], tonumber(ARGV[1]))
end
local ttl = redis.call('ttl', KEYS[1])
return {current, ttl}
`;

export class RedisClient implements RedisStockReservationClient {
  private client: Redis | null = null;
  private isConnected = false;
  private useMemoryFallback = false;

  // In-memory fallback map: key -> { reserved: number, expiresAt: number }
  private memoryStore: Map<string, { reserved: number; expiresAt: number }> =
    new Map();

  // In-memory rate limiter store: key -> { count: number, expiresAt: number }
  private rateLimitStore: Map<string, { count: number; expiresAt: number }> =
    new Map();

  // In-memory key-value store (e.g. auth refresh tokens)
  private keyValueStore: Map<string, { value: string; expiresAt: number }> =
    new Map();

  constructor(private readonly redisUrl: string = config.cache.redisUrl) {}

  private getRedis(): Redis {
    if (!this.client) {
      this.client = new Redis(this.redisUrl, {
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // Do not endlessly retry if server is offline
        lazyConnect: true,
      });

      this.client.on('error', (err) => {
        // Fallback to memory store if redis container is not running
        this.isConnected = false;
        this.useMemoryFallback = true;
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.useMemoryFallback = false;
        if (process.env.NODE_ENV === 'test' || process.execArgv.includes('--test') || process.argv.includes('--test')) {
          (this.client as unknown as { stream?: { unref?: () => void } })?.stream?.unref?.();
        }
      });
    }
    return this.client;
  }

  private getKey(hardwareId: string): string {
    return `stock:reserved:${hardwareId}`;
  }

  /**
   * Ping redis server. Returns true if healthy, false if offline.
   */
  async ping(): Promise<boolean> {
    try {
      const redis = this.getRedis();
      if (!this.isConnected) {
        await redis.connect().catch(() => {});
      }
      const pong = await redis.ping();
      this.isConnected = pong === 'PONG';
      this.useMemoryFallback = !this.isConnected;
      return this.isConnected;
    } catch {
      this.isConnected = false;
      this.useMemoryFallback = true;
      return false;
    }
  }

  /**
   * Closes redis connection.
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit().catch(() => {});
      } finally {
        this.client = null;
        this.isConnected = false;
      }
    }
  }

  /**
   * Atomically reserves stock using Lua script with TTL (default 15 minutes = 900s).
   * Ensures reserved_stock + requested_quantity <= stock_quantity.
   */
  async reserveStock(
    hardwareId: string,
    quantity: number,
    maxStock: number,
    ttlSeconds = 900
  ): Promise<boolean> {
    const key = this.getKey(hardwareId);

    // Try Redis first
    if (!this.useMemoryFallback) {
      try {
        const redis = this.getRedis();
        if (!this.isConnected) {
          await redis.connect().catch(() => {});
        }
        const result = (await redis.eval(
          LUA_RESERVE_STOCK,
          1,
          key,
          quantity.toString(),
          maxStock.toString(),
          ttlSeconds.toString()
        )) as number;

        return result === 1;
      } catch {
        this.useMemoryFallback = true;
      }
    }

    // Memory Fallback
    const now = Date.now();
    const entry = this.memoryStore.get(key);
    let current = 0;
    if (entry && entry.expiresAt > now) {
      current = entry.reserved;
    }

    if (current + quantity <= maxStock) {
      this.memoryStore.set(key, {
        reserved: current + quantity,
        expiresAt: now + ttlSeconds * 1000,
      });
      return true;
    }
    return false;
  }

  /**
   * Releases stock reservation for a specific item (e.g. after order confirm or cancel).
   */
  async releaseReservation(hardwareId: string, quantity: number): Promise<void> {
    const key = this.getKey(hardwareId);

    if (!this.useMemoryFallback) {
      try {
        const redis = this.getRedis();
        if (!this.isConnected) {
          await redis.connect().catch(() => {});
        }
        await redis.eval(LUA_RELEASE_STOCK, 1, key, quantity.toString());
        return;
      } catch {
        this.useMemoryFallback = true;
      }
    }

    // Memory fallback
    const now = Date.now();
    const entry = this.memoryStore.get(key);
    if (entry && entry.expiresAt > now) {
      const remaining = Math.max(0, entry.reserved - quantity);
      if (remaining > 0) {
        this.memoryStore.set(key, {
          reserved: remaining,
          expiresAt: entry.expiresAt,
        });
      } else {
        this.memoryStore.delete(key);
      }
    }
  }

  /**
   * Rollback a list of reserved items (e.g. when an order item fails stock check).
   */
  async rollbackReservations(
    reservations: Array<{ hardwareId: string; quantity: number }>
  ): Promise<void> {
    for (const r of reservations) {
      await this.releaseReservation(r.hardwareId, r.quantity);
    }
  }

  /**
   * Gets current reserved quantity for a hardware ID.
   */
  async getReservedStock(hardwareId: string): Promise<number> {
    const key = this.getKey(hardwareId);

    if (!this.useMemoryFallback) {
      try {
        const redis = this.getRedis();
        if (!this.isConnected) {
          await redis.connect().catch(() => {});
        }
        const val = await redis.get(key);
        return val ? parseInt(val, 10) : 0;
      } catch {
        this.useMemoryFallback = true;
      }
    }

    const now = Date.now();
    const entry = this.memoryStore.get(key);
    if (entry && entry.expiresAt > now) {
      return entry.reserved;
    }
    return 0;
  }

  /**
   * Atomic rate limiter increment with sliding window/TTL.
   * Returns current count and remaining TTL in seconds.
   */
  async incrementRateLimit(
    key: string,
    windowSec: number
  ): Promise<{ count: number; ttl: number }> {
    if (!this.useMemoryFallback) {
      try {
        const redis = this.getRedis();
        if (!this.isConnected) {
          await redis.connect().catch(() => {});
        }
        const result = (await redis.eval(
          LUA_RATE_LIMIT,
          1,
          key,
          windowSec.toString()
        )) as [number, number];

        if (Array.isArray(result) && result.length === 2) {
          return {
            count: Number(result[0]),
            ttl: Number(result[1]) > 0 ? Number(result[1]) : windowSec,
          };
        }
      } catch {
        this.useMemoryFallback = true;
      }
    }

    // Memory Fallback
    const now = Date.now();
    const entry = this.rateLimitStore.get(key);

    if (!entry || entry.expiresAt <= now) {
      // First request in new window
      this.rateLimitStore.set(key, {
        count: 1,
        expiresAt: now + windowSec * 1000,
      });
      return { count: 1, ttl: windowSec };
    }

    // Subsequent request in window
    entry.count += 1;
    const remainingTtl = Math.max(1, Math.ceil((entry.expiresAt - now) / 1000));
    return { count: entry.count, ttl: remainingTtl };
  }

  /**
   * Flushes rate limit test data specifically.
   */
  async flushRateLimits(): Promise<void> {
    this.rateLimitStore.clear();

    if (this.client && this.isConnected) {
      try {
        const keys = await this.client.keys('rl:*');
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } catch {}
    }
  }

  /**
   * Sets key-value with optional TTL in seconds.
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.useMemoryFallback) {
      try {
        const redis = this.getRedis();
        if (!this.isConnected) {
          await redis.connect().catch(() => {});
        }
        if (ttlSeconds && ttlSeconds > 0) {
          await redis.set(key, value, 'EX', ttlSeconds);
        } else {
          await redis.set(key, value);
        }
        return;
      } catch {
        this.useMemoryFallback = true;
      }
    }

    const now = Date.now();
    const expiresAt = ttlSeconds && ttlSeconds > 0 ? now + ttlSeconds * 1000 : Infinity;
    this.keyValueStore.set(key, { value, expiresAt });
  }

  /**
   * Gets string value by key. Returns null if missing or expired.
   */
  async get(key: string): Promise<string | null> {
    if (!this.useMemoryFallback) {
      try {
        const redis = this.getRedis();
        if (!this.isConnected) {
          await redis.connect().catch(() => {});
        }
        return await redis.get(key);
      } catch {
        this.useMemoryFallback = true;
      }
    }

    const entry = this.keyValueStore.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.keyValueStore.delete(key);
      return null;
    }
    return entry.value;
  }

  /**
   * Deletes a key.
   */
  async del(key: string): Promise<void> {
    if (!this.useMemoryFallback) {
      try {
        const redis = this.getRedis();
        if (!this.isConnected) {
          await redis.connect().catch(() => {});
        }
        await redis.del(key);
        return;
      } catch {
        this.useMemoryFallback = true;
      }
    }

    this.keyValueStore.delete(key);
  }

  /**
   * Flushes temporary reservation and rate limit test data.
   */
  async flushTestData(): Promise<void> {
    this.memoryStore.clear();
    this.rateLimitStore.clear();
    this.keyValueStore.clear();

    if (!this.useMemoryFallback) {
      try {
        const redis = this.getRedis();
        if (!this.isConnected) {
          await redis.connect().catch(() => {});
        }
        if (this.isConnected) {
          const stockKeys = await redis.keys('stock:reserved:*');
          const rlKeys = await redis.keys('rl:*');
          const authKeys = await redis.keys('auth:*');
          const allKeys = [...stockKeys, ...rlKeys, ...authKeys];
          if (allKeys.length > 0) {
            await redis.del(...allKeys);
          }
        }
      } catch {}
    }
  }
}

export const redis: RedisClient = new RedisClient();
export default redis;

