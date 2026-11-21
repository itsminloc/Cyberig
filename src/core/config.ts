/**
 * CyberRig Core Configuration Module
 * Loads and validates environment variables.
 */

import 'dotenv/config';

export interface AppConfig {
  env: 'development' | 'production' | 'test';
  port: number;
  appName: string;
  apiPrefix: string;
  database: {
    url: string;
  };
  cache: {
    redisUrl: string;
  };
  security: {
    jwtSecret: string;
    jwtRefreshSecret: string;
    jwtExpiresIn: string;
    webhookSecret: string;
    bcryptRounds: number;
    trustProxyHops: number;
  };
  cors: {
    origin: string;
  };
}

const INSECURE_DEFAULT_SECRETS = new Set([
  'cyberrig-dev-secret-key',
  'cyberrig-dev-refresh-secret-key',
  'super-secret-cyberrig-key-change-in-production',
  'cyberrig-dev-webhook-hmac-secret',
]);

export const config: AppConfig = {
  env: (process.env.NODE_ENV as AppConfig['env']) || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  appName: process.env.APP_NAME || 'CyberRig',
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  database: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://cyberrig_user:cyberrig_dev_password@localhost:5433/cyberrig_db?schema=public',
  },
  cache: {
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6380',
  },
  security: {
    jwtSecret: process.env.JWT_SECRET || 'cyberrig-dev-secret-key',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'cyberrig-dev-refresh-secret-key',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    webhookSecret: process.env.WEBHOOK_SECRET || 'cyberrig-dev-webhook-hmac-secret',
    bcryptRounds: process.env.NODE_ENV === 'production' ? 12 : 10,
    trustProxyHops: parseInt(process.env.TRUST_PROXY_HOPS || '1', 10),
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:4000,http://localhost',
  },
};

/**
 * Fail-fast security invariant validation for Production deployments.
 * Prevents launching production servers with weak/default secrets or wildcard CORS.
 */
export function validateProductionSecurityConfig(cfg: AppConfig = config): void {
  if (cfg.env !== 'production') return;
  if (process.env.ALLOW_INSECURE_PROD_DEFAULTS === 'true') return;

  const issues: string[] = [];
  if (INSECURE_DEFAULT_SECRETS.has(cfg.security.jwtSecret) || cfg.security.jwtSecret.length < 32) {
    issues.push('JWT_SECRET phải dài tối thiểu 32 ký tự và không dùng giá trị mặc định trong Production.');
  }
  if (INSECURE_DEFAULT_SECRETS.has(cfg.security.jwtRefreshSecret) || cfg.security.jwtRefreshSecret.length < 32) {
    issues.push('JWT_REFRESH_SECRET phải dài tối thiểu 32 ký tự và không dùng giá trị mặc định trong Production.');
  }
  if (cfg.security.jwtSecret === cfg.security.jwtRefreshSecret) {
    issues.push('JWT_SECRET và JWT_REFRESH_SECRET phải tách biệt nhau.');
  }
  if (INSECURE_DEFAULT_SECRETS.has(cfg.security.webhookSecret) || cfg.security.webhookSecret.length < 32) {
    issues.push('WEBHOOK_SECRET phải dài tối thiểu 32 ký tự trong Production.');
  }
  if (cfg.cors.origin.trim() === '*') {
    issues.push('CORS_ORIGIN không được phép dùng wildcard "*" trong môi trường Production.');
  }

  if (issues.length > 0) {
    throw new Error(`[CYBERRIG SECURITY FAIL-FAST]:\n - ${issues.join('\n - ')}`);
  }
}

export default config;
