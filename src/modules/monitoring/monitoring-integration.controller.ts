/**
 * Monitoring Integration Simulator Controller (SE445 Case Study 01 & 02)
 * ADMIN-only endpoints for Omnichannel Order Simulation, AI POS Ingestion,
 * and Event Bus / Outbox control.
 */

import { NextFunction, Request, Response } from 'express';
import { BrokerUnavailableError, eventBus } from '../../core/events';
import { resolveClientIp } from '../../core/middlewares/rate-limiter.middleware';
import { auditLogService } from '../../core/security';
import { normalizeCreateOrderPayload } from '../orders/order.adapter';
import { dispatchOrderPlacedEvent, getOrderDownstreamState } from '../orders/order-events.subscriber';
import { orderService } from '../orders/order.service';
import { aiDataMapperService } from './ai-data-mapper.service';

export class MonitoringIntegrationController {
  /**
   * GET /api/monitoring/integration-state
   */
  public getIntegrationState(req: Request, res: Response): void {
    res.status(200).json({
      success: true,
      data: {
        correlationId: req.correlationId || null,
        eventBus: eventBus.getStatus(),
        outbox: eventBus.getOutboxRecords(),
        downstream: getOrderDownstreamState(),
        aiStats: aiDataMapperService.getStats(),
      },
    });
  }

  /**
   * POST /api/monitoring/orders/simulate
   * Accepts heterogeneous or canonical order JSON, runs Adapter + Stock Lock + EDA Event Bus.
   */
  public async simulateOmnichannelOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    const correlationId = req.correlationId || `corr-sim-${Date.now()}`;
    try {
      const adapted = normalizeCreateOrderPayload(
        (req.body || {}) as Record<string, unknown>,
        req.user?.userId || null
      );

      if (!eventBus.getStatus().online) {
        await dispatchOrderPlacedEvent({
          order: {
            id: `ORD-OUTBOX-${Date.now().toString().slice(-4)}`,
            customerName: adapted.dto.customerName || 'Offline Simulation Guest',
            totalAmount: 0,
            status: 'PENDING_PAYMENT',
            items: [],
            createdAt: new Date(),
          },
          correlationId,
          sourceChannel: adapted.sourceChannel,
          simulateTmsFailure: adapted.simulateFulfillmentFailure,
        });
      }

      const orderDetail = await orderService.createOrder(adapted.dto);
      const envelope = await dispatchOrderPlacedEvent({
        order: orderDetail,
        correlationId,
        sourceChannel: adapted.sourceChannel,
        simulateTmsFailure: adapted.simulateFulfillmentFailure,
      });

      await auditLogService.record({
        eventType: 'MONITORING_ORDER_SIMULATE',
        severity: adapted.simulateFulfillmentFailure ? 'WARN' : 'INFO',
        actorId: req.user?.userId,
        actorRole: req.user?.role || 'ADMIN',
        actorEmail: req.user?.email,
        ipAddress: resolveClientIp(req),
        resourceType: 'order',
        resourceId: orderDetail.id,
        message: `SI Simulator đặt đơn [${orderDetail.id}] kênh=${adapted.sourceChannel} (${adapted.normalizedFromFormat}), correlationId=${correlationId}`,
      });

      res.status(201).json({
        success: true,
        data: {
          correlationId,
          normalizedFromFormat: adapted.normalizedFromFormat,
          sourceChannel: adapted.sourceChannel,
          canonicalDto: adapted.dto,
          order: orderDetail,
          eventEnvelope: envelope,
          downstream: getOrderDownstreamState(),
          eventBus: eventBus.getStatus(),
        },
      });
    } catch (err) {
      if (err instanceof BrokerUnavailableError) {
        res.status(503).json({
          success: false,
          error: { code: err.code, message: err.message },
          data: { correlationId, outbox: eventBus.getOutboxRecords()[0] || null },
        });
        return;
      }
      next(err);
    }
  }

  /**
   * POST /api/monitoring/ai-pos/ingest
   * Executes PII redaction + AI POS mapping and optionally creates a live order.
   */
  public async ingestAiPos(req: Request, res: Response, next: NextFunction): Promise<void> {
    const correlationId = req.correlationId || `corr-ai-${Date.now()}`;
    try {
      const rawText = String(req.body?.rawText || req.body?.text || '');
      const sourceLabel = String(req.body?.sourceLabel || 'POS_THERMAL_RECEIPT');
      const autoCreateOrder = Boolean(req.body?.autoCreateOrder);

      const mapped = await aiDataMapperService.mapRawPosOrder(rawText, sourceLabel);
      let createdOrder = null;

      if (autoCreateOrder && mapped.canonicalOrderPreview.items.length > 0) {
        createdOrder = await orderService.createOrder({
          customerId: req.user?.userId || null,
          customerName: mapped.canonicalOrderPreview.customerName,
          customerEmail: 'pos-ai@cyberrig.local',
          customerPhone: '0900000000',
          shippingAddress: mapped.canonicalOrderPreview.shippingAddress,
          items: mapped.canonicalOrderPreview.items,
        });
        await dispatchOrderPlacedEvent({
          order: createdOrder,
          correlationId,
          sourceChannel: 'AI_POS_INGEST',
        }).catch(() => undefined);
      }

      await auditLogService.record({
        eventType: 'MONITORING_AI_POS_INGEST',
        severity: 'INFO',
        actorId: req.user?.userId,
        actorRole: req.user?.role || 'ADMIN',
        actorEmail: req.user?.email,
        ipAddress: resolveClientIp(req),
        resourceType: 'ai_pos_ingest',
        resourceId: correlationId,
        message: `AI POS mapper (${mapped.engineUsed}) redacted ${mapped.piiFieldsRedacted} PII fields, resolved ${mapped.resolvedItems.length} SKUs.`,
      });

      res.status(200).json({
        success: true,
        data: { correlationId, mapped, createdOrder },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/monitoring/integration-broker
   * Controls online/offline simulation or consumer pause/resume for chaos verification.
   */
  public async toggleBrokerState(req: Request, res: Response): Promise<void> {
    const action = String(req.body?.action || '').toUpperCase();
    const queueName = String(req.body?.queueName || 'order.fulfillment-tms');

    if (action === 'OFFLINE') eventBus.setBrokerOnline(false);
    else if (action === 'ONLINE') eventBus.setBrokerOnline(true);
    else if (action === 'PAUSE_QUEUE') eventBus.pauseQueue(queueName);
    else if (action === 'RESUME_QUEUE') await eventBus.resumeQueue(queueName);
    else {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_BROKER_ACTION', message: 'Action phải là ONLINE, OFFLINE, PAUSE_QUEUE hoặc RESUME_QUEUE.' },
      });
      return;
    }

    res.status(200).json({ success: true, data: eventBus.getStatus() });
  }
}

export const monitoringIntegrationController = new MonitoringIntegrationController();
