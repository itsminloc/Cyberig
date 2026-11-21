/**
 * HardwareSelectModal Component
 * Interactive component selection dialog with multi-criteria filters,
 * live API integration, CyberSkeleton loading states, and mobile bottom sheet drawer.
 * Aligned with Task FE-05 (PB-08) specification.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { HardwareCardSkeleton } from '../feedback/CyberSkeleton';
import { fetchHardwareCatalog } from '../../services/hardware.api';
import { BUILDER_SLOTS } from '../../pages/pc-builder.data';
import './HardwareSelectModal.css';

export interface HardwareSelectModalProps {
  isOpen: boolean;
  category: HardwareCategory | null;
  onSelect: (item: HardwareItem) => void;
  onClose: () => void;
}

interface PriceRangePreset {
  id: string;
  label: string;
  minPrice?: number;
  maxPrice?: number;
}

const PRICE_PRESETS: PriceRangePreset[] = [
  { id: 'all', label: 'Tất cả giá' },
  { id: 'under-5m', label: '< 5 Triệu', maxPrice: 5000000 },
  { id: '5m-10m', label: '5M - 10 Triệu', minPrice: 5000000, maxPrice: 10000000 },
  { id: '10m-20m', label: '10M - 20 Triệu', minPrice: 10000000, maxPrice: 20000000 },
  { id: 'above-20m', label: '> 20 Triệu', minPrice: 20000000 },
];

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

export const HardwareSelectModal: React.FC<HardwareSelectModalProps> = ({
  isOpen,
  category,
  onSelect,
  onClose,
}) => {
  // 1. Filter States
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [selectedPriceId, setSelectedPriceId] = useState<string>('all');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // 2. Data & Loading States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [items, setItems] = useState<HardwareItem[]>([]);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Debounce Search Input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setCurrentPage(1); // Reset page on query change
    }, 300);

    return () => clearTimeout(handler);
  }, [searchInput]);

  // Reset filters when category changes or modal re-opens
  useEffect(() => {
    if (isOpen) {
      setSearchInput('');
      setDebouncedSearch('');
      setSelectedBrand('ALL');
      setSelectedPriceId('all');
      setInStockOnly(false);
      setCurrentPage(1);
    }
  }, [isOpen, category]);

  // Escape Key to Close Modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Determine current active price range object
  const activePricePreset = useMemo(() => {
    return PRICE_PRESETS.find((p) => p.id === selectedPriceId) || PRICE_PRESETS[0];
  }, [selectedPriceId]);

  // 3. Dynamic Brands for current category
  const availableBrands = useMemo(() => {
    if (!category) return [];
    switch (category) {
      case HardwareCategory.CPU:
        return ['Intel', 'AMD'];
      case HardwareCategory.MOTHERBOARD:
        return ['ASUS', 'MSI', 'GIGABYTE', 'ASRock'];
      case HardwareCategory.RAM:
        return ['Corsair', 'Kingston', 'G.Skill', 'TeamGroup'];
      case HardwareCategory.GPU:
        return ['ASUS', 'MSI', 'GIGABYTE', 'ZOTAC', 'Colorful'];
      case HardwareCategory.PSU:
        return ['Corsair', 'Cooler Master', 'MSI', 'Seasonic'];
      case HardwareCategory.CASE:
        return ['NZXT', 'Lian Li', 'Jonsbo', 'Corsair', 'Montech'];
      case HardwareCategory.COOLER:
        return ['DeepCool', 'NZXT', 'Thermalright', 'Corsair'];
      case HardwareCategory.STORAGE:
        return ['Samsung', 'Kingston', 'Western Digital', 'Crucial'];
      default:
        return ['ASUS', 'MSI', 'Corsair', 'Intel', 'AMD'];
    }
  }, [category]);

  // 4. Query Data from API (Task BE-07 Integration)
  useEffect(() => {
    if (!isOpen || !category) return;

    let isSubscribed = true;
    setIsLoading(true);

    const filter = {
      category,
      brand: selectedBrand === 'ALL' ? undefined : selectedBrand,
      minPrice: activePricePreset.minPrice,
      maxPrice: activePricePreset.maxPrice,
      search: debouncedSearch || undefined,
      inStockOnly,
      page: currentPage,
      limit: 10,
    };

    fetchHardwareCatalog(filter)
      .then((result) => {
        if (isSubscribed) {
          setItems(result.items);
          setTotalPages(result.pagination.totalPages);
          setTotalCount(result.pagination.total);
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
  }, [
    isOpen,
    category,
    selectedBrand,
    activePricePreset,
    debouncedSearch,
    inStockOnly,
    currentPage,
  ]);

  if (!isOpen || !category) return null;

  // Metadata for current slot
  const slotMeta = BUILDER_SLOTS.find((s) => s.category === category);

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
        if (s.formFactor) pills.push(<span key="ff" className="cyber-spec-pill">{s.formFactor}</span>);
        break;
      }
      case HardwareCategory.RAM: {
        const s = specs as RamSpecs;
        if (s.generation) pills.push(<span key="gen" className="cyber-spec-pill pill-accent">{s.generation}</span>);
        if (s.capacityGb) pills.push(<span key="cap" className="cyber-spec-pill">{s.capacityGb}GB</span>);
        if (s.speedMhz) pills.push(<span key="speed" className="cyber-spec-pill">{s.speedMhz}MHz</span>);
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
        break;
      }
      case HardwareCategory.CASE: {
        const s = specs as CaseSpecs;
        if (s.maxGpuLengthMm) pills.push(<span key="gpu" className="cyber-spec-pill pill-accent">GPU max {s.maxGpuLengthMm}mm</span>);
        if (s.maxCpuCoolerHeightMm) pills.push(<span key="cooler" className="cyber-spec-pill">Tản max {s.maxCpuCoolerHeightMm}mm</span>);
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

  const handleResetFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setSelectedBrand('ALL');
    setSelectedPriceId('all');
    setInStockOnly(false);
    setCurrentPage(1);
  };

  return (
    <div
      className="cyber-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cyber-select-modal-title"
    >
      <div
        className="cyber-select-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Handle */}
        <div className="cyber-modal-drag-handle" aria-hidden="true" />

        {/* 1. Modal Header */}
        <header className="cyber-select-modal-header">
          <div className="cyber-modal-title-box">
            <span className="cyber-modal-cat-icon">
              {slotMeta?.icon || '⚡'}
            </span>
            <div className="cyber-modal-title-text">
              <span className="cyber-modal-subheading">CYBERRIG COMPONENT SELECTOR</span>
              <h2 id="cyber-select-modal-title" className="cyber-modal-heading">
                {slotMeta?.title || `Chọn ${category}`}
                <span className="cyber-modal-badge-count">{totalCount} Linh kiện</span>
              </h2>
            </div>
          </div>

          <button
            type="button"
            className="cyber-modal-close-btn"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
          >
            ✕
          </button>
        </header>

        {/* 2. Filter Toolbar */}
        <div className="cyber-modal-toolbar">
          {/* Row 1: Search & In-stock Checkbox */}
          <div className="cyber-modal-search-row">
            <div className="cyber-modal-input-wrap">
              <span className="cyber-modal-search-icon" aria-hidden="true">🔍</span>
              <input
                type="text"
                className="cyber-modal-search-input"
                placeholder="Tìm theo tên sản phẩm, hãng, model..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                autoFocus
              />
              {searchInput && (
                <button
                  type="button"
                  className="cyber-modal-search-clear"
                  onClick={() => setSearchInput('')}
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  ✕
                </button>
              )}
            </div>

            <label className={`cyber-modal-stock-toggle ${inStockOnly ? 'is-active' : ''}`}>
              <input
                type="checkbox"
                className="cyber-modal-stock-checkbox"
                checked={inStockOnly}
                onChange={(e) => {
                  setInStockOnly(e.target.checked);
                  setCurrentPage(1);
                }}
              />
              <span>Chỉ hiện linh kiện còn hàng</span>
            </label>
          </div>

          {/* Row 2: Brand Pills */}
          <div className="cyber-filter-pills-row" role="group" aria-label="Lọc theo thương hiệu">
            <span className="cyber-filter-label">Hãng:</span>
            <button
              type="button"
              className={`cyber-filter-pill-btn ${selectedBrand === 'ALL' ? 'is-selected' : ''}`}
              onClick={() => {
                setSelectedBrand('ALL');
                setCurrentPage(1);
              }}
            >
              Tất cả
            </button>
            {availableBrands.map((brand) => (
              <button
                key={brand}
                type="button"
                className={`cyber-filter-pill-btn ${selectedBrand.toLowerCase() === brand.toLowerCase() ? 'is-selected' : ''}`}
                onClick={() => {
                  setSelectedBrand(brand);
                  setCurrentPage(1);
                }}
              >
                {brand}
              </button>
            ))}
          </div>

          {/* Row 3: Price Range Pills */}
          <div className="cyber-filter-pills-row" role="group" aria-label="Lọc theo khoảng giá">
            <span className="cyber-filter-label">Giá:</span>
            {PRICE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`cyber-filter-pill-btn ${selectedPriceId === preset.id ? 'is-selected' : ''}`}
                onClick={() => {
                  setSelectedPriceId(preset.id);
                  setCurrentPage(1);
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Hardware Items List Body */}
        <div className="cyber-modal-body" role="region" aria-label="Danh sách kết quả">
          {isLoading ? (
            <HardwareCardSkeleton count={4} />
          ) : items.length === 0 ? (
            <div className="cyber-modal-empty-state">
              <span className="cyber-modal-empty-icon" aria-hidden="true">🔍</span>
              <h3 className="cyber-modal-empty-title">Không tìm thấy linh kiện nào</h3>
              <p className="cyber-modal-empty-desc">
                Không có linh kiện {slotMeta?.title} nào thỏa mãn bộ lọc hiện tại. Thử đổi từ khóa hoặc khoảng giá.
              </p>
              <button
                type="button"
                className="cyber-modal-reset-btn"
                onClick={handleResetFilters}
              >
                Làm mới bộ lọc
              </button>
            </div>
          ) : (
            items.map((item) => {
              const isOutOfStock = item.stockQuantity <= 0;
              return (
                <div
                  key={item.id}
                  className={`cyber-modal-item-card ${isOutOfStock ? 'is-out-of-stock' : ''}`}
                >
                  {/* Left Column: Product Information & Spec Badges */}
                  <div className="cyber-modal-item-info-col">
                    <div className="cyber-modal-item-top">
                      <span className="cyber-modal-item-brand">{item.brand}</span>
                      <span className="cyber-modal-item-model">Model: {item.model}</span>
                    </div>

                    <h4 className="cyber-modal-item-name">{item.name}</h4>

                    <div className="cyber-modal-item-specs-row">
                      {renderSpecPills(item)}
                    </div>
                  </div>

                  {/* Right Column: Price, Stock & Select CTA Button */}
                  <div className="cyber-modal-item-action-col">
                    <span className="cyber-modal-item-price">
                      {formatCurrency(item.price)}
                    </span>

                    <span
                      className={`cyber-modal-stock-badge ${
                        isOutOfStock ? 'stock-out' : 'stock-in'
                      }`}
                    >
                      {isOutOfStock ? '✕ Tạm hết hàng' : `● Còn hàng (${item.stockQuantity})`}
                    </span>

                    <button
                      type="button"
                      className="cyber-modal-cta-select-btn"
                      disabled={isOutOfStock}
                      onClick={() => onSelect(item)}
                      aria-label={`Chọn ${item.name}`}
                    >
                      <span>⚡ CHỌN</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 4. Modal Footer / Pagination */}
        <footer className="cyber-select-modal-footer">
          <span className="cyber-modal-pagination-info">
            Trang {currentPage} / {totalPages} (Tổng cộng {totalCount} linh kiện)
          </span>

          <div className="cyber-modal-pagination-controls">
            <button
              type="button"
              className="cyber-modal-page-btn"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              aria-label="Trang trước"
            >
              ◀ Trước
            </button>
            <span className="cyber-modal-current-page">{currentPage}</span>
            <button
              type="button"
              className="cyber-modal-page-btn"
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              aria-label="Trang kế tiếp"
            >
              Sau ▶
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default HardwareSelectModal;
