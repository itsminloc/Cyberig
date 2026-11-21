import React from 'react';
import { TicketStatus } from '../../../modules/repair-tickets/ticket.state';
import { TicketLogEntry } from '../../../modules/repair-tickets/ticket.model';
import { HexSpinner } from '../feedback/HexSpinner';
import './TicketTimeline.css';

export interface TicketTimelineProps {
  currentStatus: TicketStatus;
  ticketCode?: string;
  timelineLogs?: TicketLogEntry[];
  className?: string;
}

interface MilestoneDef {
  status: TicketStatus;
  label: string;
  icon: string;
}

const STANDARD_MILESTONES: MilestoneDef[] = [
  { status: TicketStatus.RECEIVED, label: 'Tiếp nhận', icon: '📥' },
  { status: TicketStatus.DIAGNOSING, label: 'Chẩn đoán', icon: '🔍' },
  { status: TicketStatus.QUOTED, label: 'Báo giá', icon: '💰' },
  { status: TicketStatus.WAITING_CUSTOMER, label: 'Chờ duyệt', icon: '⏳' },
  { status: TicketStatus.REPAIRING, label: 'Sửa chữa', icon: '⚙️' },
  { status: TicketStatus.TESTING_QC, label: 'Kiểm thử QA', icon: '🧪' },
  { status: TicketStatus.COMPLETED, label: 'Hoàn tất', icon: '✅' },
];

const formatStepDate = (date?: Date | string | null): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(d);
};

export const TicketTimeline: React.FC<TicketTimelineProps> = ({
  currentStatus,
  ticketCode,
  timelineLogs = [],
  className = '',
}) => {
  const isCancelled = currentStatus === TicketStatus.CANCELLED;

  // Xác định vị trí mốc hiện tại
  const currentIndex = STANDARD_MILESTONES.findIndex(
    (m) => m.status === currentStatus
  );

  // Tìm trạng thái trước khi hủy (nếu có)
  const lastLogBeforeCancel = isCancelled
    ? [...timelineLogs].reverse().find((l) => l.toStatus === TicketStatus.CANCELLED)
    : null;

  const cancelledFromStatus = lastLogBeforeCancel?.fromStatus || null;
  const cancelledFromIndex = cancelledFromStatus
    ? STANDARD_MILESTONES.findIndex((m) => m.status === cancelledFromStatus)
    : 0;

  // Lấy thời điểm ghi nhận cho từng mốc
  const getMilestoneTimestamp = (status: TicketStatus): string => {
    const matchingLog = timelineLogs.find((l) => l.toStatus === status);
    return matchingLog ? formatStepDate(matchingLog.createdAt) : '';
  };

  return (
    <div
      className={`cyber-timeline-root ${isCancelled ? 'is-cancelled' : ''} ${className}`}
      role="region"
      aria-label="Tiến trình xử lý phiếu bảo hành"
    >
      {/* 1. Header & Live Status Badge */}
      <div className="cyber-timeline-header">
        <div className="cyber-timeline-title-group">
          <span style={{ fontSize: '1.25rem' }}>⚡</span>
          <h3 className="cyber-timeline-title">
            Tiến Trình Xử Lý Phiếu {ticketCode ? `[${ticketCode}]` : ''}
          </h3>
        </div>

        <div
          className={`cyber-timeline-badge ${
            isCancelled
              ? 'badge-cancelled'
              : currentStatus === TicketStatus.COMPLETED
              ? 'badge-completed'
              : 'badge-active'
          }`}
        >
          <span>
            {isCancelled
              ? '⛔ ĐÃ HỦY'
              : currentStatus === TicketStatus.COMPLETED
              ? '✓ HOÀN TẤT BÀN GIAO'
              : '◉ ĐANG XỬ LÝ'}
          </span>
        </div>
      </div>

      {/* 2. Stepper Track (Horizontal on Desktop, Vertical on Mobile) */}
      <div className="cyber-stepper-track" role="list">
        {STANDARD_MILESTONES.map((milestone, idx) => {
          let stepState: 'completed' | 'current' | 'pending' | 'cancelled' = 'pending';

          if (isCancelled) {
            if (idx < cancelledFromIndex) {
              stepState = 'completed';
            } else if (idx === cancelledFromIndex) {
              stepState = 'cancelled';
            } else {
              stepState = 'pending';
            }
          } else if (currentStatus === TicketStatus.COMPLETED) {
            stepState = 'completed';
          } else if (idx < currentIndex) {
            stepState = 'completed';
          } else if (idx === currentIndex) {
            stepState = 'current';
          } else {
            stepState = 'pending';
          }

          const timestamp = getMilestoneTimestamp(milestone.status);

          return (
            <div
              key={milestone.status}
              className={`cyber-step-item is-${stepState}`}
              role="listitem"
            >
              {/* Connector line from previous node (except the first one) */}
              {idx > 0 && (
                <div
                  className={`cyber-step-line-prev ${
                    stepState === 'completed' || stepState === 'current'
                      ? 'line-completed'
                      : 'line-pending'
                  }`}
                  aria-hidden="true"
                />
              )}

              {/* Milestone Node */}
              <div
                className={`cyber-step-node node-${stepState}`}
                title={`${milestone.label} (${stepState.toUpperCase()})`}
              >
                {stepState === 'completed' && <span>✓</span>}
                {stepState === 'current' && (
                  <div className="cyber-step-spinner-box">
                    <HexSpinner size="sm" />
                  </div>
                )}
                {stepState === 'cancelled' && <span>✕</span>}
                {stepState === 'pending' && <span>{idx + 1}</span>}
              </div>

              {/* Step Label and Date for Mobile & Desktop */}
              <div className="cyber-step-content-mobile">
                <span className="cyber-step-label">{milestone.label}</span>
                {timestamp && <span className="cyber-step-time">{timestamp}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Special Alert Banner if Cancelled */}
      {isCancelled && (
        <div className="cyber-cancelled-alert-banner" role="alert">
          <span className="cyber-cancelled-alert-icon">⚠️</span>
          <div>
            <strong>Phiếu sửa chữa đã bị hủy: </strong>
            <span>
              {lastLogBeforeCancel?.note ||
                'Phiếu đã được kết thúc và bàn giao trả lại thiết bị cho khách hàng.'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketTimeline;
