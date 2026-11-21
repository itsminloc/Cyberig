/**
 * Customer Portal Controller
 * Provides personalized data endpoints for authenticated customers (Orders & Repair Tickets history).
 * Aligned with Task BE-PORTALS specification.
 */

import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../../core/errors/domain.error';
import { orderService } from '../orders/order.service';
import { ticketService } from '../repair-tickets/ticket.service';

export class CustomerController {
  /**
   * GET /api/customer/orders
   * Retrieves order history with price snapshot and item details for the authenticated customer.
   */
  async getMyOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        throw new UnauthorizedError('Vui lòng đăng nhập để xem lịch sử đơn hàng.');
      }

      const orders = await orderService.getCustomerOrders(req.user.userId);
      res.status(200).json({
        success: true,
        data: orders,
        meta: {
          total: orders.length,
          customerId: req.user.userId,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/customer/tickets
   * Retrieves repair/warranty ticket history with timeline for the authenticated customer.
   */
  async getMyTickets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        throw new UnauthorizedError('Vui lòng đăng nhập để xem lịch sử sửa chữa.');
      }

      const tickets = await ticketService.getCustomerTickets(req.user.userId);
      res.status(200).json({
        success: true,
        data: tickets,
        meta: {
          total: tickets.length,
          customerId: req.user.userId,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const customerController = new CustomerController();
export default customerController;
