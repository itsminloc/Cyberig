/**
 * Repair Ticket REST API Controller
 * Handles ticket timeline retrieval and status transitions.
 */

import { Request, Response, NextFunction } from 'express';
import { ticketService, TicketService } from './ticket.service';
import { diagnosticsService, DiagnosticsService } from './diagnostics.service';
import { TicketStatus } from './ticket.state';
import { TicketPriority } from './ticket.model';
import {
  maskEmail,
  maskFullName,
  maskPhone,
  sanitizeTextInput,
} from '../../core/security';

export class TicketController {
  constructor(
    private readonly tService: TicketService = ticketService,
    private readonly diagService: DiagnosticsService = diagnosticsService
  ) {}

  /**
   * POST /api/tickets
   * Creates a new repair/inspection ticket (Supports both CYBERRIG and EXTERNAL equipment).
   */
  async createTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        customerName,
        customerPhone,
        customerEmail,
        deviceType,
        serialNumber,
        initialCondition,
        faultDescription,
        deviceOrigin,
        priority,
      } = req.body;

      if (!customerName || !customerPhone || !deviceType) {
        res.status(400).json({
          success: false,
          error: {
            message: 'Vui lòng cung cấp đầy đủ: Tên khách hàng, Số điện thoại và Loại thiết bị.',
          },
        });
        return;
      }

      // Associate customerId if user is authenticated or passed in body
      const customerId = req.user?.userId || req.body.customerId || undefined;

      // Tag device origin: CYBERRIG vs EXTERNAL
      const originTag = deviceOrigin === 'EXTERNAL'
        ? '[NGUỒN GỐC: LINH KIỆN / MÁY MUA BÊN NGOÀI]'
        : '[NGUỒN GỐC: THIẾT BỊ MUA TẠI CYBERRIG]';

      const fullCondition = `${originTag} ${initialCondition || 'Tiếp nhận ngoại quan bình thường'}`.trim();

      const ticket = await this.tService.createTicket({
        customerId,
        customerName: sanitizeTextInput(customerName, 150),
        customerPhone: sanitizeTextInput(customerPhone, 30),
        customerEmail: customerEmail ? sanitizeTextInput(customerEmail, 150) : undefined,
        deviceType: sanitizeTextInput(deviceType, 100),
        serialNumber: serialNumber ? sanitizeTextInput(serialNumber, 100) : 'CHƯA_RÕ',
        initialCondition: sanitizeTextInput(fullCondition, 500),
        faultDescription: faultDescription
          ? sanitizeTextInput(faultDescription, 500)
          : 'Yêu cầu kiểm tra & giám định phần cứng',
        priority: priority === 'URGENT' ? TicketPriority.URGENT : TicketPriority.STANDARD,
      });

      res.status(201).json({
        success: true,
        message: 'Tạo phiếu tiếp nhận kiểm tra / sửa chữa thành công',
        data: ticket,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/tickets
   * Lists repair tickets for Technician & Admin
   */
  async listTickets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status ? String(req.query.status) : undefined;
      const tickets = await this.tService.getAllTickets(status);

      res.status(200).json({
        success: true,
        data: tickets,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/tickets/:id/timeline
   * Retrieves ticket details with chronological timeline logs.
   * Applies PII masking (Decree 13/2023/ND-CP) when accessed publicly by unauthenticated guests.
   */
  async getTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const ticket = await this.tService.getTicketTimeline(id);

      const isPrivileged =
        req.user?.role === 'ADMIN' ||
        req.user?.role === 'TECHNICIAN' ||
        (Boolean(req.user?.userId) && ticket.customerId === req.user?.userId);

      const responseData = isPrivileged
        ? ticket
        : {
            ...ticket,
            customerName: maskFullName(ticket.customerName),
            customerPhone: maskPhone(ticket.customerPhone),
            customerEmail: ticket.customerEmail ? maskEmail(ticket.customerEmail) : undefined,
            piiMasked: true,
          };

      res.status(200).json({
        success: true,
        data: responseData,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/tickets/:id/status
   * Transitions ticket status based on ALLOWED_TRANSITIONS state machine.
   */
  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const { toStatus, actorId, note } = req.body;
      const resolvedActorId = req.user?.userId || actorId || 'SYSTEM';

      const updatedTicket = await this.tService.transitionStatus(
        id,
        toStatus as TicketStatus,
        resolvedActorId,
        note
      );

      res.status(200).json({
        success: true,
        data: updatedTicket,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/tickets/:id/quotation
   * Submits a diagnostic quotation for the ticket (requires DIAGNOSING status).
   */
  async submitQuotation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const { diagnosticNotes, technicianId, laborCost, parts } = req.body;
      const resolvedTechnicianId = req.user?.userId || technicianId;

      const quotation = await this.diagService.createTicketQuotation(id, {
        diagnosticNotes,
        technicianId: resolvedTechnicianId,
        laborCost: Number(laborCost) || 0,
        parts: Array.isArray(parts) ? parts : [],
      });

      res.status(201).json({
        success: true,
        data: quotation,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/tickets/:id/quotation
   * Retrieves quotation details for a ticket.
   */
  async getTicketQuotation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const quotation = await this.diagService.getTicketQuotation(id);

      res.status(200).json({
        success: true,
        data: quotation,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const ticketController = new TicketController();
export default ticketController;

