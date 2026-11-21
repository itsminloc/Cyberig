/**
 * Healthcheck Endpoint E2E Integration Test Suite
 * Tests GET /healthz, database/redis health probe, and ensures unblocked by rate limiting.
 * Aligned with Task DEVOPS-01 specification.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../../src/app';

// Minimal HTTP helper to test Express app without binding external port
async function testRequest(
  method: string,
  path: string,
  headers: Record<string, string> = {}
): Promise<{ status: number; headers: Record<string, string>; body: any }> {
  const { createServer } = await import('node:http');
  const server = createServer(app);

  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        server.close();
        return reject(new Error('Failed to get server address'));
      }
      const port = addr.port;
      const url = `http://127.0.0.1:${port}${path}`;

      fetch(url, { method, headers })
        .then(async (res) => {
          const resHeaders: Record<string, string> = {};
          res.headers.forEach((v, k) => {
            resHeaders[k.toLowerCase()] = v;
          });
          const text = await res.text();
          let parsed: any;
          try {
            parsed = JSON.parse(text);
          } catch {
            parsed = text;
          }
          server.close(() => {
            resolve({
              status: res.status,
              headers: resHeaders,
              body: parsed,
            });
          });
        })
        .catch((err) => {
          server.close(() => reject(err));
        });
    });
  });
}

describe('Healthcheck & Diagnostics Integration (Task DEVOPS-01 / PB-15)', () => {
  test('Test 1: GET /healthz returns valid schema with database, redis status and uptime', async () => {
    const res = await testRequest('GET', '/healthz');

    // Status can be 200 (if DB+Redis up) or 503 (if standalone test environment without running docker DB)
    assert.ok(
      res.status === 200 || res.status === 503,
      `Expected status 200 or 503, got ${res.status}`
    );

    assert.ok(res.body, 'Expected response body');
    assert.ok(typeof res.body.uptime === 'number', 'Expected uptime to be a number');
    assert.ok(res.body.uptime >= 0, 'Uptime must be non-negative');
    assert.ok(
      res.body.status === 'ok' || res.body.status === 'degraded',
      `Expected status 'ok' or 'degraded', got ${res.body.status}`
    );
    assert.ok(
      res.body.db === 'up' || res.body.db === 'down',
      `Expected db 'up' or 'down', got ${res.body.db}`
    );
    assert.ok(
      res.body.redis === 'up' || res.body.redis === 'down',
      `Expected redis 'up' or 'down', got ${res.body.redis}`
    );

    if (res.body.db === 'up' && res.body.redis === 'up') {
      assert.equal(res.status, 200);
      assert.equal(res.body.status, 'ok');
    } else {
      assert.equal(res.status, 503);
      assert.equal(res.body.status, 'degraded');
    }
  });

  test('Test 2: GET /api/healthz alias functions identically to /healthz', async () => {
    const res = await testRequest('GET', '/api/healthz');
    assert.ok(
      res.status === 200 || res.status === 503,
      `Expected status 200 or 503, got ${res.status}`
    );
    assert.ok(res.body.uptime !== undefined);
  });

  test('Test 3: Legacy GET /api/health remains backward compatible and returns 200', async () => {
    const res = await testRequest('GET', '/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.app, 'CyberRig');
  });

  test('Test 4: High-frequency requests to /healthz are NOT blocked by rate limiting', async () => {
    // Ping 15 times consecutively
    for (let i = 0; i < 15; i++) {
      const res = await testRequest('GET', '/healthz', {
        'x-forwarded-for': '198.51.100.99',
      });
      assert.notEqual(
        res.status,
        429,
        `Request #${i + 1} should not be rate limited (got 429)`
      );
    }
  });
});
