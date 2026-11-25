/**
 * SE445 Omnichannel Order Adapter, AI POS Mapper & RBAC Integration Spec
 */

import { describe, test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../../app';
import { eventBus } from '../../core/events';
import { signAccessToken } from '../auth/jwt.util';
import { normalizeCreateOrderPayload } from '../orders/order.adapter';
import { registerOrderEventSubscribers } from '../orders/order-events.subscriber';
import { aiDataMapperService } from './ai-data-mapper.service';

describe('SE445 Case Study 1 & 2 Integration Endpoints & Adapters', () => {
  afterEach(() => {
    eventBus.setBrokerOnline(true);
    registerOrderEventSubscribers();
  });

  test('ADAPT-01: Canonical order adapter transforms heterogeneous B2B feed into CreateOrderDto', () => {
    const adapted = normalizeCreateOrderPayload(
      {
        channel: 'PARTNER_B2B_API',
        user: { name: 'Partner Tech Co', phone: '0909888777' },
        products: [{ product_code: 'RTX-4080', qty: 2 }],
        delivery_addr: 'District 1, Ho Chi Minh City',
        simulateFulfillmentFailure: true,
      },
      null
    );

    assert.strictEqual(adapted.normalizedFromFormat, 'HETEROGENEOUS_PARTNER');
    assert.strictEqual(adapted.sourceChannel, 'PARTNER_B2B_API');
    assert.strictEqual(adapted.simulateFulfillmentFailure, true);
    assert.strictEqual(adapted.dto.customerName, 'Partner Tech Co');
    assert.strictEqual(adapted.dto.customerPhone, '0909888777');
    assert.strictEqual(adapted.dto.shippingAddress, 'District 1, Ho Chi Minh City');
    assert.deepStrictEqual(adapted.dto.items, [{ hardwareId: 'gpu-rtx4080-strix', quantity: 2 }]);
  });

  test('AI-POS-01: AI Data Mapper scrubs PII and warms Template Cache on repeat prompt shape', async () => {
    aiDataMapperService.resetForTest();
    const rawPrompt = 'Khach Le Minh Loc - 0901234567 - loc@example.com mua 1x RTX 4080 giao Q7';

    const first = await aiDataMapperService.mapRawPosOrder(rawPrompt, 'POS_TEST_1');
    assert.ok(!first.redactedRawText.includes('0901234567'));
    assert.ok(!first.redactedRawText.includes('loc@example.com'));
    assert.ok(first.piiFieldsRedacted >= 2);
    assert.strictEqual(first.engineUsed, 'OFFLINE_FALLBACK');
    assert.ok(first.resolvedItems.some((item) => item.sku === 'gpu-rtx4080-strix'));

    const second = await aiDataMapperService.mapRawPosOrder(
      'Khach Tran Van B - 0912345678 - b@example.com mua 2x RTX 4080 giao Q3',
      'POS_TEST_2'
    );
    assert.strictEqual(second.engineUsed, 'TEMPLATE_CACHE');
    assert.strictEqual(second.confidenceScore, 0.99);
  });

  test('INT-API-01: New monitoring integration routes enforce ADMIN RBAC, trace correlation IDs, and handle 503 Outbox', async () => {
    const server = await new Promise<import('http').Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 4000;

    const adminToken = signAccessToken({
      userId: 'admin-se445-001',
      email: 'admin@cyberrig.vn',
      role: 'ADMIN',
      fullName: 'SE445 Admin',
    });
    const customerToken = signAccessToken({
      userId: 'cust-se445-001',
      email: 'cust@cyberrig.vn',
      role: 'CUSTOMER',
      fullName: 'Customer',
    });

    try {
      const unauth = await fetch(`http://localhost:${port}/api/monitoring/integration-state`);
      assert.strictEqual(unauth.status, 401);

      const forbidden = await fetch(`http://localhost:${port}/api/monitoring/ai-pos/ingest`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: '1x RTX 4080' }),
      });
      assert.strictEqual(forbidden.status, 403);

      const stateRes = await fetch(`http://localhost:${port}/api/monitoring/integration-state`, {
        headers: { Authorization: `Bearer ${adminToken}`, 'X-Correlation-ID': 'corr-se445-trace' },
      });
      assert.strictEqual(stateRes.status, 200);
      assert.strictEqual(stateRes.headers.get('x-correlation-id'), 'corr-se445-trace');

      const simRes = await fetch(`http://localhost:${port}/api/monitoring/orders/simulate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
          'X-Correlation-ID': 'corr-se445-sim',
        },
        body: JSON.stringify({
          channel: 'PARTNER_B2B_API',
          user: { name: 'Partner SE445', phone: '0908111222' },
          products: [{ product_code: 'I5-13600K', qty: 1 }],
          delivery_addr: 'Thu Duc, HCMC',
        }),
      });
      assert.strictEqual(simRes.status, 201);
      const simJson = (await simRes.json()) as {
        success: boolean;
        data: { correlationId: string; normalizedFromFormat: string; downstream: { inventorySyncedCount: number } };
      };
      assert.strictEqual(simJson.success, true);
      assert.strictEqual(simJson.data.correlationId, 'corr-se445-sim');
      assert.strictEqual(simJson.data.normalizedFromFormat, 'HETEROGENEOUS_PARTNER');
      assert.ok(simJson.data.downstream.inventorySyncedCount >= 1);

      // Broker offline check -> 503 + Outbox PENDING_RETRY
      await fetch(`http://localhost:${port}/api/monitoring/integration-broker`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'OFFLINE' }),
      });

      const offlineSim = await fetch(`http://localhost:${port}/api/monitoring/orders/simulate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'WEB_STOREFRONT',
          user: { name: 'Offline Tester', phone: '0908333444' },
          products: [{ product_code: 'I5-13600K', qty: 1 }],
          delivery_addr: 'HCMC',
        }),
      });
      assert.strictEqual(offlineSim.status, 503);
      const offlineJson = (await offlineSim.json()) as {
        error: { code: string };
        data: { outbox: { status: string } };
      };
      assert.strictEqual(offlineJson.error.code, 'BROKER_UNAVAILABLE');
      assert.strictEqual(offlineJson.data.outbox.status, 'PENDING_RETRY');

      // Restore Broker online
      await fetch(`http://localhost:${port}/api/monitoring/integration-broker`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ONLINE' }),
      });

      // Verify SI Monitor VIE language switcher button & i18n bundle are served cleanly
      const htmlRes = await fetch(`http://localhost:${port}/admin-monitoring/`);
      assert.strictEqual(htmlRes.status, 200);
      const htmlBody = await htmlRes.text();
      assert.ok(htmlBody.includes('id="btnLangToggle"'));
      assert.ok(htmlBody.includes('/admin-monitoring/i18n-vi.js'));

      const i18nRes = await fetch(`http://localhost:${port}/admin-monitoring/i18n-vi.js`);
      assert.strictEqual(i18nRes.status, 200);
      const i18nJs = await i18nRes.text();
      assert.ok(i18nJs.includes('cyberrig_si_lang'));
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
