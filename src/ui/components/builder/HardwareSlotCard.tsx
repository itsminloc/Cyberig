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
  CoolerSpecs,
  StorageSpecs,
} from '../../../modules/hardware/hardware.model';
import { CyberSkeleton } from '../feedback/CyberSkeleton';
import './HardwareSlotCard.css';

export interface HardwareSlotCardProps {
  category: HardwareCategory;
  title: string;
  icon: React.ReactNode;
  selectedItem?: HardwareItem | null;
  isLoading?: boolean;
  onSelect: () => void;
  onRemove?: () => void;
  conflict?: {
    type: 'ERROR' | 'WARNING';
    message: string;
  } | null;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

export const HardwareSlotCard: React.FC<HardwareSlotCardProps> = ({
  title,
  icon,
  selectedItem,
  isLoading = false,
  onSelect,
  onRemove,
  conflict,
}) => {
  // Render Spec Badges dynamically based on component type
  const renderSpecPills = (item: HardwareItem) => {
    const specs = item.specs;
    const pills: React.ReactNode[] = [];

    switch (item.categoryId) {
      case HardwareCategory.CPU: {
        const s = specs as CpuSpecs;
        if (s.socket) pills.push(<span key="soc" className="cyber-spec-pill pill-accent">Socket {s.socket}</span>);
        if (s.tdpWatts) pills.push(<span key="tdp" className="cyber-spec-pill pill-wattage">{s.tdpWatts}W TDP</span>);
        if (s.cores && s.threads) pills.push(<span key="cores" className="cyber-spec-pill">{s.cores}C / {s.threads}T</span>);
        break;
      }
      case HardwareCategory.MOTHERBOARD: {
        const s = specs as MotherboardSpecs;
        if (s.socket) pills.push(<span key="soc" className="cyber-spec-pill pill-accent">Socket {s.socket}</span>);
        if (s.chipset) pills.push(<span key="chip" className="cyber-spec-pill">{s.chipset}</span>);
        if (s.ramType) pills.push(<span key="ram" className="cyber-spec-pill pill-accent">{s.ramType}</span>);
        if (s.ramSlots) pills.push(<span key="slots" className="cyber-spec-pill">{s.ramSlots} Khe RAM</span>);
        if (s.formFactor) pills.push(<span key="ff" className="cyber-spec-pill">{s.formFactor}</span>);
        break;
      }
      case HardwareCategory.RAM: {
        const s = specs as RamSpecs;
        if (s.generation) pills.push(<span key="gen" className="cyber-spec-pill pill-accent">{s.generation}</span>);
        if (s.capacityGb) pills.push(<span key="cap" className="cyber-spec-pill">{s.capacityGb}GB</span>);
        if (s.speedMhz) pills.push(<span key="speed" className="cyber-spec-pill">{s.speedMhz}MHz</span>);
        if (s.modulesCount) pills.push(<span key="mod" className="cyber-spec-pill">{s.modulesCount} Thanh</span>);
        break;
      }
      case HardwareCategory.GPU: {
        const s = specs as GpuSpecs;
        if (s.lengthMm) pills.push(<span key="len" className="cyber-spec-pill pill-accent">Dài {s.lengthMm}mm</span>);
        if (s.tdpWatts) pills.push(<span key="tdp" className="cyber-spec-pill pill-wattage">{s.tdpWatts}W TDP</span>);
        if (s.vramGb) pills.push(<span key="vram" className="cyber-spec-pill">{s.vramGb}GB VRAM</span>);
        break;
      }
      case HardwareCategory.PSU: {
        const s = specs as PsuSpecs;
        if (s.wattage) pills.push(<span key="watt" className="cyber-spec-pill pill-accent">{s.wattage}W</span>);
        if (s.efficiencyRating) pills.push(<span key="eff" className="cyber-spec-pill">{s.efficiencyRating.replace(/_/g, ' ')}</span>);
        if (s.modularType) pills.push(<span key="mod" className="cyber-spec-pill">{s.modularType.replace(/_/g, ' ')}</span>);
        break;
      }
      case HardwareCategory.CASE: {
        const s = specs as CaseSpecs;
        if (s.maxGpuLengthMm) pills.push(<span key="gpu" className="cyber-spec-pill pill-accent">GPU tối đa {s.maxGpuLengthMm}mm</span>);
        if (s.maxCpuCoolerHeightMm) pills.push(<span key="cooler" className="cyber-spec-pill">Tản tối đa {s.maxCpuCoolerHeightMm}mm</span>);
        break;
      }
      case HardwareCategory.COOLER: {
        const s = specs as CoolerSpecs;
        if (s.type) pills.push(<span key="type" className="cyber-spec-pill pill-accent">{s.type === 'AIO' ? 'Tản AIO' : 'Tản Khí'}</span>);
        if (s.coolerHeightMm) pills.push(<span key="height" className="cyber-spec-pill">Cao {s.coolerHeightMm}mm</span>);
        if (s.radiatorSizeMm) pills.push(<span key="rad" className="cyber-spec-pill">Két {s.radiatorSizeMm}mm</span>);
        break;
      }
      case HardwareCategory.STORAGE: {
        const s = specs as StorageSpecs;
        if (s.type) pills.push(<span key="type" className="cyber-spec-pill pill-accent">{s.type.replace(/_/g, ' ')}</span>);
        if (s.capacityGb) pills.push(<span key="cap" className="cyber-spec-pill">{s.capacityGb >= 1000 ? `${s.capacityGb / 1000}TB` : `${s.capacityGb}GB`}</span>);
        break;
      }
    }

    return pills;
  };

  const cardStatusClass = conflict
    ? conflict.type === 'ERROR'
      ? 'has-error'
      : 'has-warning'
    : '';

  return (
    <div className={`cyber-slot-card ${cardStatusClass}`}>
      {/* 1. Slot Header */}
      <div className="cyber-slot-header">
        <div className="cyber-slot-label-group">
          {icon ? <span className="cyber-slot-icon-box">{icon}</span> : null}
          <span className="cyber-slot-title">{title}</span>
        </div>
        <span className="cyber-slot-status-pill">
          {selectedItem ? 'ĐÃ CHỌN' : 'CHƯA CHỌN'}
        </span>
      </div>

      {/* 2. Loading State */}
      {isLoading ? (
        <CyberSkeleton variant="rect" height={68} style={{ borderRadius: 8 }} />
      ) : selectedItem ? (
        /* 3. Selected State: Hardware Component Details */
        <div className="cyber-slot-selected-content">
          <div className="cyber-slot-details">
            <div className="cyber-slot-name-row">
              <span className="cyber-slot-brand-tag">{selectedItem.brand}</span>
              <h4 className="cyber-slot-item-name">{selectedItem.name}</h4>
            </div>
            <span className="cyber-slot-model-code">Model: {selectedItem.model}</span>
            <div className="cyber-slot-specs-row">
              {renderSpecPills(selectedItem)}
            </div>
          </div>

          <div className="cyber-slot-right-actions">
            <span className="cyber-slot-price">{formatCurrency(selectedItem.price)}</span>
            <div className="cyber-slot-btn-group">
              <button
                type="button"
                className="cyber-slot-action-btn"
                onClick={onSelect}
                aria-label={`Thay đổi ${title}`}
              >
                Thay đổi
              </button>
              {onRemove && (
                <button
                  type="button"
                  className="cyber-slot-action-btn btn-remove"
                  onClick={onRemove}
                  aria-label={`Gỡ bỏ ${selectedItem.name}`}
                >
                  Gỡ bỏ
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* 4. Empty State: Dashed Button */
        <button
          type="button"
          className="cyber-slot-empty-btn"
          onClick={onSelect}
          aria-label={`Chọn linh kiện ${title}`}
        >
          <div className="cyber-slot-empty-info">
            {icon ? (
              <span className="cyber-slot-empty-icon" aria-hidden="true">
                {icon}
              </span>
            ) : null}
            <span className="cyber-slot-empty-title">{title}</span>
          </div>
          <div className="cyber-slot-empty-action">
            <span className="cyber-slot-plus-icon">+</span>
            <span>Chọn linh kiện</span>
          </div>
        </button>
      )}

      {/* 5. Conflict Alert Banner (If Any) */}
      {conflict && (
        <div
          className={`cyber-slot-conflict-banner ${
            conflict.type === 'ERROR' ? 'is-error' : 'is-warning'
          }`}
          role="alert"
        >
          <span>{conflict.type === 'ERROR' ? '⛔ LỖI TƯƠNG THÍCH:' : '⚠️ LƯU Ý:'}</span>
          <span>{conflict.message}</span>
        </div>
      )}
    </div>
  );
};

export default HardwareSlotCard;
