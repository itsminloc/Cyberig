/**
 * Customer Dashboard Unit & Integration Spec (Task FE-09 / Sprint 5)
 * Verifies Milestone Stepper, Status Meta Mapping, Build Spec Sheet hardware transformation,
 * and Customer Service methods with Bearer token injection.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getMilestoneStep,
  getOrderStatusMeta,
  mapOrderItemToHardware,
  REPAIR_MILESTONES,
} from './customer-dashboard.utils';
import { HardwareCategory } from '../../../modules/hardware/hardware.model';
import { TicketStatus } from '../../../modules/repair-tickets/ticket.state';
import { customerService } from '../../services/customer.service';
import { setStoredSession, clearStoredSession, UserProfile } from '../../services/api';

describe('Customer Dashboard - My Rig & Active Repairs Portal (Task FE-09)', () => {
  const sampleCustomer: UserProfile = {
    id: 'user-cust-01',
    email: 'customer@cyberig.vn',
    role: 'CUSTOMER',
    fullName: 'Khách Hàng Cyber',
    phone: '0901234567',
  };

  beforeEach(() => {
    clearStoredSession();
  });

  test('FE-09 Test 1: Milestone Stepper calculation maps TicketStatus to correct 5-step stages', () => {
    // 5 Milestones
    assert.strictEqual(getMilestoneStep(TicketStatus.RECEIVED), 1, 'RECEIVED should be Step 1');
    assert.strictEqual(getMilestoneStep(TicketStatus.DIAGNOSING), 2, 'DIAGNOSING should be Step 2');
    assert.strictEqual(getMilestoneStep(TicketStatus.QUOTED), 3, 'QUOTED should be Step 3');
    assert.strictEqual(getMilestoneStep(TicketStatus.REPAIRING), 4, 'REPAIRING should be Step 4');
    assert.strictEqual(getMilestoneStep(TicketStatus.COMPLETED), 5, 'COMPLETED should be Step 5');

    // Edge cases
    assert.strictEqual(getMilestoneStep(TicketStatus.CANCELLED), 0, 'CANCELLED should return 0 (not in active steps)');
    assert.strictEqual(getMilestoneStep('UNKNOWN_STATUS'), 1, 'Unknown status defaults gracefully to step 1');

    // Milestones definitions check
    assert.strictEqual(REPAIR_MILESTONES.length, 5);
    assert.strictEqual(REPAIR_MILESTONES[0].key, 'RECEIVED');
    assert.strictEqual(REPAIR_MILESTONES[1].key, 'DIAGNOSING');
    assert.strictEqual(REPAIR_MILESTONES[2].key, 'QUOTED');
    assert.strictEqual(REPAIR_MILESTONES[3].key, 'REPAIRING');
    assert.strictEqual(REPAIR_MILESTONES[4].key, 'COMPLETED');
  });

  test('FE-09 Test 2: Order status metadata returns correct Cyberpunk badge styling and label', () => {
    const pending = getOrderStatusMeta('PENDING_PAYMENT');
    assert.strictEqual(pending.label, 'CHỜ THANH TOÁN');
    assert.strictEqual(pending.className, 'is-pending');

    const confirmed = getOrderStatusMeta('CONFIRMED');
    assert.strictEqual(confirmed.label, 'ĐÃ XÁC NHẬN');
    assert.strictEqual(confirmed.className, 'is-confirmed');

    const shipped = getOrderStatusMeta('SHIPPED');
    assert.strictEqual(shipped.label, 'ĐANG GIAO HÀNG');
    assert.strictEqual(shipped.className, 'is-shipped');

    const completed = getOrderStatusMeta('COMPLETED');
    assert.strictEqual(completed.label, 'HOÀN TẤT');
    assert.strictEqual(completed.className, 'is-completed');

    const cancelled = getOrderStatusMeta('CANCELLED');
    assert.strictEqual(cancelled.label, 'ĐÃ HỦY');
    assert.strictEqual(cancelled.className, 'is-cancelled');

    const fallback = getOrderStatusMeta('CUSTOM_STATUS');
    assert.strictEqual(fallback.label, 'CUSTOM_STATUS');
    assert.strictEqual(fallback.className, 'is-confirmed');
  });

  test('FE-09 Test 3: mapOrderItemToHardware accurately infers hardware categories for BuildSpecSheetCard', () => {
    const sampleItems = [
      { hardwareId: 'hw-cpu-01', name: 'Intel Core i5-13600K Processor', quantity: 1, priceAtPurchase: 7200000 },
      { hardwareId: 'hw-mb-01', name: 'MSI MAG B760M Mortar WiFi', quantity: 1, priceAtPurchase: 4100000 },
      { hardwareId: 'hw-ram-01', name: 'Corsair Vengeance 32GB DDR5 5600MHz', quantity: 2, priceAtPurchase: 2800000 },
      { hardwareId: 'hw-gpu-01', name: 'ASUS Dual GeForce RTX 4070 12GB', quantity: 1, priceAtPurchase: 16500000 },
      { hardwareId: 'hw-psu-01', name: 'Corsair RM750e 750W 80 Plus Gold', quantity: 1, priceAtPurchase: 2650000 },
      { hardwareId: 'hw-case-01', name: 'NZXT H6 Flow RGB Mid-Tower Case', quantity: 1, priceAtPurchase: 2890000 },
      { hardwareId: 'hw-cooler-01', name: 'DeepCool LT720 360mm AIO Cooler', quantity: 1, priceAtPurchase: 3100000 },
      { hardwareId: 'hw-ssd-01', name: 'Samsung 980 PRO 1TB NVMe PCIe 4.0', quantity: 1, priceAtPurchase: 2350000 },
    ];

    const mapped = sampleItems.map(mapOrderItemToHardware);

    assert.strictEqual(mapped[0].categoryId, HardwareCategory.CPU);
    assert.strictEqual(mapped[1].categoryId, HardwareCategory.MOTHERBOARD);
    assert.strictEqual(mapped[2].categoryId, HardwareCategory.RAM);
    assert.strictEqual(mapped[3].categoryId, HardwareCategory.GPU);
    assert.strictEqual(mapped[4].categoryId, HardwareCategory.PSU);
    assert.strictEqual(mapped[5].categoryId, HardwareCategory.CASE);
    assert.strictEqual(mapped[6].categoryId, HardwareCategory.COOLER);
    assert.strictEqual(mapped[7].categoryId, HardwareCategory.STORAGE);

    // Verify fields preserved
    assert.strictEqual(mapped[0].id, 'hw-cpu-01');
    assert.strictEqual(mapped[0].price, 7200000);
    assert.strictEqual(mapped[0].stockQuantity, 1);
    assert.strictEqual(mapped[0].brand, 'Intel');
  });

  test('FE-09 Test 4: customerService.fetchMyOrders and fetchMyTickets handle mock HTTP response with Bearer token', async () => {
    setStoredSession({
      accessToken: 'valid-jwt-token-customer',
      refreshToken: 'valid-refresh-token',
      user: sampleCustomer,
    });

    let requestedEndpoints: string[] = [];
    let authorizationHeaders: string[] = [];

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      requestedEndpoints.push(url);
      const headers = (init?.headers as Record<string, string>) || {};
      authorizationHeaders.push(headers['Authorization'] || '');

      if (url.includes('/api/customer/orders')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                id: 'ord-test-01',
                orderCode: 'ORD-TEST-001',
                customerName: 'Khách Hàng Cyber',
                customerEmail: 'customer@cyberig.vn',
                customerPhone: '0901234567',
                shippingAddress: 'HCM',
                status: 'CONFIRMED',
                totalPrice: 25000000,
                createdAt: new Date().toISOString(),
                items: [
                  {
                    id: 'item-1',
                    hardwareId: 'hw-cpu-01',
                    name: 'Intel Core i5-13600K',
                    priceAtPurchase: 7000000,
                    quantity: 1,
                  },
                ],
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (url.includes('/api/customer/tickets')) {
        return new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                id: 'ticket-test-01',
                ticketCode: 'TK-TEST-001',
                customerName: 'Khách Hàng Cyber',
                customerPhone: '0901234567',
                customerEmail: 'customer@cyberig.vn',
                deviceName: 'PC Gaming RTX 4070',
                issueDescription: 'Mất nguồn đột ngột',
                status: TicketStatus.DIAGNOSING,
                createdAt: new Date().toISOString(),
                timeline: [],
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(JSON.stringify({ success: false }), { status: 404 });
    };

    try {
      const orders = await customerService.fetchMyOrders();
      assert.strictEqual(orders.length, 1);
      assert.strictEqual(orders[0].id, 'ord-test-01');
      assert.strictEqual(orders[0].items.length, 1);

      const tickets = await customerService.fetchMyTickets();
      assert.strictEqual(tickets.length, 1);
      assert.strictEqual(tickets[0].ticketCode, 'TK-TEST-001');
      assert.strictEqual(tickets[0].status, TicketStatus.DIAGNOSING);

      // Verify Bearer tokens were injected into both requests
      assert.strictEqual(authorizationHeaders[0], 'Bearer valid-jwt-token-customer');
      assert.strictEqual(authorizationHeaders[1], 'Bearer valid-jwt-token-customer');
      assert.ok(requestedEndpoints[0].includes('/api/customer/orders'));
      assert.ok(requestedEndpoints[1].includes('/api/customer/tickets'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('FE-09 Test 5: customerService properly handles network/server errors', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Token không hợp lệ hoặc đã hết hạn.' },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    };

    try {
      await customerService.fetchMyOrders();
      assert.fail('Should have thrown an error on 401 response');
    } catch (err: any) {
      assert.ok(err);
      assert.strictEqual(err.status, 401);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
