import React, { useState } from 'react';
import { CompatibilityResult } from '../../../modules/compatibility/compatibility.model';
import './LiveCompatibilityBar.css';

export interface LiveCompatibilityBarProps {
  result: CompatibilityResult;
  totalPrice: number;
  selectedCount?: number;
  psuWattage?: number | null;
  onSaveBuild?: () => void;
  onAddToCart?: () => void;
  onProceedToCheckout?: () => void;
  canProceedToCheckout?: boolean;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

export const LiveCompatibilityBar: React.FC<LiveCompatibilityBarProps> = ({
  result,
  totalPrice,
  selectedCount = 0,
  psuWattage,
  onSaveBuild,
  onAddToCart,
  onProceedToCheckout,
  canProceedToCheckout = true,
}) => {
  const [isIssuesOpen, setIsIssuesOpen] = useState(false);

  // Status mapping
  const statusConfig = {
    COMPATIBLE: {
      shellClass: 'status-compatible',
      badgeClass: 'badge-compatible',
      label: 'TƯƠNG THÍCH',
      icon: '✓',
    },
    WARNING: {
      shellClass: 'status-warning',
      badgeClass: 'badge-warning',
      label: 'CẢNH BÁO',
      icon: '⚠',
    },
    INCOMPATIBLE: {
      shellClass: 'status-incompatible',
      badgeClass: 'badge-incompatible',
      label: 'XUNG ĐỘT',
      icon: '✕',
    },
  }[result.status];

  // Wattage calculation
  const totalWatts = result.totalEstimatedWattage;
  const recommendedWatts = result.recommendedPsuWattage;
  const maxCapacity = psuWattage ? psuWattage : Math.max(recommendedWatts * 1.25, 600);
  const fillPercentage = Math.min(Math.round((totalWatts / maxCapacity) * 100), 100);

  // Wattage fill color
  let fillStatusClass = 'fill-green';
  if (psuWattage && totalWatts > psuWattage) {
    fillStatusClass = 'fill-red';
  } else if (psuWattage && totalWatts > psuWattage * 0.85) {
    fillStatusClass = 'fill-amber';
  } else if (result.status === 'WARNING') {
    fillStatusClass = 'fill-amber';
  } else if (result.status === 'INCOMPATIBLE') {
    fillStatusClass = 'fill-red';
  }

  const errorsCount = result.issues.filter((i) => i.type === 'ERROR').length;
  const warningsCount = result.issues.filter((i) => i.type === 'WARNING').length;
  const hasIssues = result.issues.length > 0;

  return (
    <div className="cyber-compat-bar-wrapper">
      <div className={`cyber-compat-bar-shell ${statusConfig.shellClass}`}>
        {/* Floating Expandable Issues Drawer */}
        {isIssuesOpen && (
          <div className="cyber-issues-drawer" role="dialog" aria-modal="true">
            <div className="cyber-issues-drawer-header">
              <span className="cyber-issues-drawer-title">
                {hasIssues
                  ? `Chi tiết đánh giá kỹ thuật (${errorsCount} Lỗi, ${warningsCount} Cảnh báo)`
                  : 'Đánh giá kỹ thuật: Tương thích hoàn hảo'}
              </span>
              <button
                type="button"
                className="cyber-issues-close-btn"
                onClick={() => setIsIssuesOpen(false)}
                aria-label="Đóng bảng vấn đề"
              >
                ✕
              </button>
            </div>
            {hasIssues ? (
              <ul className="cyber-issues-list">
                {result.issues.map((issue, idx) => (
                  <li
                    key={idx}
                    className={`cyber-issue-item ${
                      issue.type === 'ERROR' ? 'is-error' : 'is-warning'
                    }`}
                  >
                    <span className="cyber-issue-tag">[{issue.rule}]</span>
                    <span>{issue.message}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div
                style={{
                  color: 'var(--cr-status-success)',
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 0',
                }}
              >
                <span>✓</span>
                <span>
                  Tất cả linh kiện đã chọn (Socket, Chuẩn RAM, Nguồn điện, Kích cỡ thùng máy) đều đồng bộ 100%!
                </span>
              </div>
            )}
          </div>
        )}

        {/* Main Bar Content */}
        <div className="cyber-compat-bar-inner">
          {/* 1. Left: Live Status Badge & Issue Drawer Toggle */}
          <div className="cyber-compat-status-group">
            <div
              className={`cyber-status-badge ${statusConfig.badgeClass}`}
              onClick={() => setIsIssuesOpen(!isIssuesOpen)}
              style={{ cursor: 'pointer' }}
              title="Nhấn để xem chi tiết đánh giá tương thích"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setIsIssuesOpen(!isIssuesOpen);
              }}
            >
              <span>{statusConfig.icon}</span>
              <span>{statusConfig.label}</span>
            </div>

            {hasIssues && (
              <button
                type="button"
                className={`cyber-issues-toggle-btn ${errorsCount > 0 ? 'has-errors' : ''}`}
                onClick={() => setIsIssuesOpen(!isIssuesOpen)}
                aria-expanded={isIssuesOpen}
              >
                <span>{errorsCount > 0 ? '⛔' : '⚠️'}</span>
                <span>
                  {errorsCount > 0
                    ? `${errorsCount} lỗi phần cứng`
                    : `${warningsCount} lưu ý`}
                </span>
                <span>{isIssuesOpen ? '▼' : '▲'}</span>
              </button>
            )}
          </div>

          {/* 2. Center: Dynamic Estimated Wattage Meter */}
          <div className="cyber-compat-wattage-group">
            <div className="cyber-wattage-header">
              <span className="cyber-wattage-label">Điện áp ước tính:</span>
              <span className="cyber-wattage-value">
                {totalWatts}W{' '}
                <span>
                  / {psuWattage ? `${psuWattage}W (PSU)` : `Khuyến nghị ${recommendedWatts}W`}
                </span>
              </span>
            </div>
            <div className="cyber-wattage-track" title={`${totalWatts}W / ${maxCapacity}W`}>
              <div
                className={`cyber-wattage-fill ${fillStatusClass}`}
                style={{ width: `${Math.max(fillPercentage, 5)}%` }}
              />
            </div>
          </div>

          {/* 3. Right: Total Price & Primary CTA */}
          <div className="cyber-compat-right-group">
            <div className="cyber-price-block">
              <span className="cyber-price-label">
                Tạm tính ({selectedCount} linh kiện)
              </span>
              <span className="cyber-price-amount">{formatCurrency(totalPrice)}</span>
            </div>

            {onSaveBuild && (
              <button
                type="button"
                className="cyber-slot-action-btn"
                style={{ height: 44, padding: '0 16px', display: 'none' }}
                onClick={onSaveBuild}
              >
                Lưu
              </button>
            )}

            {onProceedToCheckout ? (
              <button
                type="button"
                className="cyber-bar-cta-btn checkout-btn"
                onClick={onProceedToCheckout}
                disabled={!canProceedToCheckout || result.status === 'INCOMPATIBLE'}
                title={
                  result.status === 'INCOMPATIBLE'
                    ? 'Vui lòng giải quyết xung đột linh kiện trước khi đặt hàng'
                    : !canProceedToCheckout
                    ? 'Vui lòng chọn đủ linh kiện cốt lõi: CPU, Mainboard, RAM, Nguồn PSU'
                    : 'Tiến hành đặt hàng và khóa tạm tồn kho'
                }
              >
                <span>⚡ TIẾN HÀNH ĐẶT HÀNG</span>
                <span>→</span>
              </button>
            ) : (
              <button
                type="button"
                className="cyber-bar-cta-btn"
                onClick={onAddToCart}
                disabled={result.status === 'INCOMPATIBLE' || selectedCount === 0}
                title={
                  result.status === 'INCOMPATIBLE'
                    ? 'Vui lòng giải quyết xung đột linh kiện trước khi tiếp tục'
                    : selectedCount === 0
                    ? 'Vui lòng chọn ít nhất 1 linh kiện'
                    : 'Tiến hành đặt hàng hoặc lưu cấu hình'
                }
              >
                <span>Thêm vào giỏ hàng</span>
                <span>→</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveCompatibilityBar;
