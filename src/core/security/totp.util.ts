/**
 * RFC 6238 TOTP (Time-based One-Time Password) Utility for 2FA / MFA
 * Zero-dependency implementation using Node.js built-in crypto, 100% compatible with
 * Google Authenticator, Microsoft Authenticator, and Authy.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encodes a Buffer into an RFC 4648 Base32 string (without padding).
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

/**
 * Decodes an RFC 4648 Base32 string into a Buffer.
 */
export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) {
      throw new Error(`Invalid Base32 character: ${ch}`);
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generates a cryptographically strong 160-bit Base32 TOTP secret.
 */
export function generateTotpSecret(byteLength = 20): string {
  return base32Encode(randomBytes(byteLength));
}

/**
 * Computes a 6-digit RFC 6238 TOTP code for a given Base32 secret and timestamp.
 */
export function generateTotpCode(
  secretBase32: string,
  timestampMs: number = Date.now(),
  stepSec = 30,
  digits = 6
): string {
  const counter = Math.floor(timestampMs / 1000 / stepSec);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  counterBuf.writeUInt32BE(counter >>> 0, 4);

  const key = base32Decode(secretBase32);
  const hmac = createHmac('sha1', key).update(counterBuf).digest();

  const offset = hmac[hmac.length - 1] & 0x0f;
  const binaryCode =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binaryCode % 10 ** digits;
  return String(otp).padStart(digits, '0');
}

/**
 * Verifies a 6-digit TOTP code allowing ±windowSteps clock drift (default ±30s).
 */
export function verifyTotpCode(
  secretBase32: string,
  token: string,
  windowSteps = 1,
  timestampMs: number = Date.now(),
  stepSec = 30
): boolean {
  const normalized = (token || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(normalized)) {
    return false;
  }

  const providedBuf = Buffer.from(normalized, 'utf8');
  for (let delta = -windowSteps; delta <= windowSteps; delta++) {
    const candidate = generateTotpCode(secretBase32, timestampMs + delta * stepSec * 1000, stepSec);
    const candidateBuf = Buffer.from(candidate, 'utf8');
    if (candidateBuf.length === providedBuf.length && timingSafeEqual(candidateBuf, providedBuf)) {
      return true;
    }
  }
  return false;
}

/**
 * Builds an otpauth:// URI compatible with Google Authenticator QR scanning.
 */
export function buildOtpAuthUri(
  accountEmail: string,
  secretBase32: string,
  issuer = 'CyberRig'
): string {
  const label = encodeURIComponent(`${issuer}:${accountEmail}`);
  return `otpauth://totp/${label}?secret=${encodeURIComponent(secretBase32)}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
