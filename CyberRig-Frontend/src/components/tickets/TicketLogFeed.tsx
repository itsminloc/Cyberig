import React from 'react';
import { TicketLogEntry } from '../../../modules/repair-tickets/ticket.model';
import { TicketStatus, TICKET_STATUS_LABELS } from '../../../modules/repair-tickets/ticket.state';
import './TicketLogFeed.css';

export interface TicketLogFeedProps {
  logs: TicketLogEntry[];
  className?: string;
}

const formatDateTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
};

const getStatusBulletIcon = (status: TicketStatus): string => {
  switch (status) {
    case TicketStatus.RECEIVED:
      return '📥';
    case TicketStatus.DIAGNOSING:
      return '🔍';
    case TicketStatus.QUOTED:
      return '💰';
    case TicketStatus.WAITING_CUSTOMER:
      return '⏳';
    case TicketStatus.REPAIRING:
      return '⚙️';
    case TicketStatus.TESTING_QC:
      return '🧪';
    case TicketStatus.COMPLETED:
      return '✅';
    case TicketStatus.CANCELLED:
      return '❌';
    default:
      return '📌';
  }
};

export const TicketLogFeed: React.FC<TicketLogFeedProps> = ({
  logs,
  className = '',
}) => {
  // Sắp xếp theo thứ tự thời gian tăng dần (Chronological order: cũ nhất -> mới nhất)
  const sortedLogs = [...logs].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return timeA - timeB;
  });

  return (
    <div
      className={`cyber-logfeed-card ${className}`}
      role="region"
      aria-label="Nhật ký xử lý kỹ thuật"
    >
      <div className="cyber-logfeed-header">
        <h4 className="cyber-logfeed-title">
          <span>📜</span>
          <span>Nhật Ký Xử Lý Kỹ Thuật (Audit Logs)</span>
        </h4>
        <span className="cyber-logfeed-count">{logs.length} Bản ghi</span>
      </div>

      {sortedLogs.length === 0 ? (
        <div className="cyber-logfeed-empty">
          Chưa có bản ghi nhật ký kỹ thuật nào cho phiếu này.
        </div>
      ) : (
        <div className="cyber-logfeed-list">
          {sortedLogs.map((log) => {
            const isCancelled = log.toStatus === TicketStatus.CANCELLED;
            const isCompleted = log.toStatus === TicketStatus.COMPLETED;
            const actorDisplay = log.actorId || log.technicianId || 'Hệ Thống';

            const fromLabel = log.fromStatus
              ? TICKET_STATUS_LABELS[log.fromStatus] || log.fromStatus
              : 'Khởi tạo mới';
            const toLabel =
              TICKET_STATUS_LABELS[log.toStatus] || log.toStatus;

            return (
              <div
                key={log.id}
                className={`cyber-logfeed-item ${
                  isCancelled ? 'is-cancelled' : isCompleted ? 'is-completed' : ''
                }`}
              >
                {/* Bullet Icon Node */}
                <div
                  className="cyber-logfeed-bullet"
                  title={toLabel}
                  aria-hidden="true"
                >
                  {getStatusBulletIcon(log.toStatus)}
                </div>

                {/* Event Content Details */}
                <div className="cyber-logfeed-content">
                  {/* Top Meta: Timestamp & Actor */}
                  <div className="cyber-logfeed-meta-row">
                    <span className="cyber-logfeed-time">
                      {formatDateTime(log.createdAt)}
                    </span>
                    <span className="cyber-logfeed-actor">
                      KTV: {actorDisplay}
                    </span>
                  </div>

                  {/* Transition Status Pills */}
                  <div className="cyber-logfeed-transition-row">
                    <span className="cyber-logfeed-pill pill-from">
                      {fromLabel}
                    </span>
                    <span className="cyber-logfeed-arrow">➔</span>
                    <span className="cyber-logfeed-pill pill-to">{toLabel}</span>
                  </div>

                  {/* Note Description */}
                  {log.note && (
                    <p className="cyber-logfeed-note">{log.note}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TicketLogFeed;
