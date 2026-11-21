/**
 * CyberRig Authentication Routes Module
 * Defines endpoints for registration, login, token rotation, logout, and profile lookup.
 * Aligned with Task AUTH-01 specification.
 */

import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticateToken } from '../../core/middlewares/auth.middleware';

export const authRouter = Router();

// Public routes
authRouter.post('/register', authController.register);
authRouter.post('/login', authController.login);
authRouter.post('/refresh', authController.refreshToken);

// Protected routes (require valid JWT Access Token)
authRouter.post('/logout', authenticateToken, authController.logout);
authRouter.get('/me', authenticateToken, authController.getProfile);

export default authRouter;
