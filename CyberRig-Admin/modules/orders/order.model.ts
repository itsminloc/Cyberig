/**
 * Orders Domain Model & Types
 * Defines order entities, line item inputs, price snapshot structures, and database rows.
 * Aligned with Task BE-09 specification.
 */

export type OrderStatus = 'PENDING_PAYMENT' | 'PAID' | 'CONFIRMED' | 'CANCELLED';

export interface OrderItemInput {
  hardwareId: string;
  quantity: number;
}

export interface CreateOrderDto {
  customerId?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  items: OrderItemInput[];
}

export interface OrderItemDetail {
  hardwareId: string;
  name: string;
  quantity: number;
  priceAtPurchase: number; // Price Snapshot: fixed at order time
}

export interface OrderDetail {
  id: string;
  customerId?: string | null;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: string;
  totalAmount: number;
  status: OrderStatus;
  items: OrderItemDetail[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface OrderRow {
  id: string;
  customer_id?: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  total_amount: number;
  status: OrderStatus;
  created_at: Date;
  updated_at?: Date;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  hardware_id: string;
  quantity: number;
  price_at_purchase: number;
  created_at: Date;
  name?: string;
}
