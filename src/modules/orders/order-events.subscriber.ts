/**
 * Order Domain Event Subscribers & Dispatch Helper (SE445 Case Study 01 EDA)
 * Registers idempotent downstream workers on the Event Bus:
 *  1. order.inventory-sync (ERP Warehouse Sync)
 *  2. order.crm-loyalty (Customer Points Ledger)
 *  3. order.fulfillment-tms (Carrier Dispatch w/ DLQ Retry demonstration)
 */

import { eventBus, EventEnvelope } from '../../core/events';
import { OrderDetail } from './order.model';
import { OrderSourceChannel } from './order.adapter';

interface FulfillmentShipment {
  trackingCode: string;
  orderId: string;
  correlationId: string;
  status: 'DISPATCHED';
  dispatchedAt: string;
}

const crmPointsLedger = new Map<string, number>();
const syncedInventoryOrders = new Set<string>();
const fulfillmentShipments: FulfillmentShipment[] = [];
let subscribersRegistered = false;

/**
 * Registers idempotent order.created downstream consumers once per process.
 */
export function registerOrderEventSubscribers(): void {
  if (subscribersRegistered) return;

  eventBus.subscribe('order.inventory-sync', 'order.created', async (event: EventEnvelope) => {
    const orderId = String(event.data.orderId ?? event.eventId);
    syncedInventoryOrders.add(orderId);
  });

  eventBus.subscribe('order.crm-loyalty', 'order.created', async (event: EventEnvelope) => {
    const accountKey = String(event.data.customerKey ?? event.data.orderId ?? 'guest');
    const totalAmount = Number(event.data.totalAmount ?? 0);
    const pointsEarned = Math.max(10, Math.floor(totalAmount / 1_000_000) * 5);
    crmPointsLedger.set(accountKey, (crmPointsLedger.get(accountKey) || 0) + pointsEarned);
  });

  eventBus.subscribe('order.fulfillment-tms', 'order.created', async (event: EventEnvelope) => {
    if (event.data.injectedError === 'POISON_PILL_TEST') {
      throw new Error('Schema Validation Failure: Field "totalPrice" cannot be NaN and "qty" cannot be negative.');
    }
    if (event.data.simulateTmsFailure === true) {
      throw new Error('TMS Fulfillment Carrier Timeout (504 Gateway Timeout) — exhausting retries to DLQ.');
    }
    const orderId = String(event.data.orderId ?? event.eventId);
    fulfillmentShipments.unshift({
      trackingCode: `CYB-TMS-${orderId.slice(0, 8).toUpperCase()}`,
      orderId,
      correlationId: event.correlationId,
      status: 'DISPATCHED',
      dispatchedAt: new Date().toISOString(),
    });
    if (fulfillmentShipments.length > 50) fulfillmentShipments.pop();
  });

  subscribersRegistered = true;
}

/**
 * Publishes an OrderPlaced canonical event for downstream subscribers.
 */
export async function dispatchOrderPlacedEvent(params: {
  order: OrderDetail;
  correlationId: string;
  sourceChannel: OrderSourceChannel;
  simulateTmsFailure?: boolean;
}): Promise<EventEnvelope> {
  registerOrderEventSubscribers();
  const envelope: EventEnvelope = {
    eventId: `evt-ord-${params.order.id}`,
    eventType: 'OrderPlaced',
    eventVersion: '1.0',
    occurredAt: new Date().toISOString(),
    correlationId: params.correlationId,
    sourceChannel: params.sourceChannel,
    data: {
      orderId: params.order.id,
      customerKey: params.order.customerId || params.order.customerPhone || params.order.id,
      totalAmount: params.order.totalAmount,
      itemCount: params.order.items.reduce((acc, item) => acc + item.quantity, 0),
      status: params.order.status,
      simulateTmsFailure: Boolean(params.simulateTmsFailure),
    },
  };

  await eventBus.publish('order.created', envelope, params.order.id);
  return envelope;
}

export function getOrderDownstreamState() {
  return {
    subscribersRegistered,
    inventorySyncedCount: syncedInventoryOrders.size,
    crmAccountsRewarded: crmPointsLedger.size,
    fulfillmentShipmentsCount: fulfillmentShipments.length,
    recentShipments: fulfillmentShipments.slice(0, 10),
  };
}

export function resetOrderSubscriberState(): void {
  crmPointsLedger.clear();
  syncedInventoryOrders.clear();
  fulfillmentShipments.length = 0;
  subscribersRegistered = false;
}
