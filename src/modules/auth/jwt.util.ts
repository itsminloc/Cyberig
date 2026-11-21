/**
 * CyberRig JWT Utility
 * Signs and verifies Access Tokens (15m) and Refresh Tokens (7d).
 * Aligned with Task AUTH-01 specification.
 */

import { randomUUID } from 'node:crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../../core/config';
import { UnauthorizedError } from '../../core/errors/domain.error';
import { JwtAuthPayload, UserRole } from './user.model';

const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

/**
 * Signs a short-lived access token (15 minutes) with unique jti for revocation support.
 */
export function signAccessToken(payload: JwtAuthPayload): string {
  const secret = config.security.jwtSecret;
  const jti = payload.jti || randomUUID();
  const options: SignOptions = { expiresIn: ACCESS_TOKEN_EXPIRES_IN };
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      fullName: payload.fullName,
      jti,
    },
    secret,
    options
  );
}

/**
 * Signs a long-lived refresh token (7 days) with unique jti and session familyId for rotation.
 */
export function signRefreshToken(payload: JwtAuthPayload): string {
  const secret = config.security.jwtRefreshSecret;
  const jti = payload.jti || randomUUID();
  const familyId = payload.familyId || randomUUID();
  const options: SignOptions = { expiresIn: REFRESH_TOKEN_EXPIRES_IN };
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      fullName: payload.fullName,
      jti,
      familyId,
    },
    secret,
    options
  );
}

/**
 * Verifies an access token and returns its decoded payload including jti & exp.
 * Throws UnauthorizedError if token is invalid or expired.
 */
export function verifyAccessToken(token: string): JwtAuthPayload {
  try {
    const secret = config.security.jwtSecret;
    const decoded = jwt.verify(token, secret) as JwtAuthPayload & { iat?: number; exp?: number };

    if (!decoded.userId || !decoded.email || !decoded.role) {
      throw new UnauthorizedError('Token không chứa đủ thông tin định danh.');
    }

    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role as UserRole,
      fullName: decoded.fullName || '',
      jti: decoded.jti,
      exp: decoded.exp,
    };
  } catch (err) {
    const error = err as Error;
    if (error.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Phiên đăng nhập đã hết hạn. Vui lòng làm mới token hoặc đăng nhập lại.');
    }
    throw new UnauthorizedError('Token xác thực không hợp lệ.');
  }
}

/**
 * Verifies a refresh token and returns its decoded payload including jti & familyId.
 * Throws UnauthorizedError if token is invalid or expired.
 */
export function verifyRefreshToken(token: string): JwtAuthPayload {
  try {
    const secret = config.security.jwtRefreshSecret;
    const decoded = jwt.verify(token, secret) as JwtAuthPayload & { iat?: number; exp?: number };

    if (!decoded.userId || !decoded.email || !decoded.role) {
      throw new UnauthorizedError('Refresh token không chứa đủ thông tin định danh.');
    }

    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role as UserRole,
      fullName: decoded.fullName || '',
      jti: decoded.jti,
      familyId: decoded.familyId,
      exp: decoded.exp,
    };
  } catch (err) {
    const error = err as Error;
    if (error.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Refresh token đã hết hạn. Vui lòng đăng nhập lại.');
    }
    throw new UnauthorizedError('Refresh token không hợp lệ.');
  }
}
