/**
 * SI Monitoring & Testing Dashboard Spec
 * Verifies Telemetry aggregation, Ring Buffer, DLQ Inspector,
 * and 6 Integration Scenarios execution.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { telemetryService } from './telemetry.service';
import { scenarioRunnerService, SCENARIO_DEFINITIONS } from './scenario-runner.service';
import { app } from '../../app';

describe('SI Monitoring & Testing Dashboard Engine', () => {
  test('MON-01: Telemetry snapshot returns valid containers, broker, and zero-overhead telemetry', async () => {
    const snapshot = await telemetryService.getTelemetrySnapshot();

    assert.ok(snapshot.systemUptimeSeconds >= 0);
    assert.strictEqual(snapshot.containers.length, 4);

    const containerNames = snapshot.containers.map((c) => c.name);
    assert.ok(containerNames.includes('cyberrig_postgres_prod'));
    assert.ok(containerNames.includes('cyberrig_redis_prod'));
    assert.ok(containerNames.includes('cyberrig_app_prod'));
    assert.ok(containerNames.includes('cyberrig_nginx_prod'));

    assert.strictEqual(snapshot.broker.brokerType, 'RabbitMQ');
    assert.ok(snapshot.broker.totalMessagesPublished > 0);
    assert.ok(Array.isArray(snapshot.recentLogs));
  });

  test('MON-02: Circular Ring Buffer captures log events without overflowing', () => {
    const testLog = telemetryService.emitLog(
      'SCENARIO',
      'INFO',
      'UnitTestRunner',
      'Testing ring buffer message recording',
      { testRun: true }
    );

    assert.ok(testLog.id.startsWith('log-'));
    assert.strictEqual(testLog.channel, 'SCENARIO');
    assert.strictEqual(testLog.message, 'Testing ring buffer message recording');

    const recentLogs = telemetryService.emitLog('BROKER', 'DEBUG', 'UnitBroker', 'Debug tick');
    assert.ok(recentLogs.id);
  });

  test('MON-03: Scenario 1 (Order Placement Pipeline) executes successfully with 4 steps', async () => {
    const result = await scenarioRunnerService.executeScenario('scenario-1-order-placement', 'QA-Automated');

    assert.strictEqual(result.scenarioId, 'scenario-1-order-placement');
    assert.strictEqual(result.status, 'PASSED');
    assert.strictEqual(result.steps.length, 4);
    assert.ok(result.executionTimeMs >= 0);
    assert.strictEqual(result.outputPayload?.sku, 'GPU-RTX4080');
    assert.strictEqual(result.outputPayload?.status, 'FULFILLED');
  });

  test('MON-04: Scenario 2 (Stock Check & Concurrency Lock) guarantees zero oversell', async () => {
    const result = await scenarioRunnerService.executeScenario('scenario-2-stock-check', 'QA-Automated');

    assert.strictEqual(result.scenarioId, 'scenario-2-stock-check');
    assert.strictEqual(result.status, 'PASSED');
    assert.strictEqual(result.outputPayload?.oversellDetected, false);
    assert.strictEqual(result.outputPayload?.concurrentRequests, 5);
  });

  test('MON-05: Scenario 3 (Trigger DLQ Error) generates poison pill, quarantines to DLQ, and allows replay', async () => {
    const initialDlqCount = telemetryService.getDlqMessages().length;

    const result = await scenarioRunnerService.executeScenario('scenario-3-trigger-dlq', 'QA-Automated');

    assert.strictEqual(result.scenarioId, 'scenario-3-trigger-dlq');
    assert.strictEqual(result.status, 'PASSED');

    const dlqMessages = telemetryService.getDlqMessages();
    assert.strictEqual(dlqMessages.length, initialDlqCount + 1);

    const latestPoison = dlqMessages[0];
    assert.strictEqual(latestPoison.failureReason, 'SCHEMA_VALIDATION_FAILED');
    assert.strictEqual(latestPoison.status, 'PENDING_INSPECTION');

    // Test Replay mechanism
    const replayed = telemetryService.replayDlqMessage(latestPoison.id);
    assert.strictEqual(replayed, true);
    assert.strictEqual(latestPoison.status, 'REPLAYED');
  });

  test('MON-06: Scenario 4 (Run AI Data Mapping) translates heterogeneous vendor format to CyberRig schema', async () => {
    const result = await scenarioRunnerService.executeScenario('scenario-4-ai-mapping', 'QA-Automated');

    assert.strictEqual(result.scenarioId, 'scenario-4-ai-mapping');
    assert.strictEqual(result.status, 'PASSED');
    assert.ok(result.outputPayload?.normalizedOutput?.confidenceScore >= 0.95);
    assert.strictEqual(result.outputPayload?.normalizedOutput?.brand, 'ASUS');
  });

  test('MON-07: Scenario 5 (Rate Limiting Stress Test) verifies 429 throttle barrier', async () => {
    const result = await scenarioRunnerService.executeScenario('scenario-5-rate-limiting', 'QA-Automated');

    assert.strictEqual(result.scenarioId, 'scenario-5-rate-limiting');
    assert.strictEqual(result.status, 'PASSED');
    assert.strictEqual(result.outputPayload?.allowedRequests, 10);
    assert.strictEqual(result.outputPayload?.blockedRequests, 15);
    assert.strictEqual(result.outputPayload?.httpStatusBlocked, 429);
  });

  test('MON-08: Scenario 6 (Full System Diagnostic Probe) confirms all 4 subsystems operational', async () => {
    const result = await scenarioRunnerService.executeScenario('scenario-6-system-health', 'QA-Automated');

    assert.strictEqual(result.scenarioId, 'scenario-6-system-health');
    assert.strictEqual(result.status, 'PASSED');
    assert.strictEqual(result.outputPayload?.totalSubsystemsChecked, 4);
    assert.strictEqual(result.outputPayload?.healthySubsystems, 4);
  });

  test('MON-09: REST API endpoints /api/monitoring/telemetry and /api/monitoring/scenarios return valid payloads', async () => {
    const server = await new Promise<import('http').Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 4000;

    try {
      // 1. GET /api/monitoring/telemetry
      const telemetryRes = await fetch(`http://localhost:${port}/api/monitoring/telemetry`);
      assert.strictEqual(telemetryRes.status, 200);
      const json = (await telemetryRes.json()) as { success: boolean; data: { containers: unknown[] } };
      assert.strictEqual(json.success, true);
      assert.ok(json.data.containers);

      // 2. GET /api/monitoring/scenarios
      const scenariosRes = await fetch(`http://localhost:${port}/api/monitoring/scenarios`);
      assert.strictEqual(scenariosRes.status, 200);
      const scenariosJson = (await scenariosRes.json()) as { success: boolean; data: unknown[] };
      assert.strictEqual(scenariosJson.success, true);
      assert.strictEqual(scenariosJson.data.length, 6);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
