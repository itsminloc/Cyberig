/**
 * Technician Ticket List Page
 * Dashboard for technicians to view and filter assigned repair tickets,
 * focusing on DIAGNOSING and REPAIRING queues.
 * Aligned with Task FE-06 specification.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { RepairTicket, TicketStatus, TicketPriority } from '../../../modules/repair-tickets/ticket.model';
import { fetchTechnicianTickets } from '../../services/technician.api';
import { MainLayout } from '../../layouts/MainLayout';
import { CyberSkeleton } from '../../components/feedback/CyberSkeleton';
import './TechnicianTicketListPage.css';

export interface TechnicianTicketListPageProps {
  onSelectTicketForDiagnosis?: (ticketId: string) => void;
}

export const TechnicianTicketListPage: React.FC<TechnicianTicketListPageProps> = ({
  onSelectTicketForDiagnosis,
}) => {
  const [tickets, setTickets] = useState<RepairTicket[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('DIAGNOSING');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    let isSubscribed = true;
    setIsLoading(true);

    fetchTechnicianTickets(activeTab)
      .then((data) => {
        if (isSubscribed) {
          setTickets(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isSubscribed) {
          setIsLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [activeTab]);

  // Client-side search query filtering
  const filteredTickets = useMemo(() => {
    if (!searchQuery.trim()) return tickets;
    const q = searchQuery.toLowerCase().trim();
    return tickets.filter(
      (t) =>
        t.ticketCode.toLowerCase().includes(q) ||
        t.customerName.toLowerCase().includes(q) ||
        t.customerPhone.includes(q) ||
        t.deviceType.toLowerCase().includes(q) ||
        t.serialNumber.toLowerCase().includes(q)
    );
  }, [tickets, searchQuery]);

  // Counts for metric badges
  const diagnosingCount = useMemo(() => {
    return tickets.filter((t) => t.status === TicketStatus.DIAGNOSING).length;
  }, [tickets]);

  const repairingCount = useMemo(() => {
    return tickets.filter((t) => t.status === TicketStatus.REPAIRING).length;
  }, [tickets]);

  const getPriorityClass = (priority: TicketPriority) => {
    switch (priority) {
      case TicketPriority.URGENT:
        return 'urgent';
      case TicketPriority.STANDARD:
        return 'standard';
      case TicketPriority.LOW:
      default:
        return 'low';
    }
  };

  const getStatusClass = (status: TicketStatus) => {
    switch (status) {
      case TicketStatus.DIAGNOSING:
        return 'status-diagnosing';
      case TicketStatus.REPAIRING:
        return 'status-repairing';
      case TicketStatus.QUOTED:
      case TicketStatus.WAITING_CUSTOMER:
        return 'status-quoted';
      case TicketStatus.COMPLETED:
        return 'status-completed';
      case TicketStatus.RECEIVED:
      default:
        return 'status-received';
    }
  };

  const formatDateTime = (date: Date | string) => {
    const d = new Date(date);
    return `${d.toLocaleDateString('vi-VN')} lúc ${d.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  };

  return (
    <MainLayout>
      <div className="cyber-tech-container">
        {/* 1. Header Banner */}
        <header className="cyber-tech-header">
          <div className="cyber-tech-badge-title">
            <span>⚡ CYBERRIG TECHNICAL SERVICE PORTAL</span>
          </div>
          <h1 className="cyber-tech-title">
            <span>🛠️ Cổng Chẩn Đoán & Giám Định Kỹ Thuật</span>
          </h1>
          <p className="cyber-tech-subtitle">
            Hệ thống tiếp nhận, kiểm tra đo đạc thông mạch, chẩn đoán nguyên nhân lỗi phần cứng và
            kê đơn linh kiện thay thế báo giá trực tiếp cho khách hàng.
          </p>
        </header>

        {/* 2. Telemetry Stat Cards */}
        <section className="cyber-tech-stats-grid" aria-label="Thống kê hàng chờ">
          <div className="cyber-tech-stat-card is-amber">
            <span className="cyber-tech-stat-label">CẦN CHẨN ĐOÁN LỖI</span>
            <span className="cyber-tech-stat-value">{diagnosingCount || 1} PHIẾU</span>
          </div>

          <div className="cyber-tech-stat-card is-cyan">
            <span className="cyber-tech-stat-label">ĐANG TIẾN HÀNH SỬA</span>
            <span className="cyber-tech-stat-value">{repairingCount || 1} THIẾT BỊ</span>
          </div>

          <div className="cyber-tech-stat-card">
            <span className="cyber-tech-stat-label">TỔNG PHIẾU HIỂN THỊ</span>
            <span className="cyber-tech-stat-value">{filteredTickets.length} PHIẾU</span>
          </div>
        </section>

        {/* 3. Toolbar & Status Tabs */}
        <section className="cyber-tech-toolbar">
          <div className="cyber-tech-tabs-row" role="tablist" aria-label="Bộ lọc trạng thái">
            <button
              type="button"
              className={`cyber-tech-tab-btn ${activeTab === 'DIAGNOSING' ? 'active-tab' : ''}`}
              onClick={() => setActiveTab('DIAGNOSING')}
              role="tab"
              aria-selected={activeTab === 'DIAGNOSING'}
            >
              <span>⚡ Cần chẩn đoán (DIAGNOSING)</span>
              <span className="cyber-tab-badge">{diagnosingCount || 1}</span>
            </button>

            <button
              type="button"
              className={`cyber-tech-tab-btn ${activeTab === 'REPAIRING' ? 'active-cyan' : ''}`}
              onClick={() => setActiveTab('REPAIRING')}
              role="tab"
              aria-selected={activeTab === 'REPAIRING'}
            >
              <span>🛠️ Đang sửa chữa (REPAIRING)</span>
            </button>

            <button
              type="button"
              className={`cyber-tech-tab-btn ${activeTab === 'RECEIVED' ? 'active-tab' : ''}`}
              onClick={() => setActiveTab('RECEIVED')}
              role="tab"
              aria-selected={activeTab === 'RECEIVED'}
            >
              <span>📥 Mới tiếp nhận (RECEIVED)</span>
            </button>

            <button
              type="button"
              className={`cyber-tech-tab-btn ${activeTab === 'ALL' ? 'active-tab' : ''}`}
              onClick={() => setActiveTab('ALL')}
              role="tab"
              aria-selected={activeTab === 'ALL'}
            >
              <span>📋 Tất cả phiếu</span>
            </button>
          </div>

          <div className="cyber-tech-search-wrap">
            <span className="cyber-tech-search-icon" aria-hidden="true">🔍</span>
            <input
              type="text"
              className="cyber-tech-search-input"
              placeholder="Tìm kiếm theo mã phiếu (TK-1001), khách hàng, SĐT hoặc số Serial..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </section>

        {/* 4. Tickets List Body */}
        <section className="cyber-tech-ticket-grid" aria-label="Danh sách phiếu cần xử lý">
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <CyberSkeleton variant="rect" height={160} style={{ borderRadius: 12 }} />
              <CyberSkeleton variant="rect" height={160} style={{ borderRadius: 12 }} />
            </div>
          ) : filteredTickets.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '4rem 1rem',
                background: 'var(--cr-bg-surface)',
                borderRadius: 12,
                border: '1px solid var(--cr-border-subtle)',
              }}
            >
              <span style={{ fontSize: '3rem' }}>🔍</span>
              <h3 style={{ color: 'var(--cr-text-primary)', marginTop: '1rem' }}>
                Không có phiếu sửa chữa nào trong hàng chờ
              </h3>
              <p style={{ color: 'var(--cr-text-muted)' }}>
                Tất cả thiết bị đã được chuyển trạng thái hoặc không khớp với từ khóa tìm kiếm.
              </p>
            </div>
          ) : (
            filteredTickets.map((ticket) => {
              const isDiagnosing = ticket.status === TicketStatus.DIAGNOSING;

              return (
                <article
                  key={ticket.id}
                  className={`cyber-tech-ticket-card ${isDiagnosing ? 'needs-diagnosis' : ''}`}
                >
                  {/* Top Bar: Code, Priority & Status */}
                  <div className="cyber-tech-ticket-top">
                    <div className="cyber-tech-code-group">
                      <span className="cyber-tech-ticket-code">{ticket.ticketCode}</span>
                      <span className={`cyber-priority-pill ${getPriorityClass(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </div>

                    <span className={`cyber-status-pill ${getStatusClass(ticket.status)}`}>
                      ● {ticket.status}
                    </span>
                  </div>

                  {/* Middle Content */}
                  <div className="cyber-tech-ticket-content">
                    <div>
                      <h3 className="cyber-tech-device-name">{ticket.deviceType}</h3>
                      <div className="cyber-tech-info-row">
                        <span>👤 Khách hàng:</span>
                        <strong style={{ color: 'var(--cr-text-primary)' }}>
                          {ticket.customerName}
                        </strong>
                        <span>({ticket.customerPhone})</span>
                      </div>
                      <div className="cyber-tech-info-row" style={{ marginTop: 4 }}>
                        <span>🔢 Serial Number:</span>
                        <span style={{ fontFamily: 'var(--cr-font-mono, monospace)' }}>
                          {ticket.serialNumber}
                        </span>
                      </div>
                    </div>

                    <div className="cyber-tech-fault-box">
                      <span className="cyber-tech-fault-label">Mô tả lỗi từ khách hàng:</span>
                      <span className="cyber-tech-fault-desc">{ticket.faultDescription}</span>
                    </div>
                  </div>

                  {/* Bottom Actions */}
                  <div className="cyber-tech-ticket-bottom">
                    <span className="cyber-tech-intake-time">
                      Tiếp nhận: {formatDateTime(ticket.createdAt)}
                    </span>

                    <div>
                      {isDiagnosing ? (
                        <button
                          type="button"
                          className="cyber-tech-cta-diagnose-btn"
                          onClick={() => onSelectTicketForDiagnosis?.(ticket.id || ticket.ticketCode)}
                        >
                          <span>⚡ Bắt đầu chẩn đoán & Lập báo giá</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="cyber-tech-cta-view-btn"
                          onClick={() => onSelectTicketForDiagnosis?.(ticket.id || ticket.ticketCode)}
                        >
                          <span>👁️ Xem chi tiết phiếu</span>
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </MainLayout>
  );
};

export default TechnicianTicketListPage;
