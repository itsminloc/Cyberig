/**
 * Monitoring Controller
 * Handles ADMIN-guarded REST endpoints, single-use SSE tickets, audit log inspection,
 * and real-time SSE stream for SI Monitoring & Testing Dashboard.
 */

import { randomBytes } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { redis } from '../../core/redis';
import { auditLogService, tokenBlacklistService } from '../../core/security';
import { resolveClientIp } from '../../core/middlewares/rate-limiter.middleware';
import { telemetryService } from './telemetry.service';
import { scenarioRunnerService, SCENARIO_DEFINITIONS } from './scenario-runner.service';
import { ScenarioId } from './monitoring.model';
import { verifyAccessToken } from '../auth/jwt.util';

const SSE_TICKET_PREFIX = 'auth:sse-ticket:';
const SSE_TICKET_TTL_SEC = 30;

export class MonitoringController {
  /**
   * POST /api/monitoring/stream-ticket (ADMIN only)
   * Issues a single-use, 30-second opaque ticket so EventSource does not expose JWTs in URL logs.
   */
  public async issueStreamTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticket = randomBytes(24).toString('hex');
      const payload = JSON.stringify({
        userId: req.user!.userId,
        role: req.user!.role,
        email: req.user!.email,
      });
      await redis.set(`${SSE_TICKET_PREFIX}${ticket}`, payload, SSE_TICKET_TTL_SEC);

