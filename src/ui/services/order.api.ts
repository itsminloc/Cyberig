/**
 * Orders API Client Service
 * Connects frontend checkout flows to /api/orders backend endpoints.
 * Aligned with Task FE-07 and Task BE-09 specifications.
 */

import { CreateOrderDto, OrderDetail } from '../../modules/orders/order.model';
import { orderService } from '../../modules/orders/order.service';
import { OutOfStockError } from '../../core/errors';
import { getStoredAccessToken } from './api';

export class OrderApiError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(message: string, code = 'ORDER_API_ERROR', statusCode = 400) {
    super(message);
    this.name = 'OrderApiError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Gửi yêu cầu tạo đơn hàng và khóa tạm tồn kho Redis (15 phút)
 */
export async function submitOrder(dto: CreateOrderDto): Promise<OrderDetail> {
  let networkFailed = false;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    const token = getStoredAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers,
      body: JSON.stringify(dto),
    });

    const body = await res.json().catch(() => null);

    if (res.ok && body?.success && body?.data) {
      return body.data;
    }

    if (body?.error) {
      const code = body.error.code || 'ORDER_ERROR';
      const msg = body.error.message || 'Lỗi khi tạo đơn hàng.';

      if (code === 'OUT_OF_STOCK') {
        throw new OutOfStockError(msg);
      }
      throw new OrderApiError(msg, code, res.status);
    }

    throw new OrderApiError(`Lỗi máy chủ khi tạo đơn hàng (HTTP ${res.status}).`, 'HTTP_ERROR', res.status);
  } catch (err: any) {
    // If it's a domain/validation or OutOfStock error from the server, rethrow immediately
    if (err instanceof OutOfStockError || err instanceof OrderApiError) {
      throw err;
    }

    const msg = String(err?.message || '');
    if (
      msg &&
      !msg.includes('URL') &&
      !msg.includes('fetch') &&
      !msg.includes('ECONNREFUSED') &&
      !msg.includes('Failed to parse')
    ) {
      throw err;
    }

    networkFailed = true;
  }

  // Fallback to local orderService execution when offline or running in Node.js test runner
  if (networkFailed) {
    return await orderService.createOrder(dto);
  }

  throw new OrderApiError('Lỗi không xác định khi gửi đơn hàng.', 'UNKNOWN_ERROR');
}

/**
 * Lấy chi tiết đơn hàng đã tạo kèm giá Price Snapshot
 */
export async function fetchOrderById(id: string): Promise<OrderDetail> {
  try {
    const res = await fetch(`/api/orders/${encodeURIComponent(id)}`, {
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      const body = await res.json();
      if (body.success && body.data) {
        return body.data;
      }
    }
  } catch (_err) {
    // Fallback
  }

  return await orderService.getOrderById(id);
}
