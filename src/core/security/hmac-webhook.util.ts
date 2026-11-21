/**
 * HMAC-SHA256 Webhook Signature Utility
 * Verifies payment gateway webhooks (VietQR Napas 247) with constant-time comparison
 * and timestamp tolerance to prevent forged confirmations and replay attacks.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

export const WEBHOOK_SIGNATURE_HEADER = 'x-cyberrig-signature';
export const WEBHOOK_TIMESTAMP_HEADER = 'x-cyberrig-timestamp';
export const DEFAULT_REPLAY_TOLERANCE_SEC = 300; // 5 minutes

export interface WebhookVerificationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Computes an HMAC-SHA256 hex digest for `${timestamp}.${payload}`.
 */
export function signWebhookPayload(
  secret: string,
  timestampSec: number,
  payload: string
): string {
  return createHmac('sha256', secret)
    .update(`${timestampSec}.${payload}`, 'utf8')
    .digest('hex');
}

/**
 * Helper to generate signed headers for trusted webhook dispatchers and tests.
 */
export function buildWebhookHeaders(
  secret: string,
  payload: string,
  timestampSec: number = Math.floor(Date.now() / 1000)
): Record<string, string> {
  const signature = signWebhookPayload(secret, timestampSec, payload);
  return {
    [WEBHOOK_TIMESTAMP_HEADER]: String(timestampSec),
    [WEBHOOK_SIGNATURE_HEADER]: `sha256=${signature}`,
  };
}

/**
 * Verifies incoming HMAC-SHA256 webhook headers against the raw request payload.
 */
export function verifyWebhookSignature(
  secret: string,
  timestampHeader: string | string[] | undefined,
  signatureHeader: string | string[] | undefined,
  payload: string,
  toleranceSec: number = DEFAULT_REPLAY_TOLERANCE_SEC,
  nowSec: number = Math.floor(Date.now() / 1000)
): WebhookVerificationResult {
  const tsStr = Array.isArray(timestampHeader) ? timestampHeader[0] : timestampHeader;
  const sigStr = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;

  if (!tsStr || !sigStr) {
    return { valid: false, reason: 'Thiếu header chữ ký xác thực Webhook (X-CyberRig-Signature / X-CyberRig-Timestamp).' };
  }

  const tsNum = Number(tsStr);
  if (!Number.isFinite(tsNum) || tsNum <= 0) {
    return { valid: false, reason: 'Timestamp của Webhook không hợp lệ.' };
  }

  if (Math.abs(nowSec - tsNum) > toleranceSec) {
    return { valid: false, reason: 'Webhook đã hết hạn hoặc nghi ngờ Replay Attack (lệch quá 300 giây).' };
  }

  const providedHex = sigStr.trim().replace(/^sha256=/i, '');
  if (!/^[a-f0-9]{64}$/i.test(providedHex)) {
    return { valid: false, reason: 'Định dạng chữ ký HMAC-SHA256 không hợp lệ.' };
  }

  const expectedHex = signWebhookPayload(secret, tsNum, payload);
  const providedBuf = Buffer.from(providedHex.toLowerCase(), 'hex');
  const expectedBuf = Buffer.from(expectedHex.toLowerCase(), 'hex');

  if (providedBuf.length !== expectedBuf.length || !timingSafeEqual(providedBuf, expectedBuf)) {
    return { valid: false, reason: 'Chữ ký HMAC-SHA256 của Webhook không khớp.' };
  }

  return { valid: true };
}
