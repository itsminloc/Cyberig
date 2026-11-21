/**
 * Repair Tickets Domain Model & Enums
 * Aligned with docs/DATABASE-SCHEMA.md
 */

import { TicketStatus } from './ticket.state';

export { TicketStatus };

export enum TicketPriority {
  LOW = 'LOW',
  STANDARD = 'STANDARD',
  URGENT = 'URGENT',
}

export interface TicketLogEntry {
  id: string;
  ticketId: string;
  fromStatus: TicketStatus | null;
  toStatus: TicketStatus;
  technicianId?: string | null;
  actorId?: string | null;
  note: string;
  createdAt: Date;
}

export interface QuotationPartItem {
  hardwareId: string;
  partName: string;
  unitPrice: number;
  quantity: number;
}

export interface CreateQuotationDto {
  diagnosticNotes: string;
  technicianId?: string;
  laborCost: number; // Tiền công
  parts: Array<{
    hardwareId: string;
    quantity: number;
  }>;
}

export interface QuotationResult {
  ticketId: string;
  technicianId?: string | null;
  diagnosticNotes: string;
  laborCost: number;
  partsCost: number;
  totalCost: number;
  items: QuotationPartItem[];
  status: string;
}

export interface RepairPartUsed {
  partId: string;
  partName: string;
  quantity: number;
  unitPrice: number;
}


export interface RepairTicket {
  id: string;
  customerId?: string | null;
  ticketCode: string; // e.g. TK-20260905-001
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deviceType: string;
  serialNumber: string;
  initialCondition: string;
  faultDescription: string;
  diagnosisNotes?: string;
  priority: TicketPriority;
  status: TicketStatus;
  technicianId?: string | null;
  quoteAmount?: number | null;
  isQuoteApproved?: boolean;
  partsUsed?: RepairPartUsed[];
  warrantyMonths: number;
  timeline?: TicketLogEntry[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Raw Database Row Structure for `repair_tickets` table
 */
export interface RepairTicketRow {
  id: string;
  customer_id?: string | null;
  ticket_code: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  device_type: string;
  serial_number: string;
  initial_condition: string;
  fault_description: string;
  diagnosis_notes?: string | null;
  priority?: string | null;
  technician_id?: string | null;
  status: string;
  quote_amount?: string | number | null;
  is_quote_approved?: boolean | null;
  warranty_months: number;
  created_at: Date | string;
  updated_at: Date | string;
}

/**
 * Raw Database Row Structure for `ticket_logs` table
 */
export interface TicketLogRow {
  id: string;
  ticket_id: string;
  from_status: string | null;
  to_status: string;
  note: string;
  technician_id?: string | null;
  actor_id?: string | null;
  created_at: Date | string;
}

/**
 * Mapper: Converts database row to domain RepairTicket
 */
export function toDomainRepairTicket(
  row: RepairTicketRow,
  timeline: TicketLogEntry[] = []
): RepairTicket {
  return {
    id: row.id,
    customerId: row.customer_id || null,
    ticketCode: row.ticket_code,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email || undefined,
    deviceType: row.device_type,
    serialNumber: row.serial_number,
    initialCondition: row.initial_condition,
    faultDescription: row.fault_description,
    diagnosisNotes: row.diagnosis_notes || undefined,
    priority: (row.priority as TicketPriority) || TicketPriority.STANDARD,
    status: row.status as TicketStatus,
    technicianId: row.technician_id || null,
    quoteAmount: row.quote_amount != null ? Number(row.quote_amount) : null,
    isQuoteApproved: row.is_quote_approved ?? false,
    warrantyMonths: Number(row.warranty_months) || 0,
    timeline,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function toDomainTicketLog(row: TicketLogRow): TicketLogEntry {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    fromStatus: (row.from_status as TicketStatus) || null,
    toStatus: row.to_status as TicketStatus,
    technicianId: row.technician_id || null,
    actorId: row.actor_id || row.technician_id || null,
    note: row.note,
    createdAt: new Date(row.created_at),
  };
}

/**
 * Raw Database Row Structure for `ticket_quotations` table
 */
export interface TicketQuotationRow {
  id: string;
  ticket_id: string;
  technician_id?: string | null;
  labor_cost: string | number;
  parts_cost: string | number;
  total_cost: string | number;
  notes: string;
  created_at: Date | string;
  updated_at: Date | string;
}

/**
 * Raw Database Row Structure for `ticket_quotation_items` table
 */
export interface TicketQuotationItemRow {
  id: string;
  quotation_id: string;
  hardware_id: string;
  part_name: string;
  quantity: number;
  price_at_quote: string | number;
  created_at: Date | string;
}


