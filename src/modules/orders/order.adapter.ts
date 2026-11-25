/**
 * Canonical Order Adapter (SE445 Case Study 01: System Integration Pattern)
 * Normalizes heterogeneous order payloads (B2B partner feeds, mobile, AI POS, web storefront)
 * into CyberRig's canonical CreateOrderDto while preserving strict sanitization.
 */

import { sanitizeTextInput } from '../../core/security';
import { CreateOrderDto, OrderItemInput } from './order.model';

export type OrderSourceChannel = 'WEB_STOREFRONT' | 'PARTNER_B2B_API' | 'AI_POS_INGEST' | 'MOBILE_APP';

export interface CanonicalOrderAdapterResult {
  dto: CreateOrderDto;
  sourceChannel: OrderSourceChannel;
  simulateFulfillmentFailure: boolean;
  normalizedFromFormat: 'STANDARD_CANONICAL' | 'HETEROGENEOUS_PARTNER';
}

const SKU_ALIAS_MAP: Record<string, string> = {
  'RTX-4090': 'gpu-rtx4090-strix',
  RTX4090: 'gpu-rtx4090-strix',
  'GPU-RTX4090': 'gpu-rtx4090-strix',
  'RTX-4080': 'gpu-rtx4080-strix',
  RTX4080: 'gpu-rtx4080-strix',
  'GPU-RTX4080': 'gpu-rtx4080-strix',
  'RTX-4070': 'gpu-rtx4070-gigabyte',
  'I5-13600K': 'cpu-i5-13600k',
  'R7-7800X3D': 'cpu-r7-7800x3d',
  'R5-5600X': 'cpu-r5-5600x',
  'B760-PLUS': 'mb-b760-plus',
  'B650-TOMAHAWK': 'mb-b650-tomahawk',
  'DDR5-32GB': 'ram-corsair-ddr5-32',
  'RM750E': 'psu-corsair-rm750e',
  '990-PRO-1TB': 'ssd-samsung-990-pro-1tb',
};

function resolveSkuCode(rawCode: unknown): string {
  const trimmed = sanitizeTextInput(String(rawCode ?? ''), 80);
  const alias = SKU_ALIAS_MAP[trimmed.toUpperCase()];
  return alias || trimmed;
}

function normalizeChannel(rawChannel: unknown): OrderSourceChannel {
  const upper = String(rawChannel ?? 'WEB_STOREFRONT').trim().toUpperCase();
  if (upper.includes('PARTNER') || upper.includes('B2B')) return 'PARTNER_B2B_API';
  if (upper.includes('POS') || upper.includes('AI')) return 'AI_POS_INGEST';
  if (upper.includes('MOBILE') || upper.includes('APP')) return 'MOBILE_APP';
  return 'WEB_STOREFRONT';
}

function parseLineItems(rawList: unknown): OrderItemInput[] {
  if (!Array.isArray(rawList)) return [];
  return rawList
    .map((entry) => {
      const item = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
      const rawSku = item.hardwareId ?? item.sku ?? item.product_code ?? item.code ?? item.productId;
      const rawQty = item.quantity ?? item.qty ?? item.count ?? 1;
      const qtyNum = Number(rawQty);
      return {
        hardwareId: resolveSkuCode(rawSku),
        quantity: Number.isFinite(qtyNum) ? Math.trunc(qtyNum) : 1,
      };
    })
    .filter((item) => item.hardwareId.length > 0);
}

/**
 * Translates either CyberRig's standard CreateOrderDto or heterogeneous external payloads
 * (`user`, `products`, `product_code`, `qty`, `delivery_addr`, `channel`) into canonical DTO.
 */
export function normalizeCreateOrderPayload(
  rawBody: Record<string, unknown>,
  customerId?: string | null
): CanonicalOrderAdapterResult {
  const userObj =
    rawBody.user && typeof rawBody.user === 'object' && !Array.isArray(rawBody.user)
      ? (rawBody.user as Record<string, unknown>)
      : null;

  const isHeterogeneous = Boolean(
    userObj ||
      typeof rawBody.user === 'string' ||
      Array.isArray(rawBody.products) ||
      typeof rawBody.delivery_addr === 'string' ||
      typeof rawBody.channel === 'string'
  );

  const rawName =
    rawBody.customerName ??
    userObj?.name ??
    userObj?.fullName ??
    (typeof rawBody.user === 'string' ? rawBody.user : '');
  const rawEmail =
    rawBody.customerEmail ??
    userObj?.email ??
    (isHeterogeneous ? 'partner-intake@cyberrig.local' : '');
  const rawPhone = rawBody.customerPhone ?? userObj?.phone ?? rawBody.phone ?? '';
  const rawAddress = rawBody.shippingAddress ?? rawBody.delivery_addr ?? rawBody.address ?? '';
  const rawItems = Array.isArray(rawBody.items) ? rawBody.items : rawBody.products;

  return {
    dto: {
      customerId: customerId ?? null,
      customerName: sanitizeTextInput(rawName, 150),
      customerEmail: sanitizeTextInput(rawEmail, 150),
      customerPhone: sanitizeTextInput(rawPhone, 30),
      shippingAddress: sanitizeTextInput(rawAddress, 300),
      items: parseLineItems(rawItems),
    },
    sourceChannel: normalizeChannel(rawBody.channel ?? rawBody.sourceChannel),
    simulateFulfillmentFailure: Boolean(rawBody.simulateFulfillmentFailure || rawBody.simulateTmsFailure),
    normalizedFromFormat: isHeterogeneous ? 'HETEROGENEOUS_PARTNER' : 'STANDARD_CANONICAL',
  };
}
