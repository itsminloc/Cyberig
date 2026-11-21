/**
 * Customer Portal Data Service (Task FE-09 / Sprint 5)
 * Communicates with backend customer endpoints with automatic Bearer token injection.
 * Aligned with Task BE-PORTALS specification.
 */

import { request } from './api';
import { OrderDetail } from '../../modules/orders/order.model';
import { RepairTicket } from '../../modules/repair-tickets/ticket.model';

export type { OrderDetail, RepairTicket };

/**
 * Lấy lịch sử đơn hàng của khách hàng đang đăng nhập kèm chi tiết linh kiện
 */
export async function fetchMyOrders(): Promise<OrderDetail[]> {
  return request<OrderDetail[]>('/api/customer/orders', {
    method: 'GET',
  });
}

/**
 * Lấy danh sách phiếu sửa chữa/bảo hành của khách hàng đang đăng nhập
 */
export async function fetchMyTickets(): Promise<RepairTicket[]> {
  return request<RepairTicket[]>('/api/customer/tickets', {
    method: 'GET',
  });
}

export const customerService = {
  fetchMyOrders,
  fetchMyTickets,
};

export default customerService;
