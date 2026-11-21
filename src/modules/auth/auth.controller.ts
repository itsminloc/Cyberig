/**
 * CyberRig Authentication REST Controller
 * Handles user registration, login, HttpOnly Refresh Token cookies, token rotation, logout, and 2FA TOTP.
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../../core/config';
import {
  buildRefreshTokenCookie,
  buildClearRefreshCookie,
  parseCookies,
  REFRESH_COOKIE_NAME,
} from '../../core/security';
import { resolveClientIp } from '../../core/middlewares/rate-limiter.middleware';
import { AuthService, authService } from './auth.service';
import { MfaService, mfaService } from './mfa.service';
import { LoginDto, RegisterDto } from './user.model';

const REFRESH_COOKIE_MAX_AGE_SEC = 7 * 24 * 60 * 60;

export class AuthController {
  constructor(
    private readonly service: AuthService = authService,
    private readonly mfa: MfaService = mfaService
  ) {}

  private setRefreshCookie(res: Response, token: string): void {
    res.setHeader(
      'Set-Cookie',
      buildRefreshTokenCookie(token, REFRESH_COOKIE_MAX_AGE_SEC, config.env === 'production')
    );
  }

  /**
   * POST /api/auth/register (HTTP 201)
   */
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto: RegisterDto = req.body;
      const tokens = await this.service.register(dto);
      this.setRefreshCookie(res, tokens.refreshToken);

      res.status(201).json({
        success: true,
        data: tokens,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/auth/login (HTTP 200)
   */
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto: LoginDto = req.body;
      const tokens = await this.service.login(dto, { ipAddress: resolveClientIp(req) });
      this.setRefreshCookie(res, tokens.refreshToken);

      res.status(200).json({
        success: true,
        data: tokens,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/auth/refresh (HTTP 200)
   * Reads Refresh Token from HttpOnly Cookie (preferred) or request body and rotates both tokens.
   */
  refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cookies = parseCookies(req.headers.cookie);
      const token = cookies[REFRESH_COOKIE_NAME] || req.body?.refreshToken || req.body?.token;
      const result = await this.service.refreshToken(token, { ipAddress: resolveClientIp(req) });
      this.setRefreshCookie(res, result.refreshToken);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/auth/logout (HTTP 200, guarded)
   * Revokes Refresh Token in Redis, blacklists current Access Token jti, and clears HttpOnly Cookie.
   */
  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (userId) {
        await this.service.logout(userId, {
          jti: req.user?.jti,
          exp: req.user?.exp,
          email: req.user?.email,
          role: req.user?.role,
          ipAddress: resolveClientIp(req),
        });
      }

      res.setHeader('Set-Cookie', buildClearRefreshCookie(config.env === 'production'));
      res.status(200).json({
        success: true,
        message: 'Đăng xuất và thu hồi phiên thành công.',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/auth/me (HTTP 200, guarded)
   */
  getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Vui lòng đăng nhập để tiếp tục.',
          },
        });
        return;
      }

      const [profile, mfaEnabled] = await Promise.all([
        this.service.getProfile(userId),
        this.mfa.isMfaEnabled(userId),
      ]);

      res.status(200).json({
        success: true,
        data: { ...profile, mfaEnabled },
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/auth/2fa/setup (HTTP 200, guarded)
   */
  setupMfa = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.mfa.setupMfa(req.user!.userId, req.user!.email);
      res.status(200).json({
        success: true,
        message: 'Khởi tạo bí mật TOTP thành công. Quét mã QR bằng Google Authenticator và xác nhận qua /2fa/verify.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/auth/2fa/verify (HTTP 200, guarded)
   */
  verifyMfa = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const code = String(req.body?.totpCode || req.body?.code || '');
      const result = await this.mfa.verifyAndEnableMfa(
        req.user!.userId,
        req.user!.email,
        req.user!.role,
        code,
        resolveClientIp(req)
      );
      res.status(200).json({
        success: true,
        message: 'Kích hoạt bảo mật 2 lớp (2FA TOTP) thành công.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/auth/2fa/disable (HTTP 200, guarded)
   */
  disableMfa = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const code = String(req.body?.totpCode || req.body?.code || '');
      const result = await this.mfa.disableMfa(
        req.user!.userId,
        req.user!.email,
        req.user!.role,
        code,
        resolveClientIp(req)
      );
      res.status(200).json({
        success: true,
        message: 'Đã tắt bảo mật 2 lớp (2FA TOTP).',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const authController = new AuthController();
export default authController;
