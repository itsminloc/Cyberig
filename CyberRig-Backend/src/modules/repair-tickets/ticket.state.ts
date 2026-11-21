/**
 * Repair Ticket State Machine & Transition Rules
 * Aligned with .skills/repair-workflow-rules.md and Task BE-05 specification.
 */

import { InvalidStateTransitionError } from '../../core/errors';

export enum TicketStatus {
  RECEIVED = 'RECEIVED',
  DIAGNOSING = 'DIAGNOSING',
  QUOTED = 'QUOTED',
  WAITING_CUSTOMER = 'WAITING_CUSTOMER',
  REPAIRING = 'REPAIRING',
  TESTING_QC = 'TESTING_QC',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/**
 * Ma trận chuyển đổi trạng thái hợp lệ (Allowed State Transitions)
 * Quy tắc cốt lõi:
 * - RECEIVED: Chỉ có thể chuyển sang DIAGNOSING hoặc hủy CANCELLED.
 * - DIAGNOSING: Kiểm tra xong sang QUOTED hoặc hủy CANCELLED.
 * - QUOTED: Báo giá xong chuyển sang WAITING_CUSTOMER (chờ khách duyệt) hoặc hủy CANCELLED.
 * - WAITING_CUSTOMER: Khách đồng ý chuyển sang REPAIRING, khách từ chối chuyển sang CANCELLED.
 * - REPAIRING: Đang sửa chữa - CHẶN HỦY, chỉ có thể chuyển sang TESTING_QC.
 * - TESTING_QC: Nếu đạt chuyển sang COMPLETED, nếu không đạt quay lại REPAIRING để xử lý lại.
 * - COMPLETED, CANCELLED: Trạng thái kết thúc (Terminal states), không thể chuyển tiếp.
 */
export const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.RECEIVED]: [TicketStatus.DIAGNOSING, TicketStatus.CANCELLED],
  [TicketStatus.DIAGNOSING]: [TicketStatus.QUOTED, TicketStatus.CANCELLED],
  [TicketStatus.QUOTED]: [TicketStatus.WAITING_CUSTOMER, TicketStatus.CANCELLED],
  [TicketStatus.WAITING_CUSTOMER]: [TicketStatus.REPAIRING, TicketStatus.CANCELLED],
  [TicketStatus.REPAIRING]: [TicketStatus.TESTING_QC],
  [TicketStatus.TESTING_QC]: [TicketStatus.COMPLETED, TicketStatus.REPAIRING],
  [TicketStatus.COMPLETED]: [],
  [TicketStatus.CANCELLED]: [],
};

/**
 * Kiểm tra xem việc chuyển từ fromStatus sang toStatus có hợp lệ hay không.
 */
export function isValidTransition(fromStatus: TicketStatus, toStatus: TicketStatus): boolean {
  const allowed = ALLOWED_TRANSITIONS[fromStatus];
  if (!allowed) return false;
  return allowed.includes(toStatus);
}

/**
 * Khẳng định việc chuyển trạng thái hợp lệ.
 * Ném InvalidStateTransitionError nếu vi phạm ma trận chuyển đổi.
 */
export function assertValidTransition(fromStatus: TicketStatus, toStatus: TicketStatus): void {
  if (!isValidTransition(fromStatus, toStatus)) {
    throw new InvalidStateTransitionError(
      `Không thể chuyển từ ${fromStatus} sang ${toStatus}`
    );
  }
}

/**
 * Nhãn tiếng Việt thân thiện phục vụ hiển thị Timeline & UI
 */
export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  [TicketStatus.RECEIVED]: 'Tiếp nhận thiết bị',
  [TicketStatus.DIAGNOSING]: 'Kiểm tra & Chẩn đoán lỗi',
  [TicketStatus.QUOTED]: 'Đề xuất giải pháp & Báo giá',
  [TicketStatus.WAITING_CUSTOMER]: 'Chờ khách hàng phê duyệt',
  [TicketStatus.REPAIRING]: 'Đang tiến hành sửa chữa',
  [TicketStatus.TESTING_QC]: 'Kiểm thử QA & Stress Test',
  [TicketStatus.COMPLETED]: 'Hoàn thành sửa chữa',
  [TicketStatus.CANCELLED]: 'Đã hủy phiếu',
};
