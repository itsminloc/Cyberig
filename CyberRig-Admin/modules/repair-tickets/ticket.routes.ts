/**
 * Repair Ticket Express Routes
 * Mounts endpoints on /api/tickets
 */

import { Router } from 'express';
import { ticketController } from './ticket.controller';
import { ticketLookupRateLimiter } from '../../core/middlewares/rate-limiter.middleware';
import { authenticateToken, requireRoles, optionalAuthenticate } from '../../core/middlewares/auth.middleware';

export const ticketRouter: Router = Router();

// Tạo mới phiếu tiếp nhận kiểm tra / sửa chữa (Khách mua tại CyberRig hoặc linh kiện ngoài, Hỗ trợ Guest & Khách đăng nhập)
ticketRouter.post('/', optionalAuthenticate, ticketController.createTicket.bind(ticketController));

// Lấy danh sách phiếu sửa chữa (dành cho Kỹ thuật viên hoặc Admin)
ticketRouter.get(
  '/',
  authenticateToken,
  requireRoles('TECHNICIAN', 'ADMIN'),
  ticketController.listTickets.bind(ticketController)
);

// Tra cứu thông tin & tiến độ phiếu sửa chữa (tối đa 30 req/phút chống brute-force)
ticketRouter.get('/:id/timeline', ticketLookupRateLimiter, ticketController.getTimeline.bind(ticketController));


// Chuyển trạng thái phiếu sửa chữa (yêu cầu quyền TECHNICIAN hoặc ADMIN)
ticketRouter.patch(
  '/:id/status',
  authenticateToken,
  requireRoles('TECHNICIAN', 'ADMIN'),
  ticketController.updateStatus.bind(ticketController)
);

// Tạo báo giá linh kiện sửa chữa (yêu cầu quyền TECHNICIAN hoặc ADMIN)
ticketRouter.post(
  '/:id/quotation',
  authenticateToken,
  requireRoles('TECHNICIAN', 'ADMIN'),
  ticketController.submitQuotation.bind(ticketController)
);

ticketRouter.get('/:id/quotation', ticketLookupRateLimiter, ticketController.getTicketQuotation.bind(ticketController));

export default ticketRouter;

