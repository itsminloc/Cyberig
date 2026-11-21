/**
 * Monitoring Controller
 * Handles REST endpoints and SSE stream for SI Monitoring & Testing Dashboard.
 */

import { Request, Response, NextFunction } from 'express';
import { telemetryService } from './telemetry.service';
import { scenarioRunnerService, SCENARIO_DEFINITIONS } from './scenario-runner.service';
import { ScenarioId } from './monitoring.model';
import { verifyAccessToken } from '../auth/jwt.util';

export class MonitoringController {
  /**
   * GET /api/monitoring/telemetry
   * Returns instant snapshot of all metrics, containers, and queue status.
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
   * Returns list of 6 pre-configured integration test scenarios.
   */
  public getScenarios(_req: Request, res: Response): void {
    res.status(200).json({
      success: true,
      data: Object.values(SCENARIO_DEFINITIONS),
    });
  }

  /**
   * POST /api/monitoring/scenarios/:scenarioId/run
   * Triggers execution of a specific scenario.
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

      const result = await scenarioRunnerService.executeScenario(scenarioId as ScenarioId, triggeredBy);
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
   * Returns list of poison messages currently quarantined in Dead Letter Queue.
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
   * Replays a message from DLQ back into the active exchange.
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

    res.status(200).json({
      success: true,
      message: `Đã phát lại (Replay) thành công thông điệp DLQ [${id}].`,
    });
  }

  /**
   * POST /api/monitoring/dlq/clear
   * Discards all messages in Dead Letter Queue.
   */
  public clearDlq(_req: Request, res: Response): void {
    telemetryService.clearDlq();
    res.status(200).json({
      success: true,
      message: 'Đã dọn dẹp sạch toàn bộ Dead Letter Queue.',
    });
  }

  /**
   * GET /api/monitoring/stream
   * Server-Sent Events (SSE) stream for real-time telemetry and event logs.
   */
  public streamTelemetry(req: Request, res: Response): void {
    // Optional token validation via query param or header
    const authHeader = Array.isArray(req.headers.authorization)
      ? req.headers.authorization[0]
      : req.headers.authorization;
    const queryToken = typeof req.query.token === 'string' ? req.query.token : undefined;
    const token = queryToken || (typeof authHeader === 'string' ? authHeader.replace(/^Bearer /i, '') : undefined);
    if (token) {
      try {
        const user = verifyAccessToken(token);
        if (user.role !== 'ADMIN') {
          res.status(403).json({ error: 'Chỉ tài khoản ADMIN mới có quyền kết nối SSE Stream.' });
          return;
        }
      } catch {
        // Allow stream with notice or keep open for development
      }
    }

    // Set standard SSE response headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering

    res.flushHeaders?.();

    telemetryService.registerSseClient(res);
  }
}

export const monitoringController = new MonitoringController();
