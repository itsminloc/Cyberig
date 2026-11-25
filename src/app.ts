/**
 * CyberRig Server Application Entrypoint
 * Express HTTP server mounting Compatibility & Repair Ticket routers with Global Error Handling.
 * Aligned with Task BE-06 specification.
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { config, validateProductionSecurityConfig } from './core/config';
import { correlationMiddleware } from './core/middlewares/correlation.middleware';
import { errorHandler } from './core/middlewares/error-handler.middleware';
import { compatibilityRouter } from './modules/compatibility/compatibility.routes';
import { ticketRouter } from './modules/repair-tickets/ticket.routes';
import { hardwareRouter } from './modules/hardware/hardware.routes';
import { orderRouter } from './modules/orders/order.routes';
import { healthRouter } from './modules/health/health.routes';
import { authRouter } from './modules/auth/auth.routes';
import { customerRouter } from './modules/customer/customer.routes';
import { adminRouter } from './modules/admin/admin.routes';
import { monitoringRouter } from './modules/monitoring/monitoring.routes';
import { registerOrderEventSubscribers } from './modules/orders/order-events.subscriber';

// 0. Fail-Fast Security Config Invariant Check (Production)
validateProductionSecurityConfig(config);
registerOrderEventSubscribers();

export const app: Express = express();

// 1. Distributed Tracing (X-Correlation-ID), Reverse Proxy & Security Headers
app.set('trust proxy', config.security.trustProxyHops);
app.disable('x-powered-by');
app.use(correlationMiddleware);

app.use((req: Request, res: Response, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https://img.vietqr.io https://api.qrserver.com; connect-src 'self'; frame-ancestors 'self';"
  );
  if (config.env === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// 2. Strict CORS Configuration
const allowedOrigins = (process.env.ALLOWED_ORIGINS || config.cors.origin || 'http://localhost:4000')
  .split(',')
  .map((s) => s.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (config.env !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error('CORS blocked: Origin not allowed'));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'X-Correlation-ID',
      'X-Request-ID',
      'x-forwarded-for',
      'x-cyberrig-signature',
      'x-cyberrig-timestamp',
      'x-order-phone',
    ],
    exposedHeaders: ['X-Correlation-ID', 'RateLimit-Limit', 'RateLimit-Remaining', 'Retry-After'],
    credentials: true,
  })
);

// 2.1. JSON Body Parser with 100KB DoS Limit & Raw Body Capture for HMAC-SHA256 Webhook Verification
app.use(
  express.json({
    limit: '100kb',
    verify: (req, _res, buf) => {
      (req as Request & { rawBody?: string }).rawBody = buf.toString('utf8');
    },
  })
);

// 2.2. Health Check Diagnostic Routes (GET /healthz and legacy /api/health)
app.use(healthRouter);

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    app: config.appName,
    environment: config.env,
    timestamp: new Date().toISOString(),
  });
});

// 3. Domain API Routes
app.use('/api/auth', authRouter);
app.use('/api/compatibility', compatibilityRouter);
app.use('/api/tickets', ticketRouter);
app.use('/api/hardware', hardwareRouter);
app.use('/api/orders', orderRouter);
app.use('/api/customer', customerRouter);
app.use('/api/admin', adminRouter);
app.use('/api/monitoring', monitoringRouter);

// 3.1. Static Frontend Hosting for nginx/html assets
const staticPath = path.resolve(process.cwd(), 'nginx/html');
app.use(express.static(staticPath));

// 3.2. Dedicated SI Monitoring Dashboard Route
app.use((req: Request, res: Response, next) => {
  if (req.method === 'GET' && req.path.startsWith('/admin-monitoring')) {
    return res.sendFile(path.join(staticPath, 'admin-monitoring/index.html'));
  }
  next();
});

// 3.3. SPA Fallback for client-side routing (/builder, /hardware, /checkout, /repair-tracking, etc.)
app.use((req: Request, res: Response, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/healthz')) {
    return res.sendFile(path.join(staticPath, 'index.html'));
  }
  next();
});

// 4. 404 Route Handler (for unhandled API routes)
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: 'Đường dẫn yêu cầu không tồn tại trên hệ thống CyberRig API.',
    },
  });
});


// 5. Global Error Handler Middleware (Must be registered after routes)
app.use(errorHandler);

// 6. Server Initialization
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : config.port || 3000;

if (process.argv[1]?.includes('app.ts') || process.argv[1]?.includes('app.js')) {
  app.listen(PORT, () => {
    console.log('====================================================');
    console.log(`🚀 CYBERRIG API SERVER RUNNING ON PORT ${PORT}`);
    console.log(`🌐 Base URL: http://localhost:${PORT}`);
    console.log(`🔍 Health Check: http://localhost:${PORT}/healthz`);
    console.log('====================================================');
  });
}

export default app;
