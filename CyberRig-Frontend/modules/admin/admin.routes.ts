/**
 * Admin Inventory Control Routes
 * Protected by JWT Authentication and RBAC (ADMIN role only).
 * Aligned with Task BE-PORTALS specification.
 */

import { Router } from 'express';
import { authenticateToken, requireRoles } from '../../core/middlewares/auth.middleware';
import { adminController } from './admin.controller';

export const adminRouter: Router = Router();

// Bắt buộc đi qua cả 2 middleware: authenticateToken VÀ requireRoles('ADMIN')
adminRouter.use(authenticateToken);
adminRouter.use(requireRoles('ADMIN'));

// 1. Thêm linh kiện mới vào kho
adminRouter.post('/hardware', (req, res, next) => adminController.createHardware(req, res, next));

// 2. Nhập thêm hàng (Restock) & Cập nhật giá
adminRouter.patch('/hardware/:id/stock', (req, res, next) => adminController.restockHardware(req, res, next));

// 3. Ngừng kinh doanh linh kiện (Soft Delete)
adminRouter.delete('/hardware/:id', (req, res, next) => adminController.deleteHardware(req, res, next));

export default adminRouter;
