/**
 * Customer Dashboard Utilities & Mappers (Task FE-09 / Sprint 5)
 * Pure domain mappers, milestone calculations, and formatting utilities.
 */

import { HardwareCategory, HardwareItem } from '../../../modules/hardware/hardware.model';
import { TicketStatus } from '../../../modules/repair-tickets/ticket.state';

export type DashboardTab = 'orders' | 'repairs';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

export const formatDate = (date: Date | string): string => {
  return new Date(date).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Maps raw OrderItemDetail into HardwareItem structure expected by BuildSpecSheetCard
 */
export function mapOrderItemToHardware(item: { hardwareId: string; name: string; quantity: number; priceAtPurchase: number }): HardwareItem {
  let categoryId = HardwareCategory.STORAGE;
  const upper = item.name.toUpperCase();
  if (upper.includes('INTEL') || upper.includes('AMD') || upper.includes('RYZEN') || upper.includes('CORE') || upper.includes('CPU')) {
    categoryId = HardwareCategory.CPU;
  } else if (upper.includes('B760') || upper.includes('Z790') || upper.includes('B650') || upper.includes('MAIN') || upper.includes('ASUS TUF') || upper.includes('MSI MAG')) {
    categoryId = HardwareCategory.MOTHERBOARD;
  } else if (upper.includes('DDR4') || upper.includes('DDR5') || upper.includes('RAM') || upper.includes('VENGEANCE') || upper.includes('FURY')) {
    categoryId = HardwareCategory.RAM;
  } else if (upper.includes('RTX') || upper.includes('GTX') || upper.includes('RADEON') || upper.includes('GEFORCE') || upper.includes('VGA') || upper.includes('GPU')) {
    categoryId = HardwareCategory.GPU;
  } else if (upper.includes('750W') || upper.includes('850W') || upper.includes('650W') || upper.includes('PSU') || upper.includes('NGUỒN') || upper.includes('GOLD')) {
    categoryId = HardwareCategory.PSU;
  } else if (upper.includes('CASE') || upper.includes('VỎ') || upper.includes('H6 FLOW') || upper.includes('NZXT')) {
    categoryId = HardwareCategory.CASE;
  } else if (upper.includes('COOLER') || upper.includes('TẢN') || upper.includes('AIO')) {
    categoryId = HardwareCategory.COOLER;
  }

  return {
    id: item.hardwareId,
    categoryId,
    name: item.name,
    brand: item.name.split(' ')[0] || 'CyberRig',
    model: item.hardwareId,
    price: item.priceAtPurchase,
    stockQuantity: item.quantity,
    specs: {},
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * 5-Milestone Stepper definition for repair tickets
 */
export const REPAIR_MILESTONES = [
  { key: 'RECEIVED', label: '1. Tiếp Nhận', step: 1 },
  { key: 'DIAGNOSING', label: '2. Chẩn Đoán', step: 2 },
  { key: 'QUOTED', label: '3. Báo Giá', step: 3 },
  { key: 'REPAIRING', label: '4. Đang Sửa', step: 4 },
  { key: 'COMPLETED', label: '5. Sẵn Sàng', step: 5 },
] as const;

export function getMilestoneStep(status: string): number {
  switch (status) {
    case TicketStatus.RECEIVED:
      return 1;
    case TicketStatus.DIAGNOSING:
      return 2;
    case TicketStatus.QUOTED:
      return 3;
    case TicketStatus.REPAIRING:
      return 4;
    case TicketStatus.COMPLETED:
      return 5;
    case TicketStatus.CANCELLED:
      return 0;
    default:
      return 1;
  }
}

export function getOrderStatusMeta(status: string): { label: string; className: string } {
  switch (status) {
    case 'PENDING_PAYMENT':
      return { label: 'CHỜ THANH TOÁN', className: 'is-pending' };
    case 'PAID':
    case 'CONFIRMED':
      return { label: 'ĐÃ XÁC NHẬN', className: 'is-confirmed' };
    case 'SHIPPED':
      return { label: 'ĐANG GIAO HÀNG', className: 'is-shipped' };
    case 'COMPLETED':
      return { label: 'HOÀN TẤT', className: 'is-completed' };
    case 'CANCELLED':
      return { label: 'ĐÃ HỦY', className: 'is-cancelled' };
    default:
      return { label: status, className: 'is-confirmed' };
  }
}
