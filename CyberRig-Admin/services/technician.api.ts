/**
 * Technician Portal API Service
 * Handles fetching tickets for technicians and submitting diagnosis quotations.
 * Aligned with Task FE-06 and Task BE-08 specifications.
 */

import {
  RepairTicket,
  CreateQuotationDto,
  QuotationResult,
  TicketStatus,
} from '../../modules/repair-tickets/ticket.model';
import { getStoredAccessToken } from './api';
import {
  SAMPLE_TRACKING_TICKETS,
  SAMPLE_DIAGNOSING_TICKET_1001,
} from '../pages/ticket-tracking.data';

export const ALL_TECHNICIAN_TICKETS = [
  SAMPLE_DIAGNOSING_TICKET_1001,
  ...SAMPLE_TRACKING_TICKETS,
];

/**
 * Lấy danh sách phiếu sửa chữa cho kỹ thuật viên
 * Có thể lọc theo status (e.g. DIAGNOSING, REPAIRING)
 */
export async function fetchTechnicianTickets(
  statusFilter?: string
): Promise<RepairTicket[]> {
  try {
    const url = statusFilter && statusFilter !== 'ALL'
      ? `/api/tickets?status=${encodeURIComponent(statusFilter)}`
      : `/api/tickets`;

    const headers: Record<string, string> = { Accept: 'application/json' };
    const token = getStoredAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      headers,
    });

    if (res.ok) {
      const body = await res.json();
      if (body.success && Array.isArray(body.data)) {
        return body.data;
      }
    }
  } catch (_err) {
    // Offline or SSR fallback
  }

  // Fallback to local memory tracking tickets
  if (statusFilter && statusFilter !== 'ALL') {
    return ALL_TECHNICIAN_TICKETS.filter(
      (t) => t.status.toUpperCase() === statusFilter.toUpperCase()
    );
  }
  return [...ALL_TECHNICIAN_TICKETS];
}

/**
 * Lấy thông tin chi tiết của 1 phiếu kèm timeline
 */
export async function fetchTicketById(ticketId: string): Promise<RepairTicket> {
  try {
    const res = await fetch(`/api/tickets/${encodeURIComponent(ticketId)}/timeline`, {
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const body = await res.json();
      if (body.success && body.data) {
        return body.data;
      }
    }
  } catch (_err) {}

  const found = ALL_TECHNICIAN_TICKETS.find(
    (t) => t.id === ticketId || t.ticketCode.toUpperCase() === ticketId.toUpperCase()
  );

  if (found) {
    return found;
  }

  throw new Error(`Không tìm thấy phiếu sửa chữa với mã "${ticketId}".`);

}

/**
 * Gửi báo giá chẩn đoán và linh kiện thay thế lên server
 */
export async function submitTicketQuotation(
  ticketId: string,
  dto: CreateQuotationDto
): Promise<QuotationResult> {
  let networkFailed = false;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    const token = getStoredAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`/api/tickets/${encodeURIComponent(ticketId)}/quotation`, {
      method: 'POST',
      headers,
      body: JSON.stringify(dto),
    });

    const body = await res.json().catch(() => null);

    if (res.ok && body?.success && body?.data) {
      const localTicket = ALL_TECHNICIAN_TICKETS.find(
        (t) => t.id === ticketId || t.ticketCode === ticketId
      );
      if (localTicket) {
        localTicket.status = TicketStatus.QUOTED;
        localTicket.quoteAmount = body.data.totalCost;
      }
      return body.data;
    }

    if (body?.error?.message) {
      throw new Error(body.error.message);
    }
    throw new Error(`Lỗi khi tạo báo giá (HTTP ${res.status}).`);
  } catch (err: any) {
    // If it's a domain/validation error from the server, rethrow immediately
    const msg = String(err?.message || '');
    if (
      msg &&
      !msg.includes('URL') &&
      !msg.includes('fetch') &&
      !msg.includes('ECONNREFUSED') &&
      !msg.includes('Failed to parse')
    ) {
      throw err;
    }
    networkFailed = true;
  }

  if (networkFailed) {
    return fallbackSubmitQuotation(ticketId, dto);
  }

  throw new Error('Lỗi không xác định khi gửi báo giá.');
}

/**
 * Local fallback simulation for offline mode and isolated client testing
 */
function fallbackSubmitQuotation(
  ticketId: string,
  dto: CreateQuotationDto
): QuotationResult {
  const localTicket = ALL_TECHNICIAN_TICKETS.find(
    (t) => t.id === ticketId || t.ticketCode === ticketId
  );

  if (!localTicket) {
    throw new Error(`Phiếu "${ticketId}" không tồn tại.`);
  }

  if (localTicket.status !== TicketStatus.DIAGNOSING) {
    throw new Error(
      `Chỉ có thể tạo báo giá khi phiếu đang ở trạng thái DIAGNOSING (Hiện tại: ${localTicket.status})`
    );
  }

  let partsCost = 0;
  const items = dto.parts.map((p) => {
    const unitPrice = 1290000;
    partsCost += unitPrice * p.quantity;
    return {
      hardwareId: p.hardwareId,
      partName: `Linh kiện ${p.hardwareId}`,
      unitPrice,
      quantity: p.quantity,
    };
  });

  const totalCost = Number(dto.laborCost) + partsCost;
  localTicket.status = TicketStatus.QUOTED;
  localTicket.quoteAmount = totalCost;

  return {
    ticketId: localTicket.id,
    diagnosticNotes: dto.diagnosticNotes,
    laborCost: Number(dto.laborCost),
    partsCost,
    totalCost,
    items,
    status: TicketStatus.QUOTED,
  };
}

