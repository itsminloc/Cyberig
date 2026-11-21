/**
 * CyberRig JWT Utility
 * Signs and verifies Access Tokens (15m) and Refresh Tokens (7d).
 * Aligned with Task AUTH-01 specification.
 */

import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../../core/config';
import { UnauthorizedError } from '../../core/errors/domain.error';
import { JwtAuthPayload, UserRole } from './user.model';

const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

/**
 * Signs a short-lived access token (15 minutes).
 */
export function signAccessToken(payload: JwtAuthPayload): string {
  const secret = config.security.jwtSecret;
  const options: SignOptions = { expiresIn: ACCESS_TOKEN_EXPIRES_IN };
  return jwt.sign({ ...payload }, secret, options);
}

/**
 * Signs a long-lived refresh token (7 days).
 */
export function signRefreshToken(payload: JwtAuthPayload): string {
  const secret = config.security.jwtRefreshSecret;
  const options: SignOptions = { expiresIn: REFRESH_TOKEN_EXPIRES_IN };
  return jwt.sign({ ...payload }, secret, options);
}

/**
 * Verifies an access token and returns its decoded payload.
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
 * Verifies a refresh token and returns its decoded payload.
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
    };
  } catch (err) {
    const error = err as Error;
    if (error.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Refresh token đã hết hạn. Vui lòng đăng nhập lại.');
    }
    throw new UnauthorizedError('Refresh token không hợp lệ.');
  }
}
