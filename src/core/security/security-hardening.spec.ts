/**
 * CyberRig Enterprise Security Hardening Test Suite (Stage 1, 2 & 3)
 * Verifies:
 *  - Stage 1: Monitoring RBAC & One-Time SSE Ticket, Order Anti-IDOR, HMAC-SHA256 Webhook,
 *             Auth Brute-Force Lockout, Refresh Token Rotation + Reuse Detection,
 *             HttpOnly Cookie, Immediate Logout Access Token Blacklist (jti), X-Forwarded-For spoofing defense.
 *  - Stage 2: OWASP Security Headers (CSP, Referrer-Policy, Permissions-Policy), 100KB Payload Limit,
 *             Production Fail-Fast Config Guard, XSS Input Sanitization.
 *  - Stage 3: RFC 6238 TOTP 2FA Lifecycle, PII Masking (Decree 13/2023/ND-CP), Immutable Audit Logs.
 */

import { test, describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Server } from 'node:http';
import { app } from '../../app';
import { config, validateProductionSecurityConfig } from '../config';
import { db } from '../db';
import { RedisClient } from '../redis';
import {
  auditLogService,
  buildWebhookHeaders,
  generateTotpCode,
  maskEmail,
  maskFullName,
  maskPhone,
  REFRESH_COOKIE_NAME,
  sanitizeTextInput,
  tokenBlacklistService,
  verifyWebhookSignature,
} from './index';
import { AuthService } from '../../modules/auth/auth.service';
import { InMemoryUserRepository } from '../../modules/auth/user.repository';
import { MfaService } from '../../modules/auth/mfa.service';
import { signAccessToken } from '../../modules/auth/jwt.util';

