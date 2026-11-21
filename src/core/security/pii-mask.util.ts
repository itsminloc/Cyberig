/**
 * PII Data Masking & Input Sanitization Utilities
 * Complies with Decree 13/2023/ND-CP (Personal Data Protection) on public lookup endpoints
 * and neutralizes Stored/Reflected XSS payloads.
 */

/**
 * Masks Vietnamese mobile/landline numbers: "0901234567" -> "090****567".
 */
export function maskPhone(phone?: string | null): string {
  if (!phone) return '';
  const clean = phone.trim();
  if (clean.length <= 4) return '****';
  if (clean.length <= 6) {
    return `${clean.slice(0, 2)}**${clean.slice(-2)}`;
  }
  return `${clean.slice(0, 3)}${'*'.repeat(Math.max(3, clean.length - 6))}${clean.slice(-3)}`;
}

/**
 * Masks email addresses: "customer@cyberig.vn" -> "cu******@cyberig.vn".
 */
export function maskEmail(email?: string | null): string {
  if (!email) return '';
  const clean = email.trim();
  const atIdx = clean.indexOf('@');
  if (atIdx <= 1) return '***@***';
  const local = clean.slice(0, atIdx);
  const domain = clean.slice(atIdx + 1);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(4, local.length - visible.length))}@${domain}`;
}

/**
 * Masks full names while preserving first & last tokens: "Nguyễn Văn Khách" -> "Nguyễn *** Khách".
 */
export function maskFullName(fullName?: string | null): string {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].length <= 2 ? '**' : `${parts[0][0]}***`;
  }
  if (parts.length === 2) {
    return `${parts[0]} ${parts[1][0]}***`;
  }
  return `${parts[0]} *** ${parts[parts.length - 1]}`;
}

/**
 * Masks street-level address details while keeping city/district suffix.
 */
export function maskAddress(address?: string | null): string {
  if (!address) return '';
  const segments = address.split(',').map((s) => s.trim()).filter(Boolean);
  if (segments.length <= 1) return '*** (Đã ẩn địa chỉ chi tiết)';
  return `***, ${segments.slice(-1)[0]}`;
}

/**
 * Sanitizes free-text user input by stripping HTML tags, script payloads, and control chars.
 */
export function sanitizeTextInput(value: unknown, maxLength = 500): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Normalizes phone numbers for safe equality comparison.
 */
export function normalizePhone(phone?: string | null): string {
  if (!phone) return '';
  return phone.replace(/[\s.\-()]/g, '').trim();
}
