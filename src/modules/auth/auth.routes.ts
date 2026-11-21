/**
 * CyberRig Authentication Routes Module
 * Defines endpoints for registration, login, token rotation, logout, profile, and 2FA TOTP
 * protected with Redis Brute-Force Rate Limiting.
 */

import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticateToken } from '../../core/middlewares/auth.middleware';
import { authRateLimiter } from '../../core/middlewares/rate-limiter.middleware';

export const authRouter = Router();

// Public routes hardened with brute-force rate limiter (15 req / 15 min per IP)
authRouter.post('/register', authRateLimiter, authController.register);
authRouter.post('/login', authRateLimiter, authController.login);
authRouter.post('/refresh', authRateLimiter, authController.refreshToken);

// Protected routes (require valid, non-revoked JWT Access Token)
authRouter.post('/logout', authenticateToken, authController.logout);
authRouter.get('/me', authenticateToken, authController.getProfile);

// Multi-Factor Authentication (TOTP 2FA - RFC 6238)
authRouter.post('/2fa/setup', authenticateToken, authController.setupMfa);
authRouter.post('/2fa/verify', authenticateToken, authController.verifyMfa);
authRouter.post('/2fa/disable', authenticateToken, authController.disableMfa);

export default authRouter;