      res.status(200).json({
        success: true,
        data: {
          ticket,
          expiresInSeconds: SSE_TICKET_TTL_SEC,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/monitoring/telemetry
   */
  public async getTelemetry(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const snapshot = await telemetryService.getTelemetrySnapshot();
      res.status(200).json({
        success: true,
        data: snapshot,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/monitoring/scenarios
   */
  public getScenarios(_req: Request, res: Response): void {
    res.status(200).json({
      success: true,
      data: Object.values(SCENARIO_DEFINITIONS),
    });
  }

  /**
   * POST /api/monitoring/scenarios/:scenarioId/run
   */
  public async runScenario(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const scenarioId = req.params.scenarioId as ScenarioId;
      const triggeredBy = req.user?.email || req.user?.fullName || 'Admin Operator';

      if (!SCENARIO_DEFINITIONS[scenarioId]) {
        res.status(404).json({
          success: false,
          error: {
            code: 'SCENARIO_NOT_FOUND',
            message: `Kịch bản kiểm thử [${scenarioId}] không tồn tại.`,
          },
        });
        return;
      }

      const result = await scenarioRunnerService.executeScenario(scenarioId, triggeredBy);

      await auditLogService.record({
        eventType: 'MONITORING_SCENARIO_RUN',
        severity: 'INFO',
        actorId: req.user?.userId,
        actorRole: req.user?.role || 'ADMIN',
        actorEmail: req.user?.email,
        ipAddress: resolveClientIp(req),
        resourceType: 'monitoring_scenario',
        resourceId: scenarioId,
        message: `Kích hoạt kịch bản kiểm thử [${scenarioId}] -> ${result.status} (${result.executionTimeMs}ms).`,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/monitoring/dlq
   */
  public getDlqMessages(_req: Request, res: Response): void {
    const messages = telemetryService.getDlqMessages();
    res.status(200).json({
      success: true,
      data: messages,
    });
  }

  /**
   * POST /api/monitoring/dlq/:id/replay
   */
  public replayDlq(req: Request, res: Response): void {
    const id = req.params.id as string;
    const success = telemetryService.replayDlqMessage(id);

    if (!success) {
      res.status(404).json({
        success: false,
        error: {
          code: 'DLQ_MESSAGE_NOT_FOUND',
          message: `Không tìm thấy thông điệp DLQ có mã [${id}].`,
        },
      });
      return;
    }

    void auditLogService.record({
      eventType: 'MONITORING_DLQ_REPLAY',
      severity: 'WARN',
      actorId: req.user?.userId,
      actorRole: req.user?.role || 'ADMIN',
      actorEmail: req.user?.email,
      ipAddress: resolveClientIp(req),
      resourceType: 'monitoring_dlq',
      resourceId: id,
      message: `Phát lại (Replay) thông điệp lỗi DLQ [${id}].`,
    });

    res.status(200).json({
      success: true,
      message: `Đã phát lại (Replay) thành công thông điệp DLQ [${id}].`,
    });
  }

  /**
   * POST /api/monitoring/dlq/clear
   */
  public clearDlq(req: Request, res: Response): void {
    telemetryService.clearDlq();

    void auditLogService.record({
      eventType: 'MONITORING_DLQ_CLEAR',
      severity: 'WARN',
      actorId: req.user?.userId,
      actorRole: req.user?.role || 'ADMIN',
      actorEmail: req.user?.email,
      ipAddress: resolveClientIp(req),
      resourceType: 'monitoring_dlq',
      message: 'Đã xóa rỗng toàn bộ hàng đợi Dead Letter Queue.',
    });

    res.status(200).json({
      success: true,
      message: 'Đã dọn dẹp sạch toàn bộ Dead Letter Queue.',
    });
  }

  /**
   * GET /api/monitoring/audit-logs (ADMIN only)
   */
  public async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
      const eventType = req.query.eventType ? String(req.query.eventType) : undefined;
      const logs = await auditLogService.listRecent(isNaN(limit) ? 50 : limit, eventType);

      res.status(200).json({
        success: true,
        data: logs,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/monitoring/stream
   * Strictly authenticates ADMIN via single-use SSE ticket (?ticket=...) or Bearer JWT.
   */
  public async streamTelemetry(req: Request, res: Response): Promise<void> {
    const ticket = typeof req.query.ticket === 'string' ? req.query.ticket : undefined;
    const authHeader = Array.isArray(req.headers.authorization)
      ? req.headers.authorization[0]
      : req.headers.authorization;
    const queryToken = typeof req.query.token === 'string' ? req.query.token : undefined;
    const bearerToken =
      typeof authHeader === 'string' && /^Bearer /i.test(authHeader)
        ? authHeader.replace(/^Bearer /i, '').trim()
        : queryToken;

    let authorized = false;
    let forbidden = false;

    if (ticket) {
      const ticketKey = `${SSE_TICKET_PREFIX}${ticket}`;
      const raw = await redis.get(ticketKey);
      if (raw) {
        // Consume immediately (single-use ticket)
        await redis.del(ticketKey);
        try {
          const parsed = JSON.parse(raw) as { role?: string };
          if (parsed.role === 'ADMIN') {
            authorized = true;
          } else {
            forbidden = true;
          }
        } catch {
          authorized = false;
        }
      }
    } else if (bearerToken) {
      try {
        const user = verifyAccessToken(bearerToken);
        if (user.jti && tokenBlacklistService.isRevokedSync(user.jti)) {
          authorized = false;
        } else if (user.role === 'ADMIN') {
          authorized = true;
        } else {
          forbidden = true;
        }
      } catch {
        authorized = false;
      }
    }

    if (forbidden) {
      void auditLogService.record({
        eventType: 'SECURITY_ACCESS_DENIED',
        severity: 'WARN',
        ipAddress: resolveClientIp(req),
        resourceType: 'monitoring_stream',
        message: 'Chặn kết nối SSE Stream từ tài khoản không có quyền ADMIN.',
      });
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Chỉ tài khoản ADMIN mới có quyền kết nối SSE Stream.' },
      });
      return;
    }

    if (!authorized) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Yêu cầu xác thực ADMIN hoặc SSE ticket hợp lệ.' },
      });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    res.flushHeaders?.();
    telemetryService.registerSseClient(res);
  }
}

export const monitoringController = new MonitoringController();
