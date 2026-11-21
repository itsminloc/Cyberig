/**
 * Build Spec Sheet Card Component (Task FE-07 / PB-13)
 * Displays detailed parts breakdown, hardware specs, estimated wattage,
 * compatibility status, and print/PDF export layout.
 */

import React from 'react';
import {
  HardwareCategory,
  HardwareItem,
  CpuSpecs,
  MotherboardSpecs,
  RamSpecs,
  GpuSpecs,
  PsuSpecs,
  CaseSpecs,
} from '../../../modules/hardware/hardware.model';
import { CompatibilityResult } from '../../../modules/compatibility/compatibility.model';
import { compatibilityService } from '../../../modules/compatibility/compatibility.service';
import './BuildSpecSheetCard.css';

export interface BuildSpecSheetCardProps {
  items: HardwareItem[];
  compatibilityResult?: CompatibilityResult;
  totalPrice?: number;
  customerInfo?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  orderId?: string;
  onExportPdf?: () => void;
  showExportButton?: boolean;
  className?: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  [HardwareCategory.CPU]: '🧠',
  [HardwareCategory.MOTHERBOARD]: '🖲️',
  [HardwareCategory.RAM]: '⚡',
  [HardwareCategory.GPU]: '🎮',
  [HardwareCategory.PSU]: '🔋',
  [HardwareCategory.CASE]: '🖥️',
  [HardwareCategory.COOLER]: '❄️',
  [HardwareCategory.STORAGE]: '💾',
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

export const BuildSpecSheetCard: React.FC<BuildSpecSheetCardProps> = ({
  items,
  compatibilityResult,
  totalPrice,
  customerInfo,
  orderId,
  onExportPdf,
  showExportButton = true,
  className = '',
}) => {
  // Evaluate compatibility if not provided
  const compat = React.useMemo(() => {
    return compatibilityResult || compatibilityService.validateBuild(items);
  }, [items, compatibilityResult]);

  // Compute total price if not provided
  const total = React.useMemo(() => {
    if (totalPrice !== undefined) return totalPrice;
    return items.reduce((sum, item) => sum + item.price, 0);
  }, [items, totalPrice]);

  const handlePrint = () => {
    if (onExportPdf) {
      onExportPdf();
    } else if (typeof window !== 'undefined' && window.print) {
      window.print();
    }
  };

  // Helper to extract key spec pills for each category
  const renderSpecPills = (item: HardwareItem) => {
    const pills: string[] = [];
    const specs = item.specs as any;

    if (!specs) return null;

    if (item.categoryId === HardwareCategory.CPU) {
      const cpu = specs as CpuSpecs;
      if (cpu.socket) pills.push(`Socket: ${cpu.socket}`);
      if (cpu.tdpWatts) pills.push(`TDP: ${cpu.tdpWatts}W`);
      if (cpu.cores && cpu.threads) pills.push(`${cpu.cores}C / ${cpu.threads}T`);
    } else if (item.categoryId === HardwareCategory.MOTHERBOARD) {
      const mb = specs as MotherboardSpecs;
      if (mb.socket) pills.push(mb.socket);
      if (mb.chipset) pills.push(mb.chipset);
      if (mb.ramType) pills.push(mb.ramType);
      if (mb.formFactor) pills.push(mb.formFactor);
    } else if (item.categoryId === HardwareCategory.RAM) {
      const ram = specs as RamSpecs;
      if (ram.generation) pills.push(ram.generation);
      if (ram.capacityGb) pills.push(`${ram.capacityGb}GB`);
      if (ram.speedMhz) pills.push(`${ram.speedMhz}MHz`);
    } else if (item.categoryId === HardwareCategory.GPU) {
      const gpu = specs as GpuSpecs;
      if (gpu.lengthMm) pills.push(`Dài: ${gpu.lengthMm}mm`);
      if (gpu.tdpWatts) pills.push(`TDP: ${gpu.tdpWatts}W`);
      if (gpu.vramGb) pills.push(`${gpu.vramGb}GB VRAM`);
    } else if (item.categoryId === HardwareCategory.PSU) {
      const psu = specs as PsuSpecs;
      if (psu.wattage) pills.push(`${psu.wattage}W`);
      if (psu.efficiencyRating) pills.push(psu.efficiencyRating.replace(/_/g, ' '));
    } else if (item.categoryId === HardwareCategory.CASE) {
      const cs = specs as CaseSpecs;
      if (cs.maxGpuLengthMm) pills.push(`VGA Max: ${cs.maxGpuLengthMm}mm`);
      if (cs.formFactorSupport && cs.formFactorSupport.length > 0) {
        pills.push(cs.formFactorSupport.join(', '));
      }
    }

    if (pills.length === 0) return null;

    return (
      <div className="spec-pills-row">
        {pills.map((pill, idx) => (
          <span key={idx} className="spec-pill">
            {pill}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className={`cyber-spec-sheet-root ${className}`}>
      {/* Printable Header - Visible in Print Layout */}
      <div className="spec-sheet-print-header">
        <div className="print-brand-title">CYBERRIG - SPEC SHEET & QUOTATION</div>
        <div className="print-meta-row">
          {orderId && <div>Mã đơn hàng: <strong>{orderId}</strong></div>}
          <div>Ngày xuất: {new Date().toLocaleDateString('vi-VN')}</div>
          {customerInfo?.name && <div>Khách hàng: <strong>{customerInfo.name}</strong></div>}
          {customerInfo?.phone && <div>SĐT: {customerInfo.phone}</div>}
        </div>
      </div>

      {/* Screen Header */}
      <div className="spec-sheet-header no-print">
        <div className="spec-sheet-title-group">
          <span className="spec-sheet-icon">📑</span>
          <div>
            <h3 className="spec-sheet-title">BẢN KÊ CẤU HÌNH CHI TIẾT (SPEC SHEET)</h3>
            <p className="spec-sheet-subtitle">
              {items.length} linh kiện phần cứng đã được kiểm định tương thích
            </p>
          </div>
        </div>

        {showExportButton && (
          <button
            type="button"
            className="spec-sheet-export-btn"
            onClick={handlePrint}
            title="In hoặc Lưu thành file PDF cấu hình (Ctrl + P)"
          >
            <span>🖨️ In / Lưu PDF</span>
          </button>
        )}
      </div>

      {/* Parts Table */}
      <div className="spec-sheet-table-wrapper">
        <table className="spec-sheet-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>#</th>
              <th>Phân loại</th>
              <th>Tên linh kiện & Thông số kỹ thuật</th>
              <th style={{ textAlign: 'center', width: '70px' }}>SL</th>
              <th style={{ textAlign: 'right', width: '130px' }}>Đơn giá</th>
              <th style={{ textAlign: 'right', width: '140px' }}>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const icon = CATEGORY_ICONS[item.categoryId] || '📦';
              return (
                <tr key={item.id || idx} className="spec-sheet-row">
                  <td className="row-index">{idx + 1}</td>
                  <td className="row-category">
                    <span className="category-tag">
                      <span className="category-icon">{icon}</span>
                      <span>{item.categoryId}</span>
                    </span>
                  </td>
                  <td className="row-name-specs">
                    <div className="item-name">{item.name}</div>
                    <div className="item-meta">
                      <span className="item-brand">{item.brand}</span>
                      {item.model && <span className="item-model">[{item.model}]</span>}
                    </div>
                    {renderSpecPills(item)}
                  </td>
                  <td className="row-quantity" style={{ textAlign: 'center' }}>
                    1
                  </td>
                  <td className="row-price" style={{ textAlign: 'right' }}>
                    {formatCurrency(item.price)}
                  </td>
                  <td className="row-subtotal" style={{ textAlign: 'right' }}>
                    {formatCurrency(item.price)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Telemetry Summary Bar */}
      <div className="spec-sheet-summary-grid">
        <div className="summary-telemetry-box">
          <div className="telemetry-label">Công suất tiêu thụ ước tính</div>
          <div className="telemetry-value-row">
            <span className="telemetry-number">{compat.totalEstimatedWattage}W</span>
            <span className="telemetry-sub">/ Khuyến nghị nguồn: {compat.recommendedPsuWattage}W+</span>
          </div>
        </div>

        <div className="summary-status-box">
          <div className="telemetry-label">Đánh giá kỹ thuật</div>
          <div className="status-badge-row">
            <span className={`compat-pill ${compat.status.toLowerCase()}`}>
              {compat.status === 'COMPATIBLE' && '✓ TƯƠNG THÍCH 100%'}
              {compat.status === 'WARNING' && '⚠ CẢNH BÁO TƯƠNG THÍCH'}
              {compat.status === 'INCOMPATIBLE' && '✕ XUNG ĐỘT PHẦN CỨNG'}
            </span>
          </div>
        </div>

        <div className="summary-total-box">
          <div className="total-label">Tổng thanh toán linh kiện</div>
          <div className="total-amount">{formatCurrency(total)}</div>
        </div>
      </div>
    </div>
  );
};

export default BuildSpecSheetCard;
