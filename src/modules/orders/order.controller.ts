/**
 * Orders REST API Controller
 * Enforces Anti-IDOR ownership verification, HMAC-SHA256 VietQR webhook authentication,
 * XSS input sanitization, PII masking for guest lookup, and immutable audit logging.
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../../core/config';
import { ForbiddenError, UnauthorizedError } from '../../core/errors/domain.error';
import {
  auditLogService, maskAddress, maskEmail, maskFullName, maskPhone,
  normalizePhone, verifyWebhookSignature, WEBHOOK_SIGNATURE_HEADER, WEBHOOK_TIMESTAMP_HEADER,
} from '../../core/security';
import { resolveClientIp } from '../../core/middlewares/rate-limiter.middleware';
import { orderService, OrderService } from './order.service';
import { CreateOrderDto, OrderDetail } from './order.model';
import { normalizeCreateOrderPayload } from './order.adapter';
import { dispatchOrderPlacedEvent } from './order-events.subscriber';
import { telemetryService } from '../monitoring/telemetry.service';

export class OrderController {
  constructor(private readonly service: OrderService = orderService) {}

  private extractOrderPhone(req: Request): string {
    const queryPhone = typeof req.query.phone === 'string' ? req.query.phone : '';
    const headerPhone =
      typeof req.headers['x-order-phone'] === 'string' ? req.headers['x-order-phone'] : '';
    const bodyPhone = typeof req.body?.customerPhone === 'string' ? req.body.customerPhone : '';
    return normalizePhone(queryPhone || headerPhone || bodyPhone);
  }

  private maskGuestOrderPii(order: OrderDetail): OrderDetail {
    return {
      ...order,
      customerName: maskFullName(order.customerName),
      customerEmail: maskEmail(order.customerEmail),
      customerPhone: maskPhone(order.customerPhone),
      shippingAddress: maskAddress(order.shippingAddress),
    };
  }

  /**
   * Verifies caller is either ADMIN, the authenticated owner, or a guest presenting the matching phone.
   * Returns `{ masked }` indicating whether PII should be masked in the response.
   */
  private async assertOrderAccess(
    req: Request,
    order: OrderDetail,
    action: 'READ' | 'CANCEL' | 'SIMULATE'
  ): Promise<{ masked: boolean }> {
    const actor = req.user;

    // 1. ADMIN has full visibility & control
    if (actor?.role === 'ADMIN') {
      return { masked: false };
    }

    // 2. Order belongs to a registered customer
    if (order.customerId) {
      if (actor) {
        if (actor.userId === order.customerId) {
          return { masked: false };
        }
        await auditLogService.record({
          eventType: 'IDOR_BLOCKED',
          severity: 'CRITICAL',
          actorId: actor.userId,
          actorRole: actor.role,
          actorEmail: actor.email,
          ipAddress: resolveClientIp(req),
          resourceType: 'order',
          resourceId: order.id,
          message: `Chặn truy cập trái phép (IDOR ${action}) vào đơn hàng [${order.id}] thuộc tài khoản khác.`,
        });
        throw new ForbiddenError('Bạn không có quyền truy cập hoặc thao tác trên đơn hàng này.');
      }

      // Unauthenticated access to registered customer order: never allow cancel; read requires phone verification
      if (action === 'CANCEL') {
        throw new UnauthorizedError('Vui lòng đăng nhập đúng tài khoản chủ đơn hàng để thực hiện hủy.');
      }

      const providedPhone = this.extractOrderPhone(req);
      if (providedPhone && providedPhone === normalizePhone(order.customerPhone)) {
        return { masked: true };
      }

      throw new UnauthorizedError(
        'Vui lòng đăng nhập chủ đơn hàng hoặc cung cấp đúng số điện thoại đặt hàng (?phone=...) để tra cứu.'
      );
    }

    // 3. Guest order (customerId === null): require matching phone verification
    const providedPhone = this.extractOrderPhone(req);
    if (providedPhone && providedPhone === normalizePhone(order.customerPhone)) {
      return { masked: action === 'READ' };
    }

    throw new UnauthorizedError(
      'Đơn hàng khách vãng lai yêu cầu xác minh số điện thoại đặt hàng (?phone=... hoặc header X-Order-Phone).'
    );
  }

  /**
   * POST /api/orders
   */
  createOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adapted = normalizeCreateOrderPayload(
        (req.body || {}) as Record<string, unknown>,
        req.user?.userId || null
      );
      const orderDetail = await this.service.createOrder(adapted.dto);
      const correlationId = req.correlationId || `corr-${orderDetail.id.slice(0, 8)}`;

      try {
        await dispatchOrderPlacedEvent({
          order: orderDetail,
          correlationId,
          sourceChannel: adapted.sourceChannel,
          simulateTmsFailure: adapted.simulateFulfillmentFailure,
        });
      } catch (busErr) {
        telemetryService.emitLog(
          'BROKER',
          'WARN',
          'OrderController',
          `Event dispatch deferred to Outbox for ${orderDetail.id}: ${busErr instanceof Error ? busErr.message : 'Broker unavailable'}`,
          { correlationId, orderId: orderDetail.id }
        );
      }

      res.status(201).json({
        success: true,
        message: 'Tạo đơn hàng và khóa tạm tồn kho thành công.',
        data: orderDetail,
        meta: {
          correlationId,
          sourceChannel: adapted.sourceChannel,
          normalizedFromFormat: adapted.normalizedFromFormat,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/orders/:id (Anti-IDOR protected)
   */
  getOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orderId = String(req.params.id);
      const orderDetail = await this.service.getOrderById(orderId);
      const { masked } = await this.assertOrderAccess(req, orderDetail, 'READ');

      res.status(200).json({
        success: true,
        data: masked ? this.maskGuestOrderPii(orderDetail) : orderDetail,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/orders/:id/confirm
   * Protected by HMAC-SHA256 Payment Webhook Signature OR ADMIN role.
   */
  confirmOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orderId = String(req.params.id);
      const isAdmin = req.user?.role === 'ADMIN';

      if (!isAdmin) {
        const rawBody = (req as Request & { rawBody?: string }).rawBody || '';
        const payloadToVerify = rawBody.length > 0 ? rawBody : orderId;
        const verification = verifyWebhookSignature(
          config.security.webhookSecret,
          req.headers[WEBHOOK_TIMESTAMP_HEADER],
          req.headers[WEBHOOK_SIGNATURE_HEADER],
          payloadToVerify
        );

        if (!verification.valid) {
          await auditLogService.record({
            eventType: 'WEBHOOK_AUTH_FAILED',
            severity: 'CRITICAL',
            actorId: req.user?.userId || null,
            actorRole: req.user?.role || 'GUEST',
            actorEmail: req.user?.email || null,
            ipAddress: resolveClientIp(req),
            resourceType: 'order_webhook',
            resourceId: orderId,
            message: `Từ chối xác nhận đơn hàng [${orderId}]: ${verification.reason}`,
          });
          throw new UnauthorizedError(
            verification.reason || 'Xác thực chữ ký Webhook thanh toán không hợp lệ.'
          );
        }
      }

      await this.service.confirmOrder(orderId);

      await auditLogService.record({
        eventType: 'ORDER_CONFIRMED',
        severity: 'INFO',
        actorId: req.user?.userId || 'VIETQR_WEBHOOK',
        actorRole: isAdmin ? 'ADMIN' : 'PAYMENT_WEBHOOK',
        actorEmail: req.user?.email || null,
        ipAddress: resolveClientIp(req),
        resourceType: 'order',
        resourceId: orderId,
        message: `Xác nhận thanh toán đơn hàng [${orderId}] qua ${isAdmin ? 'ADMIN' : 'HMAC-SHA256 Webhook'}.`,
      });

      res.status(200).json({
        success: true,
        message: 'Xác nhận đơn hàng và cập nhật tồn kho vật lý thành công.',
      });
    } catch (err) {
      next(err);
    }
  };

  simulatePayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (config.env === 'production') {
        throw new ForbiddenError('Tính năng giả lập thanh toán đã bị vô hiệu hóa ở môi trường Production.');
      }
      const orderId = String(req.params.id);
      const orderDetail = await this.service.getOrderById(orderId);
      await this.assertOrderAccess(req, orderDetail, 'SIMULATE');
      await this.service.confirmOrder(orderId);
      await auditLogService.record({
        eventType: 'ORDER_CONFIRMED',
        severity: 'INFO',
        actorId: req.user?.userId || 'DEMO_SIMULATOR',
        actorRole: req.user?.role || 'GUEST',
        actorEmail: req.user?.email || null,
        ipAddress: resolveClientIp(req),
        resourceType: 'order',
        resourceId: orderId,
        message: `Xác nhận thanh toán giả lập (Dev Demo) cho đơn hàng [${orderId}].`,
      });
      res.status(200).json({ success: true, message: 'Giả lập xác nhận thanh toán VietQR thành công.' });
    } catch (err) {
      next(err);
    }
  };

  cancelOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orderId = String(req.params.id);
      const orderDetail = await this.service.getOrderById(orderId);
      await this.assertOrderAccess(req, orderDetail, 'CANCEL');
      await this.service.cancelOrder(orderId);
      await auditLogService.record({
        eventType: 'ORDER_CANCELLED',
        severity: 'INFO',
        actorId: req.user?.userId || null,
        actorRole: req.user?.role || 'GUEST',
        actorEmail: req.user?.email || null,
        ipAddress: resolveClientIp(req),
        resourceType: 'order',
        resourceId: orderId,
        message: `Hủy đơn hàng [${orderId}] và giải phóng khóa tồn kho Redis.`,
      });
      res.status(200).json({ success: true, message: 'Hủy đơn hàng và giải phóng giữ chỗ tồn kho thành công.' });
    } catch (err) {
      next(err);
    }
  };
}

export const orderController: OrderController = new OrderController();
export default orderController;
