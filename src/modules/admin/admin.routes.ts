/**
 * Admin Inventory Control Routes
 * Protected by JWT Authentication and RBAC (ADMIN role only).
 * Aligned with Task BE-PORTALS specification.
 */

import { Router } from 'express';
import { authenticateToken, requireRoles } from '../../core/middlewares/auth.middleware';
import { adminController } from './admin.controller';
import { adminCrawlerController } from './admin-crawler.controller';

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

// 4. Hardware Catalog Crawler, Price-Diff Staging Queue & Real-time Alert APIs
adminRouter.get('/crawler/state', (req, res) => adminCrawlerController.getCrawlerState(req, res));
adminRouter.post('/crawler/run', (req, res, next) => adminCrawlerController.runCrawl(req, res, next));
adminRouter.patch('/crawler/settings', (req, res) => adminCrawlerController.updateSettings(req, res));
adminRouter.post('/crawler/candidates/:id/approve', (req, res, next) =>
  adminCrawlerController.approveCandidate(req, res, next)
);
adminRouter.post('/crawler/approve-all', (req, res, next) =>
  adminCrawlerController.approveAll(req, res, next)
);
adminRouter.post('/crawler/candidates/:id/reject', (req, res, next) =>
  adminCrawlerController.rejectCandidate(req, res, next)
);
adminRouter.post('/crawler/notifications/read', (req, res) =>
  adminCrawlerController.markAlertsRead(req, res)
);

export default adminRouter;
