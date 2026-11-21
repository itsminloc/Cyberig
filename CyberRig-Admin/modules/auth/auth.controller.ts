/**
 * CyberRig Authentication REST Controller
 * Handles HTTP requests for user identity, sessions, and profile.
 * Aligned with Task AUTH-01 specification.
 */

import { Request, Response, NextFunction } from 'express';
import { AuthService, authService } from './auth.service';
import { LoginDto, RegisterDto } from './user.model';

export class AuthController {
  constructor(private readonly service: AuthService = authService) {}

  /**
   * POST /api/auth/register (HTTP 201)
   */
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto: RegisterDto = req.body;
      const tokens = await this.service.register(dto);

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
      const tokens = await this.service.login(dto);

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
   */
  refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const refreshToken = req.body?.refreshToken || req.body?.token;
      const result = await this.service.refreshToken(refreshToken);

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
   */
  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (userId) {
        await this.service.logout(userId);
      }

      res.status(200).json({
        success: true,
        message: 'Đăng xuất thành công.',
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

      const profile = await this.service.getProfile(userId);

      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const authController = new AuthController();
export default authController;
