/**
 * CyberRig Server Application Entrypoint
 * Express HTTP server mounting Compatibility & Repair Ticket routers with Global Error Handling.
 * Aligned with Task BE-06 specification.
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { config } from './core/config';
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

export const app: Express = express();

// 1. API Hardening & Security Headers
app.disable('x-powered-by');

app.use((_req: Request, res: Response, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// 2. Strict CORS Configuration
const allowedOrigins = (process.env.ALLOWED_ORIGINS || config.cors.origin || '*')
  .split(',')
  .map((s) => s.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (config.env !== 'production' && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error('CORS blocked: Origin not allowed'));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'x-forwarded-for'],
    credentials: true,
  })
);

app.use(express.json());

// 2. Health Check Diagnostic Routes (GET /healthz and legacy /api/health)
app.use(healthRouter);

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    app: config.appName,
    environment: config.env,
    timestamp: new Date().toISOString(),
  });
});

import path from 'path';

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
