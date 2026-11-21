import React, { useState, useMemo } from 'react';
import {
  HardwareCategory,
  HardwareItem,
  PsuSpecs,
} from '../../modules/hardware/hardware.model';
import { compatibilityService } from '../../modules/compatibility/compatibility.service';
import { MainLayout } from '../layouts/MainLayout';
import { HardwareSlotCard, LiveCompatibilityBar, HardwareSelectModal } from '../components/builder';
import {
  BUILDER_SLOTS,
  MOCK_HARDWARE_CATALOG,
  BUILD_PRESETS,
} from './pc-builder.data';
import './PCBuilderPage.css';

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

export const PCBuilderPage: React.FC = () => {
  // 1. Initial State: Load standard gaming build as initial configuration
  const defaultPreset = BUILD_PRESETS[0];
  const initialItems = useMemo(() => {
    return MOCK_HARDWARE_CATALOG.filter((item) =>
      defaultPreset.itemIds.includes(item.id)
    );
  }, []);

  const [selectedItems, setSelectedItems] = useState<HardwareItem[]>(initialItems);
  const [pickerCategory, setPickerCategory] = useState<HardwareCategory | null>(null);
  const [isLoading, setIsLoading] = useState(false);


  // 2. Real-time Compatibility Evaluation via CompatibilityService
  const compatibilityResult = useMemo(() => {
    return compatibilityService.validateBuild(selectedItems);
  }, [selectedItems]);

  // 3. Financial & Power Aggregations
  const totalPrice = useMemo(() => {
    return selectedItems.reduce((acc, item) => acc + item.price, 0);
  }, [selectedItems]);

  const psuItem = useMemo(() => {
    return selectedItems.find((item) => item.categoryId === HardwareCategory.PSU);
  }, [selectedItems]);

  const psuWattage = (psuItem?.specs as PsuSpecs)?.wattage || null;

  // 4. Map Compatibility Issues to Specific Slot Cards
  const getSlotConflict = (category: HardwareCategory) => {
    for (const issue of compatibilityResult.issues) {
      if (issue.rule === 'SOCKET' && (category === HardwareCategory.CPU || category === HardwareCategory.MOTHERBOARD)) {
        return { type: issue.type, message: issue.message };
      }
      if (issue.rule === 'RAM' && (category === HardwareCategory.RAM || category === HardwareCategory.MOTHERBOARD)) {
        return { type: issue.type, message: issue.message };
      }
      if (issue.rule === 'POWER' && (category === HardwareCategory.PSU || category === HardwareCategory.GPU)) {
        return { type: issue.type, message: issue.message };
      }
      if (issue.rule === 'CLEARANCE' && (category === HardwareCategory.CASE || category === HardwareCategory.GPU || category === HardwareCategory.COOLER)) {
        return { type: issue.type, message: issue.message };
      }
    }
    return null;
  };

  // 5. User Interaction Handlers
  const handleOpenPicker = (category: HardwareCategory) => {
    setPickerCategory(category);
  };

  const handleClosePicker = () => {
    setPickerCategory(null);
  };

  const handleSelectItem = (item: HardwareItem) => {
    setSelectedItems((prev) => {
      // Remove any existing item of the same category
      const filtered = prev.filter((i) => i.categoryId !== item.categoryId);
      return [...filtered, item];
    });
    handleClosePicker();
  };

  const handleRemoveItem = (category: HardwareCategory) => {
    setSelectedItems((prev) => prev.filter((i) => i.categoryId !== category));
  };


  const handleLoadPreset = (presetItemIds: string[]) => {
    setIsLoading(true);
    setTimeout(() => {
      const presetItems = MOCK_HARDWARE_CATALOG.filter((item) =>
        presetItemIds.includes(item.id)
      );
      setSelectedItems(presetItems);
      setIsLoading(false);
    }, 350); // Shimmer feedback wave
  };

  const handleResetBuild = () => {
    setSelectedItems([]);
  };

  // Check minimum core required components: CPU, Motherboard, RAM, PSU
  const hasRequiredComponents = useMemo(() => {
    const categories = new Set(selectedItems.map((item) => item.categoryId));
    return (
      categories.has(HardwareCategory.CPU) &&
      categories.has(HardwareCategory.MOTHERBOARD) &&
      categories.has(HardwareCategory.RAM) &&
      categories.has(HardwareCategory.PSU)
    );
  }, [selectedItems]);

  const canProceedToCheckout =
    hasRequiredComponents &&
    compatibilityResult.status !== 'INCOMPATIBLE';

  const handleProceedToCheckout = () => {
    if (!canProceedToCheckout) return;
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('cyberrig_checkout_build', JSON.stringify(selectedItems));
      } catch {}
      window.location.href = '/checkout';
    }
  };

  const handleAddToCart = () => {
    alert(
      `Đã thêm ${selectedItems.length} linh kiện (Tổng: ${formatCurrency(
        totalPrice
      )}) vào giỏ hàng thành công!`
    );
  };

  return (
    <MainLayout>
      <div className="cyber-builder-container">
        {/* Top Header & Quick Presets */}
        <section className="cyber-builder-hero">
          <div className="cyber-builder-hero-top">
            <div className="cyber-builder-badge-title">
              <span className="cyber-builder-tag">⚡ HARDWARE MATRIX CONFIGURATOR</span>
              <h1 className="cyber-builder-title">Xây Dựng Cấu Hình PC Tùy Biến</h1>
              <p className="cyber-builder-subtitle">
                Hệ thống thẩm định tương thích thời gian thực. Tự động kiểm tra chuẩn Socket,
                chuẩn RAM, công suất nguồn đệm (TDP) và kích thước vật lý thùng máy.
              </p>
            </div>
          </div>

          {/* Quick Presets Bar */}
          <div className="cyber-builder-preset-bar">
            <span className="cyber-preset-label">Cấu hình mẫu:</span>
            {BUILD_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="cyber-preset-btn"
                onClick={() => handleLoadPreset(preset.itemIds)}
                title={preset.desc}
              >
                <span>⚡ {preset.name}</span>
              </button>
            ))}
            <button
              type="button"
              className="cyber-preset-btn btn-reset"
              onClick={handleResetBuild}
              title="Xóa toàn bộ cấu hình hiện tại"
            >
              <span>🗑️ Làm mới cấu hình</span>
            </button>
          </div>
        </section>

        {/* 2-Column Responsive Matrix */}
        <div className="cyber-builder-layout">
          {/* Left Column: 8 Hardware Slot Cards */}
          <section className="cyber-slots-matrix" aria-label="Danh sách linh kiện">
            {BUILDER_SLOTS.map((slot) => {
              const selectedItem = selectedItems.find(
                (item) => item.categoryId === slot.category
              );
              const conflict = getSlotConflict(slot.category);

              return (
                <HardwareSlotCard
                  key={slot.category}
                  category={slot.category}
                  title={slot.title}
                  icon={slot.icon}
                  selectedItem={selectedItem}
                  isLoading={isLoading}
                  onSelect={() => handleOpenPicker(slot.category)}
                  onRemove={
                    selectedItem ? () => handleRemoveItem(slot.category) : undefined
                  }
                  conflict={conflict}
                />
              );
            })}
          </section>

          {/* Right Column: Build Summary Card */}
          <aside className="cyber-builder-summary-col" aria-label="Tóm tắt cấu hình">
            <div className="cyber-summary-card">
              <div className="cyber-summary-header">
                <h3 className="cyber-summary-title">Thông Số Kỹ Thuật</h3>
                <span className="cyber-summary-count">
                  {selectedItems.length} / 8 Vị trí
                </span>
              </div>

              {/* Status Box */}
              <div
                className={`cyber-summary-status-box ${
                  compatibilityResult.status === 'COMPATIBLE'
                    ? 'box-compatible'
                    : compatibilityResult.status === 'WARNING'
                    ? 'box-warning'
                    : 'box-incompatible'
                }`}
              >
                <div className="cyber-status-heading">
                  <span>
                    {compatibilityResult.status === 'COMPATIBLE'
                      ? '✓ TƯƠNG THÍCH HOÀN HẢO'
                      : compatibilityResult.status === 'WARNING'
                      ? '⚠️ CÓ CẢNH BÁO NGHẼN'
                      : '⛔ XUNG ĐỘT PHẦN CỨNG'}
                  </span>
                </div>
                <div className="cyber-status-desc">
                  {compatibilityResult.status === 'COMPATIBLE' &&
                    'Tất cả linh kiện được chọn đồng bộ 100% về socket, bus RAM, điện áp và kích cỡ.'}
                  {compatibilityResult.status === 'WARNING' &&
                    'Cấu hình có thể hoạt động nhưng chưa tối ưu hiệu năng hoặc nguồn đệm sát giới hạn.'}
                  {compatibilityResult.status === 'INCOMPATIBLE' &&
                    'Phát hiện xung đột vật lý hoặc thiếu hụt năng lượng. Xem chi tiết thanh trạng thái.'}
                </div>
              </div>

              {/* Telemetry Metrics */}
              <div className="cyber-summary-telemetry">
                <div className="cyber-telemetry-row">
                  <span className="cyber-telemetry-label">⚡ Công suất ước tính:</span>
                  <span className="cyber-telemetry-value text-cyan">
                    {compatibilityResult.totalEstimatedWattage}W
                  </span>
                </div>
                <div className="cyber-telemetry-row">
                  <span className="cyber-telemetry-label">🔌 Nguồn khuyến nghị:</span>
                  <span className="cyber-telemetry-value">
                    {compatibilityResult.recommendedPsuWattage}W
                  </span>
                </div>
                <div className="cyber-telemetry-row">
                  <span className="cyber-telemetry-label">🔋 Nguồn hiện tại:</span>
                  <span
                    className={`cyber-telemetry-value ${
                      !psuWattage
                        ? ''
                        : psuWattage >= compatibilityResult.recommendedPsuWattage
                        ? 'text-green'
                        : 'text-red'
                    }`}
                  >
                    {psuWattage ? `${psuWattage}W` : 'Chưa chọn'}
                  </span>
                </div>
              </div>

              <div className="cyber-summary-divider" />

              {/* Total Price Display */}
              <div className="cyber-summary-price-box">
                <span className="cyber-summary-price-label">Tổng Chi Phí Dự Tính</span>
                <span className="cyber-summary-price-val">
                  {formatCurrency(totalPrice)}
                </span>
              </div>
            </div>
          </aside>
        </div>

        {/* Pinned Bottom HUD: Live Compatibility Bar */}
        <LiveCompatibilityBar
          result={compatibilityResult}
          totalPrice={totalPrice}
          selectedCount={selectedItems.length}
          psuWattage={psuWattage}
          onAddToCart={handleAddToCart}
          onProceedToCheckout={handleProceedToCheckout}
          canProceedToCheckout={canProceedToCheckout}
        />

        {/* Component Selection Modal (Task FE-05 / PB-08) */}
        <HardwareSelectModal
          isOpen={pickerCategory !== null}
          category={pickerCategory}
          onSelect={handleSelectItem}
          onClose={handleClosePicker}
        />
      </div>
    </MainLayout>

  );
};

export default PCBuilderPage;
