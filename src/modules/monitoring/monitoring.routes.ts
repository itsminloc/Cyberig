/**
 * Monitoring API Routes
 * All SI Monitoring & SOC endpoints are strictly protected by JWT + ADMIN RBAC.
 * Real-time SSE stream uses single-use short-lived tickets or verified ADMIN Bearer tokens.
 */

import { Router } from 'express';
import { authenticateToken, requireRoles } from '../../core/middlewares/auth.middleware';
import { monitoringController } from './monitoring.controller';

export const monitoringRouter: Router = Router();

// 1. Real-time Server-Sent Events (SSE) Stream (validates one-time SSE ticket or ADMIN Bearer JWT)
monitoringRouter.get('/stream', (req, res) => monitoringController.streamTelemetry(req, res));

// All remaining Monitoring / SOC / Lab endpoints strictly require ADMIN clearance
monitoringRouter.use(authenticateToken);
monitoringRouter.use(requireRoles('ADMIN'));

// 2. Issue single-use 30s SSE Ticket (avoids placing long-lived JWT in EventSource query string)
monitoringRouter.post('/stream-ticket', (req, res, next) => monitoringController.issueStreamTicket(req, res, next));

// 3. Snapshot Telemetry Data (Event/Metric-driven, zero main DB queries)
monitoringRouter.get('/telemetry', (req, res, next) => monitoringController.getTelemetry(req, res, next));

// 4. List 6 Integration Test Scenarios
monitoringRouter.get('/scenarios', (req, res) => monitoringController.getScenarios(req, res));

// 5. Trigger Interactive Scenario Execution
monitoringRouter.post('/scenarios/:scenarioId/run', (req, res, next) =>
  monitoringController.runScenario(req, res, next)
);

// 6. Dead Letter Queue (DLQ) Inspector & Replay
monitoringRouter.get('/dlq', (req, res) => monitoringController.getDlqMessages(req, res));
monitoringRouter.post('/dlq/:id/replay', (req, res) => monitoringController.replayDlq(req, res));
monitoringRouter.post('/dlq/clear', (req, res) => monitoringController.clearDlq(req, res));

// 7. Immutable Security Audit Trail Inspector
monitoringRouter.get('/audit-logs', (req, res, next) => monitoringController.getAuditLogs(req, res, next));

// 8. CEO Executive Revenue, Stock & Repair SLA Summary
monitoringRouter.get('/ceo-summary', (req, res, next) => monitoringController.getCeoSummary(req, res, next));

export default monitoringRouter;
