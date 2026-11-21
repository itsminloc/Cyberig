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
  };
  cors: {
    origin: string;
  };
}

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
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
};

export default config;
