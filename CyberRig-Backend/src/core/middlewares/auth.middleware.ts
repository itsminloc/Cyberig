/**
 * CyberRig Authentication & 3-Role RBAC Middleware
 * Validates JWT Access Tokens and enforces role permissions (CUSTOMER, TECHNICIAN, ADMIN).
 * Aligned with Task AUTH-01 specification.
 */

import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '../errors/domain.error';
import { verifyAccessToken } from '../../modules/auth/jwt.util';
import { JwtAuthPayload, UserRole } from '../../modules/auth/user.model';

declare global {
  namespace Express {
    interface Request {
      user?: JwtAuthPayload;
    }
  }
}

/**
 * Middleware: Verifies Bearer JWT Access Token and attaches decoded user to Request.
 */
export function authenticateToken(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader || typeof authHeader !== 'string') {
      throw new UnauthorizedError('Vui lòng đăng nhập để tiếp tục.');
    }

    const parts = authHeader.trim().split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      throw new UnauthorizedError('Định dạng header Authorization không hợp lệ. Chuẩn: Bearer <token>.');
    }

    const token = parts[1];
    const decoded = verifyAccessToken(token);

    req.user = decoded;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware Factory: Enforces RBAC permissions based on allowed roles.
 */
export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Vui lòng đăng nhập để tiếp tục.');
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new ForbiddenError('Bạn không có quyền thực hiện hành động này.');
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Middleware: Optional Authentication (supports Guest Checkout).
 * If Authorization header is present with a valid Bearer token, populates req.user.
 * If missing or invalid, silently proceeds without setting req.user.
 */
export function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader || typeof authHeader !== 'string') {
      return next();
    }

    const parts = authHeader.trim().split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      const token = parts[1];
      try {
        const decoded = verifyAccessToken(token);
        req.user = decoded;
      } catch {
        // Invalid or expired token: proceed as unauthenticated guest
      }
    }

    next();
  } catch {
    next();
  }
}

export default authenticateToken;
