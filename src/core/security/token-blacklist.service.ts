/**
 * JWT Access Token Revocation Blacklist Service
 * Provides instant revocation of logged-out Access Tokens via `jti`
 * with O(1) synchronous hot-path lookup + Redis persistence.
 */

import { redis, RedisClient } from '../redis';

const BLACKLIST_PREFIX = 'auth:blacklist:';

export class TokenBlacklistService {
  // Local O(1) mirror: jti -> expiresAtMs
  private revokedMap: Map<string, number> = new Map();

  constructor(private readonly redisClient: RedisClient = redis) {}

  /**
   * Revokes a JWT `jti` until its natural expiration (`ttlSeconds`).
   */
  async revoke(jti: string, ttlSeconds: number): Promise<void> {
    if (!jti) return;
    const safeTtl = Math.max(1, Math.ceil(ttlSeconds));
    this.revokedMap.set(jti, Date.now() + safeTtl * 1000);
    await this.redisClient.set(`${BLACKLIST_PREFIX}${jti}`, '1', safeTtl);
  }

  /**
   * Synchronous O(1) check for hot-path auth middleware.
   */
  isRevokedSync(jti?: string): boolean {
    if (!jti) return false;
    const exp = this.revokedMap.get(jti);
    if (!exp) return false;
    if (Date.now() > exp) {
      this.revokedMap.delete(jti);
      return false;
    }
    return true;
  }

  /**
   * Full distributed check (local cache + Redis).
   */
  async isRevoked(jti?: string): Promise<boolean> {
    if (!jti) return false;
    if (this.isRevokedSync(jti)) return true;
    const val = await this.redisClient.get(`${BLACKLIST_PREFIX}${jti}`);
    return val === '1';
  }

  /**
   * Clears local revocation cache (used in test isolation).
   */
  clearLocal(): void {
    this.revokedMap.clear();
  }
}

export const tokenBlacklistService = new TokenBlacklistService();
export default tokenBlacklistService;
