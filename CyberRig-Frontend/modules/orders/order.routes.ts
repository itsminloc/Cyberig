/**
 * Orders REST API Router
 * Aligned with Task BE-09 specification.
 */

import { Router } from 'express';
import { orderController } from './order.controller';
import { orderRateLimiter } from '../../core/middlewares/rate-limiter.middleware';
import { optionalAuthenticate } from '../../core/middlewares/auth.middleware';

export const orderRouter: Router = Router();

// POST /api/orders - Tạo đơn hàng mới, khóa tạm tồn kho qua Redis (hỗ trợ cả Authenticated & Guest)
orderRouter.post('/', orderRateLimiter, optionalAuthenticate, orderController.createOrder);

// GET /api/orders/:id - Lấy chi tiết đơn hàng kèm Price Snapshot
orderRouter.get('/:id', orderController.getOrder);

// POST /api/orders/:id/confirm - Xác nhận đơn hàng, trừ tồn kho vật lý
orderRouter.post('/:id/confirm', orderController.confirmOrder);

// POST /api/orders/:id/cancel - Hủy đơn hàng, giải phóng khóa tạm Redis
orderRouter.post('/:id/cancel', orderController.cancelOrder);

export default orderRouter;
