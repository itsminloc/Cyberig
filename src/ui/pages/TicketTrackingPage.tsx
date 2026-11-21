import React, { useState, useEffect } from 'react';
import { RepairTicket, TicketPriority } from '../../modules/repair-tickets/ticket.model';
import { MainLayout } from '../layouts/MainLayout';
import { HexSpinner } from '../components/feedback/HexSpinner';
import { TicketTimeline } from '../components/tickets/TicketTimeline';
import { TicketLogFeed } from '../components/tickets/TicketLogFeed';
import {
  SAMPLE_TRACKING_TICKETS,
  lookupTicket,
} from './ticket-tracking.data';
import './TicketTrackingPage.css';

const formatCurrency = (amount?: number | null): string => {
  if (amount == null) return 'Đang cập nhật';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

export const TicketTrackingPage: React.FC = () => {
  const [searchInput, setSearchInput] = useState('TK-20260904-082');
  const [ticket, setTicket] = useState<RepairTicket | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tra cứu tự động phiếu mẫu đầu tiên khi mount trang
  useEffect(() => {
    executeLookup('TK-20260904-082');
  }, []);

  const executeLookup = async (code: string) => {
    if (!code.trim()) {
      setErrorMessage('Vui lòng nhập mã phiếu hoặc số điện thoại để tra cứu.');
      setTicket(null);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await lookupTicket(code);
      setTicket(result);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(
        error.message || 'Không thể truy vấn thông tin phiếu vào lúc này.'
      );
      setTicket(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeLookup(searchInput);
  };

  const handleQuickSelect = (code: string) => {
    setSearchInput(code);
    executeLookup(code);
  };

  return (
    <MainLayout>
      <div className="cyber-tracking-container">
        {/* 1. Header Banner */}
        <section className="cyber-tracking-hero">
          <span className="cyber-tracking-tag">
            ⚡ REPAIR TRACKING & WARRANTY LAB
          </span>
          <h1 className="cyber-tracking-title">
            Tra Cứu Tiến Độ Sửa Chữa & Bảo Hành
          </h1>
          <p className="cyber-tracking-subtitle">
            Hệ thống giám sát vòng đời thiết bị thời gian thực. Theo dõi chi tiết từng
            giai đoạn kiểm thử, báo giá linh kiện thay thế và lịch sử audit kỹ thuật.
          </p>
        </section>

        {/* 2. Search Box & Quick Sample Chips */}
        <section className="cyber-tracking-search-card" aria-label="Khung tìm kiếm phiếu">
          <form className="cyber-tracking-search-form" onSubmit={handleFormSubmit}>
            <div className="cyber-search-input-wrapper">
              <span className="cyber-search-icon" aria-hidden="true">
                🔍
              </span>
              <input
                type="text"
                className="cyber-search-input"
                placeholder="Nhập mã phiếu (ví dụ: TK-20260904-082) hoặc số điện thoại..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                aria-label="Mã phiếu hoặc số điện thoại tra cứu"
              />
            </div>

            <button type="submit" className="cyber-search-submit-btn">
              <span>⚡ Tra cứu ngay</span>
            </button>
          </form>

          {/* Quick Preset Samples */}
          <div className="cyber-quick-samples-bar">
            <span className="cyber-quick-label">Mẫu kiểm tra nhanh:</span>
            {SAMPLE_TRACKING_TICKETS.map((sample) => (
              <button
                key={sample.ticketCode}
                type="button"
                className="cyber-quick-chip"
                onClick={() => handleQuickSelect(sample.ticketCode)}
                title={`Khách hàng: ${sample.customerName} - ${sample.deviceType}`}
              >
                {sample.ticketCode} ({sample.status})
              </button>
            ))}
          </div>
        </section>

        {/* 3. Loading View: HexSpinner */}
        {isLoading && (
          <div className="cyber-tracking-loading-box">
            <HexSpinner
              size="lg"
              label="Đang thẩm định mã phiếu..."
              sublabel="Truy vấn dữ liệu từ CyberRig Core Network..."
            />
          </div>
        )}

        {/* 4. Error State Alert */}
        {!isLoading && errorMessage && (
          <div className="cyber-tracking-error-card" role="alert">
            <span className="cyber-error-icon">⚠️</span>
            <div className="cyber-error-content">
              <h4 className="cyber-error-title">Không Tìm Thấy Phiếu</h4>
              <p className="cyber-error-message">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* 5. Success Content: Device Summary + Timeline + Log Feed */}
        {!isLoading && ticket && (
          <div className="cyber-tracking-stack">
            {/* Device Summary Card */}
            <div className="cyber-device-summary-card">
              <div className="cyber-device-header">
                <div className="cyber-device-code-group">
                  <span className="cyber-device-code">{ticket.ticketCode}</span>
                  <span
                    className={`cyber-priority-pill priority-${ticket.priority.toLowerCase()}`}
                  >
                    Ưu tiên: {ticket.priority}
                  </span>
                </div>

                <div className="cyber-field-value text-mono">
                  Ngày tiếp nhận: {new Date(ticket.createdAt).toLocaleDateString('vi-VN')}
                </div>
              </div>

              <div className="cyber-device-grid">
                {/* Khách hàng */}
                <div className="cyber-device-field">
                  <span className="cyber-field-label">Khách hàng liên hệ:</span>
                  <span className="cyber-field-value">
                    {ticket.customerName} ({ticket.customerPhone.slice(0, 3)}***{ticket.customerPhone.slice(-4)})
                  </span>
                </div>

                {/* Thiết bị & Serial */}
                <div className="cyber-device-field">
                  <span className="cyber-field-label">Loại thiết bị & Model:</span>
                  <span className="cyber-field-value text-cyan">
                    {ticket.deviceType}
                  </span>
                </div>

                <div className="cyber-device-field">
                  <span className="cyber-field-label">Số Serial Number (SN):</span>
                  <span className="cyber-field-value text-mono">
                    {ticket.serialNumber}
                  </span>
                </div>

                {/* Tình trạng tiếp nhận */}
                <div className="cyber-device-field">
                  <span className="cyber-field-label">Tình trạng ngoại quan ban đầu:</span>
                  <span className="cyber-field-value">
                    {ticket.initialCondition}
                  </span>
                </div>

                {/* Hiện tượng lỗi */}
                <div className="cyber-device-field">
                  <span className="cyber-field-label">Mô tả lỗi từ khách hàng:</span>
                  <span className="cyber-field-value">
                    {ticket.faultDescription}
                  </span>
                </div>

                {/* Chẩn đoán */}
                <div className="cyber-device-field">
                  <span className="cyber-field-label">Chẩn đoán kỹ thuật:</span>
                  <span className="cyber-field-value">
                    {ticket.diagnosisNotes || 'Đang trong quá trình đo đạc chẩn đoán'}
                  </span>
                </div>

                {/* Báo giá & Bảo hành */}
                <div className="cyber-device-field">
                  <span className="cyber-field-label">Chi phí báo giá dự kiến:</span>
                  <span className="cyber-field-value text-quote">
                    {formatCurrency(ticket.quoteAmount)}
                  </span>
                </div>

                <div className="cyber-device-field">
                  <span className="cyber-field-label">Thời hạn bảo hành dịch vụ:</span>
                  <span className="cyber-field-value">
                    {ticket.warrantyMonths > 0
                      ? `${ticket.warrantyMonths} Tháng chính hãng`
                      : 'Chưa kích hoạt'}
                  </span>
                </div>
              </div>
            </div>

            {/* Stepper Timeline Component */}
            <TicketTimeline
              currentStatus={ticket.status}
              ticketCode={ticket.ticketCode}
              timelineLogs={ticket.timeline}
            />

            {/* Technical Audit Log Feed Component */}
            <TicketLogFeed logs={ticket.timeline || []} />
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default TicketTrackingPage;
