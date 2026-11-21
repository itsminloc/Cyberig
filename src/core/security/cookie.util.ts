/**
 * HTTP Cookie Parsing & Secure HttpOnly Cookie Builder
 * Zero-dependency RFC 6265 utility for Refresh Token storage in HttpOnly cookies.
 */

export const REFRESH_COOKIE_NAME = 'cyberrig_refresh_token';

/**
 * Parses an HTTP Cookie header string into a key-value map.
 */
export function parseCookies(cookieHeader?: string | string[]): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  const raw = Array.isArray(cookieHeader) ? cookieHeader.join('; ') : cookieHeader;
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (!key) continue;
    try {
      cookies[key] = decodeURIComponent(val);
    } catch {
      cookies[key] = val;
    }
  }
  return cookies;
}

/**
 * Builds a hardened Set-Cookie header for the Refresh Token.
 * Enforces HttpOnly, SameSite=Strict, scoped Path=/api/auth, and Secure in production.
 */
export function buildRefreshTokenCookie(
  token: string,
  maxAgeSeconds: number,
  isProduction: boolean
): string {
  const attributes = [
    `${REFRESH_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/api/auth',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
  ];
  if (isProduction) {
    attributes.push('Secure');
  }
  return attributes.join('; ');
}

/**
 * Builds a Set-Cookie header that immediately expires and clears the Refresh Token cookie.
 */
export function buildClearRefreshCookie(isProduction: boolean): string {
  const attributes = [
    `${REFRESH_COOKIE_NAME}=`,
    'Path=/api/auth',
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  ];
  if (isProduction) {
    attributes.push('Secure');
  }
  return attributes.join('; ');
}
