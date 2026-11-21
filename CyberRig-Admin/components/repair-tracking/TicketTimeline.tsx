/**
 * Repair Ticket Timeline Stepper Component (Skeleton)
 * Visualizes stages from Received to Delivered with state indicators.
 */

import { TicketStatus } from '../../../modules/repair-tickets/ticket.model';

export interface TimelineStep {
  status: TicketStatus;
  label: string;
  timestamp?: Date;
  completed: boolean;
  active: boolean;
}

export interface TicketTimelineProps {
  currentStatus: TicketStatus;
  ticketCode: string;
}

export const TicketTimeline = (_props: TicketTimelineProps) => {
  // Skeleton component
  return null;
};

export default TicketTimeline;
