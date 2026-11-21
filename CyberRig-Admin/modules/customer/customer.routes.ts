/**
 * Customer Portal Routes
 * Mounts authenticated routes for personal orders and repair tickets.
 * Aligned with Task BE-PORTALS specification.
 */

import { Router } from 'express';
import { authenticateToken } from '../../core/middlewares/auth.middleware';
import { customerController } from './customer.controller';

export const customerRouter: Router = Router();

// All Customer Portal routes require valid JWT authentication
customerRouter.use(authenticateToken);

// 1. Lịch sử mua hàng kèm chi tiết linh kiện
customerRouter.get('/orders', (req, res, next) => customerController.getMyOrders(req, res, next));

// 2. Lịch sử sửa chữa / bảo hành kèm timeline
customerRouter.get('/tickets', (req, res, next) => customerController.getMyTickets(req, res, next));

export default customerRouter;
