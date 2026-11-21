/**
 * Orders REST API Controller
 * Handles customer checkout, order query, and order confirmation/cancellation.
 * Aligned with Task BE-09 specification.
 */

import { Request, Response, NextFunction } from 'express';
import { orderService, OrderService } from './order.service';
import { CreateOrderDto } from './order.model';

export class OrderController {
  constructor(private readonly service: OrderService = orderService) {}

  /**
   * POST /api/orders
   * Creates a new order with atomic Redis stock reservation and Price Snapshot.
   */
  createOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const dto: CreateOrderDto = {
        customerId: req.user?.userId || null,
        customerName: req.body.customerName,
        customerEmail: req.body.customerEmail,
        customerPhone: req.body.customerPhone,
        shippingAddress: req.body.shippingAddress,
        items: req.body.items,
      };

      const orderDetail = await this.service.createOrder(dto);

      res.status(201).json({
        success: true,
        message: 'Tạo đơn hàng và khóa tạm tồn kho thành công.',
        data: orderDetail,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/orders/:id
   * Retrieves order details with price snapshot.
   */
  getOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const orderId = String(req.params.id);
      const orderDetail = await this.service.getOrderById(orderId);

      res.status(200).json({
        success: true,
        data: orderDetail,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/orders/:id/confirm
   * Confirms an order, deducts physical warehouse stock, and releases Redis lock.
   */
  confirmOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const orderId = String(req.params.id);
      await this.service.confirmOrder(orderId);

      res.status(200).json({
        success: true,
        message: 'Xác nhận đơn hàng và cập nhật tồn kho vật lý thành công.',
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/orders/:id/cancel
   * Cancels an order and releases Redis stock reservation.
   */
  cancelOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const orderId = String(req.params.id);
      await this.service.cancelOrder(orderId);

      res.status(200).json({
        success: true,
        message: 'Hủy đơn hàng và giải phóng giữ chỗ tồn kho thành công.',
      });
    } catch (err) {
      next(err);
    }
  };
}

export const orderController: OrderController = new OrderController();
export default orderController;
