/**
 * Orders REST API Router
 * Hardened with Redis Rate Limiter, Optional Auth (IDOR ownership check),
 * and HMAC-SHA256 Webhook verification on payment confirmation.
 */

import { Router } from 'express';
import { orderController } from './order.controller';
import { orderRateLimiter } from '../../core/middlewares/rate-limiter.middleware';
import { optionalAuthenticate } from '../../core/middlewares/auth.middleware';

export const orderRouter: Router = Router();

// POST /api/orders - Tạo đơn hàng mới, khóa tạm tồn kho qua Redis (hỗ trợ cả Authenticated & Guest)
orderRouter.post('/', orderRateLimiter, optionalAuthenticate, orderController.createOrder);

// GET /api/orders/:id - Lấy chi tiết đơn hàng (kiểm tra quyền sở hữu / chống IDOR)
orderRouter.get('/:id', optionalAuthenticate, orderController.getOrder);

// POST /api/orders/:id/confirm - Xác nhận đơn hàng (yêu cầu chữ ký HMAC-SHA256 Webhook hoặc quyền ADMIN)
orderRouter.post('/:id/confirm', optionalAuthenticate, orderController.confirmOrder);

// POST /api/orders/:id/simulate-payment - Kênh giả lập Webhook VietQR (CHỈ bật ở môi trường Dev/Demo)
orderRouter.post('/:id/simulate-payment', optionalAuthenticate, orderController.simulatePayment);

// POST /api/orders/:id/cancel - Hủy đơn hàng (kiểm tra quyền sở hữu, giải phóng khóa Redis)
orderRouter.post('/:id/cancel', optionalAuthenticate, orderController.cancelOrder);

export default orderRouter;
