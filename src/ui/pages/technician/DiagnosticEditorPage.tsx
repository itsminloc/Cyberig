/**
 * Technician Diagnostic & Quotation Editor Page
 * Split-view interface for recording hardware diagnostics, selecting replacement parts,
 * calculating real-time costs, and submitting quotation to customer.
 * Aligned with Task FE-06 and Task BE-08 specifications.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  RepairTicket,
  QuotationResult,
  TicketStatus,
} from '../../../modules/repair-tickets/ticket.model';
import { HardwareCategory, HardwareItem } from '../../../modules/hardware/hardware.model';
import { fetchTicketById, submitTicketQuotation } from '../../services/technician.api';
import { HardwareSelectModal } from '../../components/builder/HardwareSelectModal';
import { HexSpinner } from '../../components/feedback/HexSpinner';
import { CyberSkeleton } from '../../components/feedback/CyberSkeleton';
import { MainLayout } from '../../layouts/MainLayout';
import './DiagnosticEditorPage.css';

export interface DiagnosticEditorPageProps {
  ticketId?: string;
  onBack?: () => void;
  onSuccess?: (result: QuotationResult) => void;
}

export interface QuotedPartSelection {
  item: HardwareItem;
  quantity: number;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

const QUICK_DIAGNOSTIC_TAGS = [
  'Hỏng khe cắm RAM 1 chập chờn',
  'Cháy tụ lọc nguồn VRM',
  'Quá nhiệt ngắt nguồn do khô keo tản',
  'Chập đường 12V nguồn phụ GPU',
  'Hư hỏng mắt đọc ổ cứng NVMe',
  'Lỗi chip quản lý nguồn Super I/O',
];

const LABOR_COST_PRESETS = [
  { label: '150.000đ (Cơ bản)', value: 150000 },
  { label: '250.000đ (Tiêu chuẩn)', value: 250000 },
  { label: '500.000đ (Chuyên sâu)', value: 500000 },
  { label: '1.000.000đ (Đặc biệt)', value: 1000000 },
];

export const DiagnosticEditorPage: React.FC<DiagnosticEditorPageProps> = ({
  ticketId = 'TK-1001',
  onBack,
  onSuccess,
}) => {
  const [ticket, setTicket] = useState<RepairTicket | null>(null);
  const [isLoadingTicket, setIsLoadingTicket] = useState<boolean>(true);

  // Form states
  const [diagnosticNotes, setDiagnosticNotes] = useState<string>('');
  const [technicianId] = useState<string>('tech-nv-nam');
  const [laborCost, setLaborCost] = useState<number>(250000);
  const [quotedParts, setQuotedParts] = useState<QuotedPartSelection[]>([]);

  // Modal states
  const [isPartsModalOpen, setIsPartsModalOpen] = useState<boolean>(false);
  const [modalCategory, setModalCategory] = useState<HardwareCategory>(HardwareCategory.RAM);

  // Submission & feedback states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [quotationSuccess, setQuotationSuccess] = useState<QuotationResult | null>(null);

  // Load ticket details on mount
  useEffect(() => {
    let isSubscribed = true;
    setIsLoadingTicket(true);
    setErrorMessage(null);

    fetchTicketById(ticketId)
      .then((data) => {
        if (isSubscribed) {
          setTicket(data);
          if (data.diagnosisNotes) {
            setDiagnosticNotes(data.diagnosisNotes);
          }
          setIsLoadingTicket(false);
        }
      })
      .catch((err) => {
        if (isSubscribed) {
          setErrorMessage(err.message || 'Không thể tải thông tin phiếu sửa chữa.');
          setIsLoadingTicket(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [ticketId]);

  // Financial Calculations
  const partsCost = useMemo(() => {
    return quotedParts.reduce(
      (sum, p) => sum + p.item.price * p.quantity,
      0
    );
  }, [quotedParts]);

  const totalCost = useMemo(() => {
    return (Number(laborCost) || 0) + partsCost;
  }, [laborCost, partsCost]);

  // Handlers for Quoted Parts
  const handleSelectHardwareFromModal = (item: HardwareItem) => {
    setQuotedParts((prev) => {
      const existingIdx = prev.findIndex((p) => p.item.id === item.id);
      if (existingIdx !== -1) {
        // Increment quantity up to stock
        const current = prev[existingIdx];
        const newQty = Math.min(item.stockQuantity, current.quantity + 1);
        const updated = [...prev];
        updated[existingIdx] = { ...current, quantity: newQty };
        return updated;
      }
      return [...prev, { item, quantity: 1 }];
    });
    setIsPartsModalOpen(false);
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setQuotedParts((prev) =>
      prev.map((p) => {
        if (p.item.id === itemId) {
          const newQty = Math.max(1, Math.min(p.item.stockQuantity, p.quantity + delta));
          return { ...p, quantity: newQty };
        }
        return p;
      })
    );
  };

  const handleRemovePart = (itemId: string) => {
    setQuotedParts((prev) => prev.filter((p) => p.item.id !== itemId));
  };

  const handleApplyQuickTag = (tag: string) => {
    setDiagnosticNotes((prev) => {
      if (!prev.trim()) return tag;
      if (prev.includes(tag)) return prev;
      return `${prev}. ${tag}`;
    });
  };

  // Submit Quotation to API
  const handleSubmitQuotation = async () => {
    if (!ticket) return;

    if (!diagnosticNotes.trim()) {
      setErrorMessage('Vui lòng nhập mô tả kết quả chẩn đoán trước khi tạo báo giá.');
      return;
    }

    if (laborCost < 0) {
      setErrorMessage('Chi phí tiền công không thể mang giá trị âm.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        diagnosticNotes: diagnosticNotes.trim(),
        technicianId,
        laborCost: Number(laborCost),
        parts: quotedParts.map((p) => ({
          hardwareId: p.item.id,
          quantity: p.quantity,
        })),
      };

      const result = await submitTicketQuotation(ticket.id || ticket.ticketCode, payload);
      setQuotationSuccess(result);
      onSuccess?.(result);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Đã xảy ra lỗi khi gửi báo giá chẩn đoán lên hệ thống.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="cyber-diag-container">
        {/* Top Breadcrumb & Ticket Identifier */}
        <div className="cyber-diag-nav-bar">
          <button
            type="button"
            className="cyber-diag-back-btn"
            onClick={onBack}
            aria-label="Quay lại danh sách phiếu"
          >
            <span>← Quay lại danh sách</span>
          </button>

          <span className="cyber-diag-ticket-badge">
            {ticket ? `${ticket.ticketCode} - [${ticket.status}]` : 'Đang tải...'}
          </span>
        </div>

        {/* Global Error Banner (If Any) */}
        {errorMessage && (
          <div className="cyber-diag-error-banner" role="alert">
            <span style={{ fontSize: '1.2rem' }}>⛔</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {isLoadingTicket ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <CyberSkeleton variant="rect" height={360} style={{ borderRadius: 12 }} />
            <CyberSkeleton variant="rect" height={360} style={{ borderRadius: 12 }} />
          </div>
        ) : !ticket ? (
          <div className="cyber-diag-card" style={{ textAlign: 'center', padding: '3rem' }}>
            <h3 style={{ color: 'var(--cr-text-primary)' }}>Không tìm thấy thông tin phiếu</h3>
            <button type="button" className="cyber-diag-back-btn" onClick={onBack}>
              Quay lại danh sách
            </button>
          </div>
        ) : (
          /* Split-View Layout */
          <div className="cyber-diag-split-layout">
            {/* ========================================================= */}
            {/* LEFT COLUMN: Device Info & Diagnostic Notes & Labor Cost  */}
            {/* ========================================================= */}
            <div className="cyber-diag-left-col">
              {/* 1. Ticket Overview Card */}
              <div className="cyber-diag-card">
                <h3 className="cyber-diag-card-title">
                  <span>📋 Thông Tin Thiết Bị & Khách Hàng</span>
                </h3>

                <div className="cyber-diag-meta-grid">
                  <div className="cyber-diag-meta-item">
                    <span className="cyber-diag-meta-label">Mã phiếu:</span>
                    <span className="cyber-diag-meta-val" style={{ color: '#ffaa00' }}>
                      {ticket.ticketCode}
                    </span>
                  </div>

                  <div className="cyber-diag-meta-item">
                    <span className="cyber-diag-meta-label">Khách hàng:</span>
                    <span className="cyber-diag-meta-val">
                      {ticket.customerName} ({ticket.customerPhone})
                    </span>
                  </div>

                  <div className="cyber-diag-meta-item">
                    <span className="cyber-diag-meta-label">Thiết bị:</span>
                    <span className="cyber-diag-meta-val">{ticket.deviceType}</span>
                  </div>

                  <div className="cyber-diag-meta-item">
                    <span className="cyber-diag-meta-label">Số Serial (S/N):</span>
                    <span className="cyber-diag-meta-val" style={{ fontFamily: 'var(--cr-font-mono, monospace)' }}>
                      {ticket.serialNumber}
                    </span>
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: 8 }}>
                  <span className="cyber-diag-meta-label" style={{ display: 'block', marginBottom: 4 }}>
                    Mô tả lỗi ban đầu từ khách:
                  </span>
                  <span style={{ fontSize: '0.875rem', color: 'var(--cr-text-secondary)' }}>
                    {ticket.faultDescription}
                  </span>
                </div>
              </div>

              {/* 2. Diagnostic Notes Textarea */}
              <div className="cyber-diag-card">
                <h3 className="cyber-diag-card-title">
                  <span>🔬 Ghi Chú Chẩn Đoán Của Kỹ Thuật Viên</span>
                </h3>

                <textarea
                  className="cyber-diag-textarea"
                  placeholder="Ghi chú nguyên nhân gây lỗi chi tiết (vd: Cháy mạch nguồn VRM, hỏng 1 thanh RAM Kingston DDR4, quạt tản nhiệt kẹt dị vật...)"
                  value={diagnosticNotes}
                  onChange={(e) => setDiagnosticNotes(e.target.value)}
                />

                {/* Quick Diagnosis Tags */}
                <div className="cyber-quick-tags-row">
                  <span className="cyber-quick-tag-label">Gợi ý nhanh:</span>
                  {QUICK_DIAGNOSTIC_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className="cyber-quick-tag-btn"
                      onClick={() => handleApplyQuickTag(tag)}
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Labor Cost Input */}
              <div className="cyber-diag-card">
                <h3 className="cyber-diag-card-title">
                  <span>🛠️ Chi Phí Tiền Công / Dịch Vụ</span>
                </h3>

                <div className="cyber-cost-input-wrap">
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    className="cyber-cost-input"
                    value={laborCost}
                    onChange={(e) => setLaborCost(Math.max(0, Number(e.target.value) || 0))}
                  />
                  <span className="cyber-cost-unit">VNĐ</span>
                </div>

                {/* Quick Cost Presets */}
                <div className="cyber-cost-presets">
                  <span className="cyber-quick-tag-label">Định mức:</span>
                  {LABOR_COST_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      className="cyber-preset-pill"
                      onClick={() => setLaborCost(p.value)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* RIGHT COLUMN: Parts Replacement & Real-time Cost Summary */}
            {/* ========================================================= */}
            <div className="cyber-diag-right-col">
              <div className="cyber-diag-card">
                <div className="cyber-parts-header-row">
                  <h3 className="cyber-diag-card-title" style={{ border: 'none', padding: 0 }}>
                    <span>📦 Linh Kiện Thay Thế Từ Kho ({quotedParts.length})</span>
                  </h3>

                  <button
                    type="button"
                    className="cyber-btn-add-part"
                    onClick={() => {
                      setModalCategory(HardwareCategory.RAM);
                      setIsPartsModalOpen(true);
                    }}
                  >
                    <span>+ Thêm linh kiện từ kho</span>
                  </button>
                </div>

                {/* Quoted Parts List */}
                {quotedParts.length === 0 ? (
                  <div className="cyber-parts-empty">
                    <span style={{ fontSize: '2rem' }}>📦</span>
                    <span>Chưa kê linh kiện thay thế nào.</span>
                    <span style={{ fontSize: '0.8rem' }}>
                      Bấm nút "+ Thêm linh kiện từ kho" nếu ca sửa chữa cần thay thế phần cứng.
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {quotedParts.map(({ item, quantity }) => {
                      const lineTotal = item.price * quantity;
                      const isMaxStock = quantity >= item.stockQuantity;

                      return (
                        <div key={item.id} className="cyber-quoted-part-item">
                          <div className="cyber-part-info">
                            <span className="cyber-part-brand">[{item.brand}] - {item.categoryId}</span>
                            <span className="cyber-part-name">{item.name}</span>
                            <span className="cyber-part-unit-price">
                              Đơn giá: {formatCurrency(item.price)} | Tồn kho: {item.stockQuantity}
                            </span>
                          </div>

                          {/* Quantity Controls (min 44px touch targets) */}
                          <div className="cyber-qty-controller">
                            <button
                              type="button"
                              className="cyber-qty-btn"
                              onClick={() => handleUpdateQuantity(item.id, -1)}
                              disabled={quantity <= 1}
                              aria-label={`Giảm số lượng ${item.name}`}
                            >
                              -
                            </button>
                            <span className="cyber-qty-val">{quantity}</span>
                            <button
                              type="button"
                              className="cyber-qty-btn"
                              onClick={() => handleUpdateQuantity(item.id, 1)}
                              disabled={isMaxStock}
                              aria-label={`Tăng số lượng ${item.name}`}
                            >
                              +
                            </button>
                          </div>

                          {/* Line Total */}
                          <span className="cyber-part-subtotal">
                            {formatCurrency(lineTotal)}
                          </span>

                          {/* Delete Action */}
                          <button
                            type="button"
                            className="cyber-part-del-btn"
                            onClick={() => handleRemovePart(item.id)}
                            aria-label={`Xóa linh kiện ${item.name}`}
                          >
                            🗑️
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Real-time Summary Card */}
              <div className="cyber-summary-box">
                <h3 className="cyber-diag-card-title" style={{ border: 'none', padding: 0 }}>
                  <span>⚡ Bảng Tổng Kết Chi Phí Báo Giá</span>
                </h3>

                <div className="cyber-summary-row">
                  <span>Tiền công dịch vụ kỹ thuật:</span>
                  <span style={{ fontFamily: 'var(--cr-font-mono, monospace)', fontWeight: 600 }}>
                    {formatCurrency(laborCost)}
                  </span>
                </div>

                <div className="cyber-summary-row">
                  <span>Tổng tiền linh kiện ({quotedParts.length} mục):</span>
                  <span style={{ fontFamily: 'var(--cr-font-mono, monospace)', fontWeight: 600 }}>
                    {formatCurrency(partsCost)}
                  </span>
                </div>

                <div className="cyber-summary-row total-row">
                  <span className="cyber-summary-total-label">Tổng Chi Phí Dự Tính:</span>
                  <span className="cyber-summary-total-price">
                    {formatCurrency(totalCost)}
                  </span>
                </div>

                {/* Submit Action Button */}
                <button
                  type="button"
                  className="cyber-btn-submit-quote"
                  disabled={isSubmitting || !diagnosticNotes.trim()}
                  onClick={handleSubmitQuotation}
                >
                  {isSubmitting ? (
                    <HexSpinner size="sm" label="Đang đồng bộ..." />
                  ) : (
                    <span>🚀 GỬI BÁO GIÁ & CHỜ KHÁCH DUYỆT</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Component Selection Modal from Task FE-05 */}
        <HardwareSelectModal
          isOpen={isPartsModalOpen}
          category={modalCategory}
          onSelect={handleSelectHardwareFromModal}
          onClose={() => setIsPartsModalOpen(false)}
        />

        {/* Success Modal Confirmation */}
        {quotationSuccess && (
          <div className="cyber-diag-success-modal" role="dialog" aria-modal="true">
            <div className="cyber-diag-success-card">
              <span className="cyber-success-badge-icon">✅</span>
              <h2 className="cyber-success-title">Lập Báo Giá Thành Công!</h2>
              <p className="cyber-success-desc">
                Phiếu <strong>{ticket?.ticketCode}</strong> đã được chuyển sang trạng thái{' '}
                <strong style={{ color: '#c084fc' }}>QUOTED</strong>. Hệ thống đã lưu trữ danh sách
                linh kiện và tự động gửi thông báo đến khách hàng để chờ phê duyệt.
              </p>

              <div
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  padding: '1rem',
                  borderRadius: 8,
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--cr-text-muted)' }}>Tiền công:</span>
                  <strong>{formatCurrency(quotationSuccess.laborCost)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: 'var(--cr-text-muted)' }}>Linh kiện ({quotationSuccess.items.length}):</span>
                  <strong>{formatCurrency(quotationSuccess.partsCost)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 6 }}>
                  <span style={{ color: '#ffaa00', fontWeight: 700 }}>Tổng thanh toán:</span>
                  <strong style={{ color: '#ffaa00', fontSize: '1.1rem' }}>
                    {formatCurrency(quotationSuccess.totalCost)}
                  </strong>
                </div>
              </div>

              <div className="cyber-success-btn-group">
                <button
                  type="button"
                  className="cyber-success-btn-primary"
                  onClick={onBack}
                >
                  Quay lại danh sách phiếu
                </button>
                <button
                  type="button"
                  className="cyber-success-btn-secondary"
                  onClick={() => setQuotationSuccess(null)}
                >
                  Tiếp tục chỉnh sửa
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default DiagnosticEditorPage;
