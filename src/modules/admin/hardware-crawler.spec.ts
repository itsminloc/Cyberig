/**
 * Hardware Catalog Crawler, Price-Diff Staging, SSRF Guard & Real-time Alert Spec
 */

import http from 'node:http';
import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../../app';
import { signAccessToken } from '../auth/jwt.util';
import { hardwareService } from '../hardware/hardware.service';
import { assertSafeCrawlerUrl } from './crawler-feeds.data';
import { hardwareCrawlerService } from './hardware-crawler.service';

describe('Hardware Catalog Crawler, Staging Queue & Real-Time SSE Alerts', { concurrency: false }, () => {
  const createdIds: string[] = [];
  const originalPrices = new Map<string, number>();

  async function findByModel(model: string) {
    const res = await hardwareService.getHardwareItems({ page: 1, limit: 100 });
    return res.items.find((i) => i.model === model)!;
  }

  beforeEach(() => {
    hardwareCrawlerService.resetForTest();
  });

  afterEach(async () => {
    for (const [id, oldPrice] of originalPrices.entries()) {
      await hardwareService.updateHardwareStock(id, { addStock: 0, newPrice: oldPrice }).catch(() => undefined);
    }
    originalPrices.clear();
    for (const id of createdIds.splice(0, createdIds.length)) {
      await hardwareService.softDeleteHardware(id).catch(() => undefined);
    }
    hardwareCrawlerService.resetForTest();
  });

  test('CRAWL-01: Default Staging Mode queues NEW_PRODUCT & PRICE_DROP without mutating catalog until 1-click Approve', async () => {
    const beforeItem = await findByModel('TUF-B760-PLUS-WIFI');
    originalPrices.set(beforeItem.id, beforeItem.price);

    const crawlRes = await hardwareCrawlerService.runCrawlSync({
      source: 'ASUS_VN_B2B',
      actorEmail: 'admin@cyberrig.vn',
    });

    assert.strictEqual(crawlRes.autoApplied, false);
    assert.strictEqual(crawlRes.detectedCount, 2);

    // Price in live catalog must remain unchanged while in PENDING_APPROVAL
    const stillUnchanged = await findByModel('TUF-B760-PLUS-WIFI');
    assert.strictEqual(stillUnchanged.price, beforeItem.price);

    const state = hardwareCrawlerService.getState();
    assert.strictEqual(state.pendingCount, 2);
    assert.strictEqual(state.unreadAlertCount, 2);

    const priceDropItem = state.stagingQueue.find((q) => q.diffType === 'PRICE_DROP')!;
    const newSkuItem = state.stagingQueue.find((q) => q.diffType === 'NEW_PRODUCT')!;
    assert.ok(priceDropItem);
    assert.ok(newSkuItem);

    // Approve price drop -> updates live catalog price
    const approvedPrice = await hardwareCrawlerService.approveCandidate(priceDropItem.id, 'admin@cyberrig.vn');
    assert.strictEqual(approvedPrice.hardware.price, 4290000);

    // Approve new SKU -> creates new HardwareItem in catalog
    const approvedNew = await hardwareCrawlerService.approveCandidate(newSkuItem.id, 'admin@cyberrig.vn');
    createdIds.push(approvedNew.hardware.id);
    assert.ok(approvedNew.hardware.name.includes('RTX 4080 SUPER'));
  });

  test('CRAWL-02: Auto-Apply Mode immediately updates prices and creates new SKUs upon crawl', async () => {
    const gpuBefore = await findByModel('GV-N4070WF3OC-12GD');
    originalPrices.set(gpuBefore.id, gpuBefore.price);
    const uniqueModel = `RYZEN-9-9950X3D-${Date.now().toString(36).toUpperCase()}`;

    hardwareCrawlerService.setAutoApply(true);
    const crawlRes = await hardwareCrawlerService.runCrawlSync({
      source: 'MSI_SEA_DISTRIBUTOR',
      actorEmail: 'admin@cyberrig.vn',
      rawItems: [
        {
          model: 'GV-N4070WF3OC-12GD',
          category: 'GPU',
          brand: 'GIGABYTE',
          product_name: 'GIGABYTE GeForce RTX 4070 WINDFORCE OC 12G',
          retail_price_vnd: 15990000,
          stock: 12,
        },
        {
          model: uniqueModel,
          category: 'CPU',
          brand: 'AMD',
          product_name: `AMD Ryzen 9 9950X3D (${uniqueModel})`,
          retail_price_vnd: 18490000,
          stock: 6,
          specs: { socket: 'AM5', tdpWatts: 170, cores: 16, threads: 32 },
        },
      ],
    });

    assert.strictEqual(crawlRes.autoApplied, true);
    assert.strictEqual(crawlRes.detectedCount, 2);
    assert.strictEqual(hardwareCrawlerService.getPendingCount(), 0);

    const createdCpu = crawlRes.items.find((i) => i.diffType === 'NEW_PRODUCT');
    if (createdCpu?.matchedHardwareId) createdIds.push(createdCpu.matchedHardwareId);

    const gpuAfter = await findByModel('GV-N4070WF3OC-12GD');
    assert.strictEqual(gpuAfter.price, 15990000);
  });

  test('CRAWL-03: SSRF Guard blocks private/metadata IPs & External URL fetcher parses JSON and HTML JSON-LD', async () => {
    assert.throws(() => assertSafeCrawlerUrl('http://169.254.169.254/latest/meta-data'), /SSRF/);
    assert.throws(() => assertSafeCrawlerUrl('http://192.168.1.10/feed.json'), /SSRF/);
    assert.throws(() => assertSafeCrawlerUrl('file:///etc/passwd'), /http/);

    const feedServer = await new Promise<http.Server>((resolve) => {
      const s = http.createServer((req, res) => {
        if (req.url === '/html-product') {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<html><head><script type="application/ld+json">
            {"@type":"Product","sku":"NZXT-KRAKEN-360","brand":{"name":"NZXT"},"name":"NZXT Kraken Elite 360 AIO Cooler","offers":{"price":6990000}}
          </script></head></html>`);
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ items: [{ vendor_sku: 'CORSAIR-RM1000E', category: 'PSU', brand: 'Corsair', product_name: 'Corsair RM1000e ATX 3.0 1000W', retail_price_vnd: 4290000, stock: 5 }] }));
      });
      s.listen(0, '127.0.0.1', () => resolve(s));
    });

    const addr = feedServer.address();
    const feedPort = typeof addr === 'object' && addr ? addr.port : 0;

    try {
      const jsonRun = await hardwareCrawlerService.runCrawlSync({
        source: 'CUSTOM_URL',
        customUrl: `http://127.0.0.1:${feedPort}/feed.json`,
        allowLoopbackInTest: true,
      });
      assert.strictEqual(jsonRun.detectedCount, 1);
      assert.strictEqual(jsonRun.items[0].categoryId, 'PSU');

      const htmlRun = await hardwareCrawlerService.runCrawlSync({
        source: 'CUSTOM_URL',
        customUrl: `http://127.0.0.1:${feedPort}/html-product`,
        allowLoopbackInTest: true,
      });
      assert.strictEqual(htmlRun.detectedCount, 1);
      assert.strictEqual(htmlRun.items[0].categoryId, 'COOLER');
    } finally {
      await new Promise<void>((resolve) => feedServer.close(() => resolve()));
    }
  });

  test('CRAWL-04: /api/admin/crawler/* endpoints enforce ADMIN RBAC and support mark-read & reject workflow', async () => {
    const server = await new Promise<http.Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 4000;

    const adminToken = signAccessToken({ userId: 'adm-crw-1', email: 'admin@cyberrig.vn', role: 'ADMIN', fullName: 'Admin' });
    const custToken = signAccessToken({ userId: 'cst-crw-1', email: 'cust@cyberrig.vn', role: 'CUSTOMER', fullName: 'Cust' });

    try {
      const unauth = await fetch(`http://localhost:${port}/api/admin/crawler/state`);
      assert.strictEqual(unauth.status, 401);

      const forbidden = await fetch(`http://localhost:${port}/api/admin/crawler/run`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${custToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'GEARVN_RETAIL_PULSE' }),
      });
      assert.strictEqual(forbidden.status, 403);

      const runRes = await fetch(`http://localhost:${port}/api/admin/crawler/run`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'GEARVN_RETAIL_PULSE', autoApply: false }),
      });
      assert.strictEqual(runRes.status, 200);
      const runJson = (await runRes.json()) as {
        success: boolean;
        data: { detectedCount: number; items: Array<{ id: string }>; state: { unreadAlertCount: number } };
      };
      assert.strictEqual(runJson.success, true);
      assert.strictEqual(runJson.data.detectedCount, 2);
      assert.ok(runJson.data.state.unreadAlertCount >= 2);

      const rejectRes = await fetch(
        `http://localhost:${port}/api/admin/crawler/candidates/${runJson.data.items[0].id}/reject`,
        { method: 'POST', headers: { Authorization: `Bearer ${adminToken}` } }
      );
      assert.strictEqual(rejectRes.status, 200);

      const readRes = await fetch(`http://localhost:${port}/api/admin/crawler/notifications/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.strictEqual(readRes.status, 200);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
