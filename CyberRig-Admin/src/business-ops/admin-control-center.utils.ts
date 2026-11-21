/**
 * Admin Control Center Utilities & Domain Calculators (Task FE-10 / Sprint 5)
 * Pure functions for KPI telemetry, stock classification, and input validations.
 * Free of CSS/DOM dependencies for fast, isolated Node.js unit testing.
 */

import { HardwareCategory, HardwareItem } from '../../../CyberRig-Backend/src/modules/hardware/hardware.model';
import { NewHardwareDto, RestockHardwareDto } from './admin.service';

export const HARDWARE_CATEGORIES = [
  { key: 'ALL', label: 'Tất Cả Danh Mục' },
  { key: HardwareCategory.CPU, label: 'Vi Xử Lý (CPU)' },
  { key: HardwareCategory.MOTHERBOARD, label: 'Bo Mạch Chủ (Mainboard)' },
  { key: HardwareCategory.RAM, label: 'Bộ Nhớ Trong (RAM)' },
  { key: HardwareCategory.GPU, label: 'Card Đồ Họa (GPU / VGA)' },
  { key: HardwareCategory.PSU, label: 'Nguồn Máy Tính (PSU)' },
  { key: HardwareCategory.CASE, label: 'Vỏ Case Gaming' },
  { key: HardwareCategory.COOLER, label: 'Tản Nhiệt (Cooler/AIO)' },
  { key: HardwareCategory.STORAGE, label: 'Ổ Cứng (SSD / HDD)' },
] as const;

export const formatVND = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount || 0);
};

export interface StockStatusMeta {
  label: string;
  className: string;
  isLow: boolean;
  isOut: boolean;
}

/**
 * Phân loại trạng thái tồn kho linh kiện:
 * - stock_quantity == 0: "HẾT HÀNG" (Màu xám/đỏ)
 * - stock_quantity <= 2: "SẮP HẾT" (Màu cam/đỏ nhấp nháy cảnh báo)
 * - stock_quantity > 2: "CÒN HÀNG" (Xanh Neon)
 */
export function getStockStatusMeta(quantity: number): StockStatusMeta {
  const stock = Number(quantity) || 0;
  if (stock <= 0) {
    return {
      label: 'HẾT HÀNG',
      className: 'is-out',
      isLow: false,
      isOut: true,
    };
  }
  if (stock <= 2) {
    return {
      label: 'SẮP HẾT',
      className: 'is-low',
      isLow: true,
      isOut: false,
    };
  }
  return {
    label: 'CÒN HÀNG',
    className: 'is-in-stock',
    isLow: false,
    isOut: false,
  };
}

export interface InventoryKpis {
  totalItems: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalInventoryValue: number;
}

/**
 * Tính toán các chỉ số thống kê kho hàng (KPI):
 * 1. Tổng số linh kiện trong danh mục
 * 2. Cảnh báo tồn kho thấp (stock_quantity <= 2)
 * 3. Tổng giá trị tồn kho ước tính = sum(price * stockQuantity)
 */
export function calculateKpis(items: HardwareItem[]): InventoryKpis {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      totalItems: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      totalInventoryValue: 0,
    };
  }

  let lowStockCount = 0;
  let outOfStockCount = 0;
  let totalInventoryValue = 0;

  for (const it of items) {
    const qty = Number(it.stockQuantity) || 0;
    const price = Number(it.price) || 0;

    if (qty <= 0) {
      outOfStockCount++;
      lowStockCount++; // Hết hàng cũng thuộc diện cảnh báo cần nhập
    } else if (qty <= 2) {
      lowStockCount++;
    }

    if (qty > 0 && price > 0) {
      totalInventoryValue += price * qty;
    }
  }

  return {
    totalItems: items.length,
    lowStockCount,
    outOfStockCount,
    totalInventoryValue,
  };
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validation cơ bản cho form thêm mới linh kiện
 */
export function validateNewHardware(dto: Partial<NewHardwareDto>): ValidationResult {
  if (!dto.categoryId || !String(dto.categoryId).trim() || dto.categoryId === 'ALL') {
    return { isValid: false, error: 'Vui lòng chọn danh mục linh kiện.' };
  }

  if (!dto.name || !dto.name.trim()) {
    return { isValid: false, error: 'Tên linh kiện không được để trống.' };
  }

  if (!dto.brand || !dto.brand.trim()) {
    return { isValid: false, error: 'Thương hiệu/Hãng sản xuất không được để trống.' };
  }

  const price = Number(dto.price);
  if (dto.price === undefined || isNaN(price) || price <= 0) {
    return { isValid: false, error: 'Giá bán niêm yết phải lớn hơn 0 VNĐ.' };
  }

  const stock = Number(dto.stockQuantity);
  if (dto.stockQuantity === undefined || isNaN(stock) || stock < 0) {
    return { isValid: false, error: 'Số lượng tồn ban đầu phải là số không âm (>= 0).' };
  }

  if (dto.specs !== undefined && typeof dto.specs !== 'object') {
    return { isValid: false, error: 'Thông số kỹ thuật specs phải là đối tượng JSON hợp lệ.' };
  }

  return { isValid: true };
}

/**
 * Validation cho form nhập thêm kho và điều chỉnh giá
 */
export function validateRestock(addStock: number, newPrice?: number): ValidationResult {
  const stock = Number(addStock);
  if (isNaN(stock) || stock < 0) {
    return { isValid: false, error: 'Số lượng nhập thêm (addStock) phải là số không âm (>= 0).' };
  }

  if (newPrice !== undefined && newPrice !== null) {
    const price = Number(newPrice);
    if (isNaN(price) || price <= 0) {
      return { isValid: false, error: 'Giá bán mới (newPrice) nếu thay đổi phải lớn hơn 0 VNĐ.' };
    }
  }

  return { isValid: true };
}
