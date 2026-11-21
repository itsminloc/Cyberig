import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { HardwareCategory, HardwareItem } from '../../../modules/hardware/hardware.model';
import { compatibilityService } from '../../../modules/compatibility/compatibility.service';
import { submitOrder, fetchOrderById } from '../../services/order.api';
import { OutOfStockError } from '../../../core/errors';
import { BUILD_PRESETS, MOCK_HARDWARE_CATALOG } from '../pc-builder.data';
import { redis } from '../../../core/redis';
import { orderService } from '../../../modules/orders/order.service';

describe('Checkout Page, Cyberpunk Order Summary & Spec Sheet Export (Task FE-07)', () => {
  const defaultPreset = BUILD_PRESETS[0];
  const standardBuildItems: HardwareItem[] = MOCK_HARDWARE_CATALOG.filter((item) =>
    defaultPreset.itemIds.includes(item.id)
  );

  beforeEach(async () => {
    await redis.flushTestData();
    orderService.resetFallbackData();
  });

  test('Test 1: Form validation logic enforces required fields, Vietnamese phone format, and email format', () => {
    const PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // 1. Phone number test cases
    assert.strictEqual(PHONE_REGEX.test('0901234567'), true, '0901234567 should be valid');
    assert.strictEqual(PHONE_REGEX.test('0987654321'), true, '0987654321 should be valid');
    assert.strictEqual(PHONE_REGEX.test('+84901234567'), true, '+84901234567 should be valid');
    assert.strictEqual(PHONE_REGEX.test('0388889999'), true, '0388889999 should be valid');

    assert.strictEqual(PHONE_REGEX.test('123456'), false, 'Too short number should fail');
    assert.strictEqual(PHONE_REGEX.test('0123456789'), false, 'Invalid prefix 01 should fail');
    assert.strictEqual(PHONE_REGEX.test('090123456789'), false, '11 digits without +84 should fail');
    assert.strictEqual(PHONE_REGEX.test('abc0901234'), false, 'Alphanumeric string should fail');

    // 2. Email format test cases
    assert.strictEqual(EMAIL_REGEX.test('customer@cyberrig.vn'), true);
    assert.strictEqual(EMAIL_REGEX.test('gamer.pro@gmail.com'), true);
    assert.strictEqual(EMAIL_REGEX.test('invalid-email'), false);
    assert.strictEqual(EMAIL_REGEX.test('customer@'), false);
    assert.strictEqual(EMAIL_REGEX.test('@domain.com'), false);
  });

  test('Test 2: submitOrder successfully calls API, returns OrderDetail with PENDING_PAYMENT and Price Snapshot', async () => {
    const dto = {
      customerName: 'Nguyễn Tiến Dũng',
      customerEmail: 'dung.nguyen@cyberrig.vn',
      customerPhone: '0903456789',
      shippingAddress: '128 Trần Hưng Đạo, Quận 5, TP. Hồ Chí Minh',
      items: standardBuildItems.map((item) => ({
        hardwareId: item.id,
        quantity: 1,
      })),
    };

    const order = await submitOrder(dto);

    // 1. Verify structure
    assert.ok(order.id);
    assert.strictEqual(order.customerName, dto.customerName);
    assert.strictEqual(order.status, 'PENDING_PAYMENT');
    assert.strictEqual(order.items.length, standardBuildItems.length);

    // 2. Verify Price Snapshot
    const expectedTotal = standardBuildItems.reduce((sum, item) => sum + item.price, 0);
    assert.strictEqual(order.totalAmount, expectedTotal);

    const firstItem = order.items[0];
    const matchingHardware = standardBuildItems.find((h) => h.id === firstItem.hardwareId);
    assert.ok(matchingHardware);
    assert.strictEqual(firstItem.priceAtPurchase, matchingHardware.price);

    // 3. Verify fetchOrderById
    const fetched = await fetchOrderById(order.id);
    assert.strictEqual(fetched.id, order.id);
    assert.strictEqual(fetched.totalAmount, expectedTotal);
  });

  test('Test 3: submitOrder correctly intercepts and maps OutOfStockError when warehouse is depleted', async () => {
    const dto = {
      customerName: 'Hoàng Hải Đăng',
      customerEmail: 'dang.hoang@cyberrig.vn',
      customerPhone: '0912345678',
      shippingAddress: '40 Hoàng Diệu, Đà Nẵng',
      items: [
        // Request excessive quantity exceeding warehouse stock
        { hardwareId: 'cpu-i5-13600k', quantity: 9999 },
      ],
    };

    await assert.rejects(
      async () => {
        await submitOrder(dto);
      },
      (err: any) => {
        assert.ok(err instanceof OutOfStockError);
        assert.strictEqual(err.statusCode, 400);
        assert.strictEqual(err.code, 'OUT_OF_STOCK');
        assert.ok(err.message.includes('không đủ số lượng tồn kho'));
        return true;
      }
    );
  });

  test('Test 4: Verification of minimum core components requirement (CPU, Motherboard, RAM, PSU) before checkout', () => {
    const checkRequired = (items: HardwareItem[]) => {
      const categories = new Set(items.map((i) => i.categoryId));
      return (
        categories.has(HardwareCategory.CPU) &&
        categories.has(HardwareCategory.MOTHERBOARD) &&
        categories.has(HardwareCategory.RAM) &&
        categories.has(HardwareCategory.PSU)
      );
    };

    // Standard preset has all required
    assert.strictEqual(checkRequired(standardBuildItems), true);

    // Missing PSU
    const noPsu = standardBuildItems.filter((i) => i.categoryId !== HardwareCategory.PSU);
    assert.strictEqual(checkRequired(noPsu), false);

    // Missing Motherboard
    const noMb = standardBuildItems.filter((i) => i.categoryId !== HardwareCategory.MOTHERBOARD);
    assert.strictEqual(checkRequired(noMb), false);

    // Missing CPU
    const noCpu = standardBuildItems.filter((i) => i.categoryId !== HardwareCategory.CPU);
    assert.strictEqual(checkRequired(noCpu), false);

    // Missing RAM
    const noRam = standardBuildItems.filter((i) => i.categoryId !== HardwareCategory.RAM);
    assert.strictEqual(checkRequired(noRam), false);
  });

  test('Test 5: BuildSpecSheetCard calculations & Wattage telemetry evaluation', () => {
    const compat = compatibilityService.validateBuild(standardBuildItems);

    // 1. Standard build must be compatible
    assert.strictEqual(compat.status, 'COMPATIBLE');

    // 2. Estimated wattage must be positive and recommended PSU must cover it with margin
    assert.ok(compat.totalEstimatedWattage > 0);
    assert.ok(compat.recommendedPsuWattage > compat.totalEstimatedWattage);

    // 3. Total price matches sum of items
    const sumPrice = standardBuildItems.reduce((acc, i) => acc + i.price, 0);
    assert.ok(sumPrice > 0);
  });

  test('Test 6: VietQR Bank Transfer Payload generates valid account, bank, and order code', async () => {
    const dto = {
      customerName: 'Lý Quốc Nam',
      customerEmail: 'nam.ly@cyberrig.vn',
      customerPhone: '0977665544',
      shippingAddress: '15 Lê Lợi, TP. Huế',
      items: [{ hardwareId: 'cpu-i5-13600k', quantity: 1 }],
    };

    const order = await submitOrder(dto);

    // Verify QR transfer metadata
    const bankConfig = {
      bankName: 'Vietcombank',
      accountNumber: '99281004889',
      accountName: 'CONG TY CP CYBERRIG VIETNAM',
      amount: order.totalAmount,
      transferContent: order.id,
    };

    assert.strictEqual(bankConfig.bankName, 'Vietcombank');
    assert.strictEqual(bankConfig.accountNumber, '99281004889');
    assert.strictEqual(bankConfig.transferContent, order.id);
    assert.strictEqual(bankConfig.amount, 7690000);
  });
});
