/**
 * Monitoring API Routes
 * Mounts endpoints for SI Monitoring & Testing Dashboard.
 */

import { Router } from 'express';
import { monitoringController } from './monitoring.controller';

export const monitoringRouter: Router = Router();

// 1. Snapshot Telemetry Data (Event/Metric-driven, zero main DB queries)
monitoringRouter.get('/telemetry', (req, res, next) => monitoringController.getTelemetry(req, res, next));

// 2. Real-time Server-Sent Events (SSE) Stream
monitoringRouter.get('/stream', (req, res) => monitoringController.streamTelemetry(req, res));

// 3. List 6 Integration Test Scenarios
monitoringRouter.get('/scenarios', (req, res) => monitoringController.getScenarios(req, res));

// 4. Trigger Interactive Scenario Execution
monitoringRouter.post('/scenarios/:scenarioId/run', (req, res, next) =>
  monitoringController.runScenario(req, res, next)
);

// 5. Dead Letter Queue (DLQ) Inspector & Replay
monitoringRouter.get('/dlq', (req, res) => monitoringController.getDlqMessages(req, res));
monitoringRouter.post('/dlq/:id/replay', (req, res) => monitoringController.replayDlq(req, res));
monitoringRouter.post('/dlq/clear', (req, res) => monitoringController.clearDlq(req, res));

export default monitoringRouter;