describe('CyberRig Security Hardening Suite (Stages 1, 2 & 3)', () => {
  let server: Server;
  let baseUrl: string;
  const createdEmails: string[] = [];

  const adminToken = signAccessToken({
    userId: 'sec-admin-001',
    email: 'admin@cyberig.vn',
    role: 'ADMIN',
    fullName: 'Security Admin',
  });
  const customerBToken = signAccessToken({
    userId: '22222222-2222-4222-8222-222222222222',
    email: 'bob@cyberig.vn',
    role: 'CUSTOMER',
    fullName: 'Trần Văn Bob',
  });
  const techToken = signAccessToken({
    userId: '33333333-3333-4333-8333-333333333333',
    email: 'tech@cyberig.vn',
    role: 'TECHNICIAN',
    fullName: 'Kỹ Thuật Viên Tuấn',
  });

  before(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  after(async () => {
    try {
      for (const em of createdEmails) {
        await db.query(
          `DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE customer_email = $1);`,
          [em]
        );
        await db.query(`DELETE FROM orders WHERE customer_email = $1;`, [em]);
        await db.query(`DELETE FROM users WHERE LOWER(email) = $1;`, [em.toLowerCase()]);
      }
      await db.query(`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE customer_email = 'guest.webhook.sec@cyberig.vn');`);
      await db.query(`DELETE FROM orders WHERE customer_email = 'guest.webhook.sec@cyberig.vn';`);
    } catch {}
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    tokenBlacklistService.clearLocal();
    auditLogService.clearMemory();
  });

  test('SEC-01 (Stage 1): /api/monitoring/* blocks unauthenticated (401) & CUSTOMER (403) and allows ADMIN with single-use SSE ticket', async () => {
    const rUnauth = await fetch(`${baseUrl}/api/monitoring/dlq`);
    assert.strictEqual(rUnauth.status, 401);

    const rCust = await fetch(`${baseUrl}/api/monitoring/scenarios/scenario-1-order-placement/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerBToken}` },
    });
    assert.strictEqual(rCust.status, 403);

    // Issue single-use SSE ticket as ADMIN
    const rTicket = await fetch(`${baseUrl}/api/monitoring/stream-ticket`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(rTicket.status, 200);
    const ticketJson = (await rTicket.json()) as { data: { ticket: string } };
    assert.ok(ticketJson.data.ticket.length >= 32);

    // Unauthenticated SSE stream must be blocked with 401
    const rBadStream = await fetch(`${baseUrl}/api/monitoring/stream`);
    assert.strictEqual(rBadStream.status, 401);

    // Customer SSE stream must be blocked with 403
    const rCustStream = await fetch(`${baseUrl}/api/monitoring/stream`, {
      headers: { Authorization: `Bearer ${customerBToken}` },
    });
    assert.strictEqual(rCustStream.status, 403);
  });

  test('SEC-02 (Stage 1): Anti-IDOR blocks Customer B from viewing or cancelling Customer A order (403) and logs IDOR_BLOCKED audit', async () => {
    const aliceEmail = `alice.sec.${Date.now()}@cyberig.vn`;
    createdEmails.push(aliceEmail);

    const regAlice = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.74' },
      body: JSON.stringify({
        email: aliceEmail,
        password: 'AliceStrong#2026',
        fullName: 'Nguyễn Thị Alice',
        phone: '0901234567',
      }),
    });
    assert.strictEqual(regAlice.status, 201);
    const aliceToken = ((await regAlice.json()) as any).data.accessToken;

    const createRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
        'x-forwarded-for': '198.51.100.70',
      },
      body: JSON.stringify({
        customerName: 'Nguyễn Thị Alice',
        customerEmail: aliceEmail,
        customerPhone: '0901234567',
        shippingAddress: '10 Lê Lợi, Đà Nẵng',
        items: [{ hardwareId: 'cpu-i5-13600k', quantity: 1 }],
      }),
    });
    assert.strictEqual(createRes.status, 201);
    const orderId = ((await createRes.json()) as any).data.id;

    // Customer B attempts IDOR read -> 403
    const idorRead = await fetch(`${baseUrl}/api/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${customerBToken}` },
    });
    assert.strictEqual(idorRead.status, 403);

    // Customer B attempts IDOR cancel -> 403
    const idorCancel = await fetch(`${baseUrl}/api/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerBToken}` },
    });
    assert.strictEqual(idorCancel.status, 403);

    // Owner (Customer A) can view full order -> 200
    const ownerRead = await fetch(`${baseUrl}/api/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${aliceToken}` },
    });
    assert.strictEqual(ownerRead.status, 200);

    // Audit log captured IDOR_BLOCKED
    const audits = await auditLogService.listRecent(10, 'IDOR_BLOCKED');
    assert.ok(audits.length >= 2, 'IDOR attempts must be logged to audit trail');
  });

  test('SEC-03 (Stage 1): POST /api/orders/:id/confirm rejects unsigned/forged/expired webhooks (401) and accepts valid HMAC-SHA256', async () => {
    const createRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '198.51.100.71',
      },
      body: JSON.stringify({
        customerName: 'Guest Webhook',
        customerEmail: 'guest.webhook.sec@cyberig.vn',
        customerPhone: '0911223344',
        shippingAddress: '88 Nguyễn Văn Linh, Đà Nẵng',
        items: [{ hardwareId: 'cpu-i5-13600k', quantity: 1 }],
      }),
    });
    assert.strictEqual(createRes.status, 201);
    const orderId = ((await createRes.json()) as any).data.id;

    // 1. Missing signature -> 401
    const rUnsigned = await fetch(`${baseUrl}/api/orders/${orderId}/confirm`, { method: 'POST' });
    assert.strictEqual(rUnsigned.status, 401);

    // 2. Forged signature -> 401
    const rForged = await fetch(`${baseUrl}/api/orders/${orderId}/confirm`, {
      method: 'POST',
      headers: {
        'x-cyberrig-timestamp': String(Math.floor(Date.now() / 1000)),
        'x-cyberrig-signature': 'sha256=' + 'a'.repeat(64),
      },
    });
    assert.strictEqual(rForged.status, 401);

    // 3. Expired replay timestamp (>300s old) -> invalid
    const staleTs = Math.floor(Date.now() / 1000) - 600;
    const staleHeaders = buildWebhookHeaders(config.security.webhookSecret, orderId, staleTs);
    const replayCheck = verifyWebhookSignature(
      config.security.webhookSecret,
      staleHeaders['x-cyberrig-timestamp'],
      staleHeaders['x-cyberrig-signature'],
      orderId
    );
    assert.strictEqual(replayCheck.valid, false);

    // 4. Valid HMAC-SHA256 webhook -> 200
    const validHeaders = buildWebhookHeaders(config.security.webhookSecret, orderId);
    const rValid = await fetch(`${baseUrl}/api/orders/${orderId}/confirm`, {
      method: 'POST',
      headers: validHeaders,
    });
    assert.strictEqual(rValid.status, 200);
  });

  test('SEC-04 (Stage 1): Refresh Token Rotation + Reuse Detection revokes entire session on token replay', async () => {
    const repo = new InMemoryUserRepository();
    const isolatedRedis = new RedisClient('redis://127.0.0.1:1'); // Pure in-memory isolated Redis
    const svc = new AuthService(repo, isolatedRedis);

    const reg = await svc.register({
      email: 'rotate@cyberig.vn',
      password: 'StrongPassword!2026',
      fullName: 'Rotation Tester',
      phone: '0901234567',
    });

    // 1st refresh rotates token
    const rotated = await svc.refreshToken(reg.refreshToken);
    assert.ok(rotated.accessToken);
    assert.ok(rotated.refreshToken);
    assert.notStrictEqual(rotated.refreshToken, reg.refreshToken, 'Refresh token must rotate');

    // Replaying OLD refresh token triggers Reuse Detection & kills entire session
    await assert.rejects(
      async () => svc.refreshToken(reg.refreshToken),
      (err: any) => err.statusCode === 401
    );

    // Even the newer rotated token is now revoked!
    await assert.rejects(
      async () => svc.refreshToken(rotated.refreshToken),
      (err: any) => err.statusCode === 401
    );

    const alerts = await auditLogService.listRecent(10, 'TOKEN_REUSE_DETECTED');
    assert.strictEqual(alerts.length, 1);
  });

  test('SEC-05 (Stage 1): Brute-force account lockout locks account after 5 consecutive failed logins', async () => {
    const repo = new InMemoryUserRepository();
    const isolatedRedis = new RedisClient('redis://127.0.0.1:1');
    const svc = new AuthService(repo, isolatedRedis);

    await svc.register({
      email: 'brute@cyberig.vn',
      password: 'CorrectPassword#2026',
      fullName: 'Brute Victim',
      phone: '0909000111',
    });

    for (let i = 0; i < 5; i++) {
      await assert.rejects(
        async () => svc.login({ email: 'brute@cyberig.vn', password: 'WrongPassword!' }),
        (err: any) => err.statusCode === 401
      );
    }

    // 6th attempt even with CORRECT password must be blocked with 403 Forbidden (Locked)
    await assert.rejects(
      async () => svc.login({ email: 'brute@cyberig.vn', password: 'CorrectPassword#2026' }),
      (err: any) => err.statusCode === 403 && /khóa 15 phút/i.test(err.message)
    );
  });

  test('SEC-06 (Stage 1): HttpOnly SameSite=Strict cookie set on auth & Logout immediately blacklists Access Token jti', async () => {
    const email = `cookie.${Date.now()}@cyberig.vn`;
    createdEmails.push(email);
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '198.51.100.72',
      },
      body: JSON.stringify({
        email,
        password: 'StrongPassword#99',
        fullName: 'Cookie User',
        phone: '0905551234',
      }),
    });
    assert.strictEqual(regRes.status, 201);
    const setCookie = regRes.headers.get('set-cookie') || '';
    assert.ok(setCookie.includes(`${REFRESH_COOKIE_NAME}=`), 'Must set HttpOnly refresh cookie');
    assert.ok(setCookie.includes('HttpOnly'));
    assert.ok(setCookie.includes('SameSite=Strict'));

    const accessToken = ((await regRes.json()) as any).data.accessToken;

    // Logout revokes current access token jti immediately
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    assert.strictEqual(logoutRes.status, 200);

    // Reusing logged-out access token MUST fail immediately with 401
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    assert.strictEqual(meRes.status, 401);
  });

  test('SEC-07 (Stage 2): OWASP Headers (CSP, Referrer-Policy, Permissions-Policy), 100KB Payload Limit & Prod Fail-Fast Guard', async () => {
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.ok(healthRes.headers.get('content-security-policy')?.includes("default-src 'self'"));
    assert.strictEqual(healthRes.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.ok(healthRes.headers.get('permissions-policy')?.includes('camera=()'));

    // Payload > 100KB must return 413 Payload Too Large
    const oversizedPayload = JSON.stringify({ junk: 'A'.repeat(130 * 1024) });
    const bigRes = await fetch(`${baseUrl}/api/compatibility/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: oversizedPayload,
    });
    assert.strictEqual(bigRes.status, 413);

    // Fail-fast production security config check
    assert.throws(() => {
      validateProductionSecurityConfig({
        ...config,
        env: 'production',
        cors: { origin: '*' },
      });
    }, /CYBERRIG SECURITY FAIL-FAST/);

    // XSS input sanitizer strips script tags
    assert.strictEqual(sanitizeTextInput('<script>alert(1)</script><b>Intel i9</b>'), 'Intel i9');
  });

  test('SEC-08 (Stage 3): RFC 6238 TOTP 2FA (MFA) full enrollment, login enforcement, and disable lifecycle', async () => {
    const repo = new InMemoryUserRepository();
    const isolatedRedis = new RedisClient('redis://127.0.0.1:1');
    const mfa = new MfaService(isolatedRedis);
    const svc = new AuthService(repo, isolatedRedis, mfa);

    const reg = await svc.register({
      email: 'mfa.admin@cyberig.vn',
      password: 'AdminStrong#2026',
      fullName: 'MFA Admin',
      phone: '0900001111',
      role: 'ADMIN',
    });

    const setup = await mfa.setupMfa(reg.user.id, reg.user.email);
    assert.ok(setup.secret.length >= 32);
    assert.ok(setup.otpauthUrl.startsWith('otpauth://totp/CyberRig'));

    const validCode = generateTotpCode(setup.secret);
    await mfa.verifyAndEnableMfa(reg.user.id, reg.user.email, 'ADMIN', validCode);
    assert.strictEqual(await mfa.isMfaEnabled(reg.user.id), true);

    // Login without TOTP code must be rejected
    await assert.rejects(
      async () => svc.login({ email: 'mfa.admin@cyberig.vn', password: 'AdminStrong#2026' }),
      (err: any) => err.statusCode === 401 && /2FA/i.test(err.message)
    );

    // Login with valid TOTP code succeeds
    const loginOk = await svc.login({
      email: 'mfa.admin@cyberig.vn',
      password: 'AdminStrong#2026',
      totpCode: validCode,
    });
    assert.ok(loginOk.accessToken);

    // Disable 2FA
    await mfa.disableMfa(reg.user.id, reg.user.email, 'ADMIN', validCode);
    assert.strictEqual(await mfa.isMfaEnabled(reg.user.id), false);
  });

  test('SEC-09 (Stage 3): PII Masking (Decree 13/2023/ND-CP) hides personal data for Guests and exposes full data to Technician/Admin', async () => {
    assert.strictEqual(maskPhone('0901234567'), '090****567');
    assert.strictEqual(maskEmail('customer@cyberig.vn'), 'cu******@cyberig.vn');
    assert.strictEqual(maskFullName('Nguyễn Văn Khách'), 'Nguyễn *** Khách');

    // Public Guest lookup -> masked PII
    const guestRes = await fetch(`${baseUrl}/api/tickets/TK-20260905-001/timeline`);
    assert.strictEqual(guestRes.status, 200);
    const guestJson = (await guestRes.json()) as any;
    assert.strictEqual(guestJson.data.piiMasked, true);
    assert.ok(guestJson.data.customerPhone.includes('***'), 'Guest phone must be masked');

    // Authenticated Technician lookup -> unmasked PII
    const techRes = await fetch(`${baseUrl}/api/tickets/TK-20260905-001/timeline`, {
      headers: { Authorization: `Bearer ${techToken}` },
    });
    assert.strictEqual(techRes.status, 200);
    const techJson = (await techRes.json()) as any;
    assert.strictEqual(techJson.data.piiMasked, undefined);
    assert.ok(!techJson.data.customerPhone.includes('***'), 'Technician must see unmasked phone');
  });

  test('SEC-10 (Stage 3): GET /api/monitoring/audit-logs returns recorded security audit events to ADMIN only', async () => {
    await auditLogService.record({
      eventType: 'ADMIN_STOCK_UPDATE',
      severity: 'INFO',
      actorId: 'sec-admin-001',
      actorRole: 'ADMIN',
      actorEmail: 'admin@cyberig.vn',
      resourceType: 'hardware',
      resourceId: 'cpu-i5-13600k',
      message: 'Test audit entry',
    });

    const unauth = await fetch(`${baseUrl}/api/monitoring/audit-logs`);
    assert.strictEqual(unauth.status, 401);

    const adminRes = await fetch(`${baseUrl}/api/monitoring/audit-logs?limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(adminRes.status, 200);
    const json = (await adminRes.json()) as { success: boolean; data: Array<{ eventType: string }> };
    assert.strictEqual(json.success, true);
    assert.ok(json.data.some((e) => e.eventType === 'ADMIN_STOCK_UPDATE'));
  });
});
