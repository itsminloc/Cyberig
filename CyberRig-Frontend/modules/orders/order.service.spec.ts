import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { orderService } from './order.service';
import { hardwareService } from '../hardware/hardware.service';
import { redis } from '../../core/redis';
import {
  OutOfStockError,
  EntityNotFoundError,
  InvalidStateTransitionError,
  DomainError,
} from '../../core/errors';
import { CreateOrderDto } from './order.model';

describe('Real-time Stock Reservation, Order Processing & Price Snapshot (Task BE-09)', () => {
  const CPU_ID = 'cpu-i5-13600k';
  const GPU_ID = 'gpu-rtx-4070-gigabyte';

  beforeEach(async () => {
    // Reset test state and Redis keys
    await redis.flushTestData();
    orderService.resetFallbackData();
  });

  test('Test 1 (Happy Path): Đặt hàng thành công khi kho còn đủ hàng, lưu đúng priceAtPurchase và tính đúng totalAmount', async () => {
    const cpu = await hardwareService.getHardwareById(CPU_ID);
    const gpu = await hardwareService.getHardwareById(GPU_ID);

    const dto: CreateOrderDto = {
      customerName: 'Trần Văn Hoàng',
      customerEmail: 'hoang.tran@cyberrig.vn',
      customerPhone: '0987654321',
      shippingAddress: '45 Lê Duẩn, Quận 1, TP. Hồ Chí Minh',
      items: [
        { hardwareId: CPU_ID, quantity: 2 },
        { hardwareId: GPU_ID, quantity: 1 },
      ],
    };

    const order = await orderService.createOrder(dto);

    // 1. Kiểm tra cấu trúc đơn hàng
    assert.ok(order.id);
    assert.strictEqual(order.customerName, dto.customerName);
    assert.strictEqual(order.status, 'PENDING_PAYMENT');
    assert.strictEqual(order.items.length, 2);

    // 2. Kiểm tra Price Snapshot từng linh kiện
    const cpuItem = order.items.find((i) => i.hardwareId === CPU_ID);
    const gpuItem = order.items.find((i) => i.hardwareId === GPU_ID);

    assert.ok(cpuItem);
    assert.strictEqual(cpuItem.quantity, 2);
    assert.strictEqual(cpuItem.priceAtPurchase, Number(cpu.price));

    assert.ok(gpuItem);
    assert.strictEqual(gpuItem.quantity, 1);
    assert.strictEqual(gpuItem.priceAtPurchase, Number(gpu.price));

    // 3. Kiểm tra tính toán totalAmount = SUM(price * qty)
    const expectedTotal = Number(cpu.price) * 2 + Number(gpu.price) * 1;
    assert.strictEqual(order.totalAmount, expectedTotal);

    // 4. Kiểm tra khóa tạm tồn kho Redis đã ghi nhận
    const reservedCpu = await redis.getReservedStock(CPU_ID);
    const reservedGpu = await redis.getReservedStock(GPU_ID);
    assert.strictEqual(reservedCpu, 2);
    assert.strictEqual(reservedGpu, 1);
  });

  test('Test 2 (Out of Stock & Rollback): Ném OutOfStockError khi số lượng đặt lớn hơn tồn kho thực tế, đảm bảo không có khóa Redis nào bị treo (leak)', async () => {
    const gpu = await hardwareService.getHardwareById(GPU_ID);
    const initialReservedCpu = await redis.getReservedStock(CPU_ID);
    const initialReservedGpu = await redis.getReservedStock(GPU_ID);

    const dto: CreateOrderDto = {
      customerName: 'Lê Minh Quân',
      customerEmail: 'quan.le@cyberrig.vn',
      customerPhone: '0912345678',
      shippingAddress: '12 Nguyễn Thị Minh Khai, Hà Nội',
      items: [
        // CPU còn đủ hàng (kho có 25 cái, đặt 2) -> sẽ đặt trước
        { hardwareId: CPU_ID, quantity: 2 },
        // GPU vượt quá tồn kho (kho có 12 cái, đặt 999) -> gây lỗi
        { hardwareId: GPU_ID, quantity: 999 },
      ],
    };

    // Kỳ vọng ném OutOfStockError
    await assert.rejects(
      async () => {
        await orderService.createOrder(dto);
      },
      (err: any) => {
        assert.ok(err instanceof OutOfStockError);
        assert.strictEqual(err.statusCode, 400);
        assert.strictEqual(err.code, 'OUT_OF_STOCK');
        assert.ok(err.message.includes('không đủ số lượng tồn kho'));
        return true;
      }
    );

    // KIỂM TRA ROLLBACK: CPU đã giữ chỗ tạm thời phải được giải phóng về ban đầu, không bị rò rỉ khóa
    const finalReservedCpu = await redis.getReservedStock(CPU_ID);
    const finalReservedGpu = await redis.getReservedStock(GPU_ID);

    assert.strictEqual(
      finalReservedCpu,
      initialReservedCpu,
      'CPU reservation phải được rollback về 0 sau khi request thất bại'
    );
    assert.strictEqual(
      finalReservedGpu,
      initialReservedGpu,
      'GPU reservation không được ghi nhận'
    );
  });

  test('Test 3 (Price Decoupling / Price Snapshot): Thay đổi giá niêm yết trong hardware_items sau đó không làm thay đổi priceAtPurchase của đơn hàng đã đặt', async () => {
    const originalCpu = await hardwareService.getHardwareById(CPU_ID);
    const originalPrice = Number(originalCpu.price);

    // 1. Tạo đơn hàng lúc giá gốc
    const dto: CreateOrderDto = {
      customerName: 'Phạm Hải Đăng',
      customerEmail: 'dang.pham@cyberrig.vn',
      customerPhone: '0933221100',
      shippingAddress: '88 Cầu Giấy, Hà Nội',
      items: [{ hardwareId: CPU_ID, quantity: 1 }],
    };

    const order = await orderService.createOrder(dto);
    assert.strictEqual(order.items[0].priceAtPurchase, originalPrice);

    // 2. Nhà bán lẻ tăng giá CPU thêm 2.000.000 VND
    const newPrice = originalPrice + 2000000;
    await hardwareService.updatePrice(CPU_ID, newPrice);

    const updatedCpu = await hardwareService.getHardwareById(CPU_ID);
    assert.strictEqual(Number(updatedCpu.price), newPrice);

    // 3. Truy vấn lại đơn hàng từ Database / Service
    const retrievedOrder = await orderService.getOrderById(order.id);

    // BẮT BUỘC: priceAtPurchase trong đơn hàng vẫn giữ nguyên giá cũ lúc snapshot
    assert.strictEqual(
      retrievedOrder.items[0].priceAtPurchase,
      originalPrice,
      'Giá tại thời điểm đặt hàng phải bất biến theo nguyên tắc Price Snapshot'
    );
    assert.strictEqual(
      retrievedOrder.totalAmount,
      originalPrice,
      'Tổng tiền đơn hàng không được biến động theo giá thị trường mới'
    );

    // Khôi phục giá gốc sau test
    await hardwareService.updatePrice(CPU_ID, originalPrice);
  });

  test('Test 4 (Order Confirmation Lifecycle): Xác nhận đơn hàng thành công, trừ tồn kho vật lý và giải phóng khóa tạm Redis', async () => {
    const initialHw = await hardwareService.getHardwareById(CPU_ID);
    const initialStock = initialHw.stockQuantity;

    const dto: CreateOrderDto = {
      customerName: 'Ngô Thanh Vân',
      customerEmail: 'van.ngo@cyberrig.vn',
      customerPhone: '0909090909',
      shippingAddress: '10 Hai Bà Trưng, Đà Nẵng',
      items: [{ hardwareId: CPU_ID, quantity: 3 }],
    };

    const order = await orderService.createOrder(dto);
    assert.strictEqual(order.status, 'PENDING_PAYMENT');

    // Khóa Redis đang giữ 3
    let reserved = await redis.getReservedStock(CPU_ID);
    assert.strictEqual(reserved, 3);

    // Kỹ thuật viên / Thu ngân xác nhận đơn hàng đã thanh toán
    await orderService.confirmOrder(order.id);

    // 1. Trạng thái đơn hàng chuyển sang CONFIRMED
    const confirmedOrder = await orderService.getOrderById(order.id);
    assert.strictEqual(confirmedOrder.status, 'CONFIRMED');

    // 2. Tồn kho vật lý bị trừ chính thức
    const updatedHw = await hardwareService.getHardwareById(CPU_ID);
    assert.strictEqual(updatedHw.stockQuantity, initialStock - 3);

    // 3. Khóa tạm trong Redis được giải phóng
    reserved = await redis.getReservedStock(CPU_ID);
    assert.strictEqual(reserved, 0);

    // 4. Cố gắng xác nhận lần nữa sẽ ném InvalidStateTransitionError
    await assert.rejects(
      async () => {
        await orderService.confirmOrder(order.id);
      },
      (err: any) => {
        assert.ok(err instanceof InvalidStateTransitionError);
        return true;
      }
    );
  });

  test('Test 5 (Order Cancellation Lifecycle): Hủy đơn hàng giải phóng khóa tạm Redis và hoàn trả tồn kho khả dụng', async () => {
    const dto: CreateOrderDto = {
      customerName: 'Bùi Anh Tuấn',
      customerEmail: 'tuan.bui@cyberrig.vn',
      customerPhone: '0977889900',
      shippingAddress: '202 Pasteur, Quận 3, TP. Hồ Chí Minh',
      items: [{ hardwareId: GPU_ID, quantity: 2 }],
    };

    const order = await orderService.createOrder(dto);

    // Khóa Redis đang giữ 2
    let reserved = await redis.getReservedStock(GPU_ID);
    assert.strictEqual(reserved, 2);

    // Hủy đơn hàng
    await orderService.cancelOrder(order.id);

    const cancelledOrder = await orderService.getOrderById(order.id);
    assert.strictEqual(cancelledOrder.status, 'CANCELLED');

    // Khóa tạm Redis đã được giải phóng
    reserved = await redis.getReservedStock(GPU_ID);
    assert.strictEqual(reserved, 0);

    // Hủy lần nữa ném InvalidStateTransitionError
    await assert.rejects(
      async () => {
        await orderService.cancelOrder(order.id);
      },
      (err: any) => {
        assert.ok(err instanceof InvalidStateTransitionError);
        return true;
      }
    );
  });

  test('Test 6 (Validation & Domain Errors): Kiểm tra xử lý dữ liệu đầu vào và các lỗi domain chuẩn', async () => {
    // 1. Thiếu thông tin khách hàng
    await assert.rejects(
      async () => {
        await orderService.createOrder({
          customerName: '',
          customerEmail: '',
          customerPhone: '',
          shippingAddress: '',
          items: [{ hardwareId: CPU_ID, quantity: 1 }],
        });
      },
      (err: any) => {
        assert.ok(err instanceof DomainError);
        assert.strictEqual(err.statusCode, 400);
        return true;
      }
    );

    // 2. Danh sách linh kiện rỗng
    await assert.rejects(
      async () => {
        await orderService.createOrder({
          customerName: 'Test',
          customerEmail: 'test@mail.com',
          customerPhone: '0123456789',
          shippingAddress: 'Test Address',
          items: [],
        });
      },
      (err: any) => {
        assert.ok(err instanceof DomainError);
        assert.strictEqual(err.statusCode, 400);
        return true;
      }
    );

    // 3. Linh kiện không tồn tại trong kho
    await assert.rejects(
      async () => {
        await orderService.createOrder({
          customerName: 'Test',
          customerEmail: 'test@mail.com',
          customerPhone: '0123456789',
          shippingAddress: 'Test Address',
          items: [{ hardwareId: 'non-existent-hw-999', quantity: 1 }],
        });
      },
      (err: any) => {
        assert.ok(err instanceof EntityNotFoundError);
        assert.strictEqual(err.statusCode, 404);
        return true;
      }
    );

    // 4. Truy vấn đơn hàng không tồn tại
    await assert.rejects(
      async () => {
        await orderService.getOrderById('ord-not-exist-404');
      },
      (err: any) => {
        assert.ok(err instanceof EntityNotFoundError);
        assert.strictEqual(err.statusCode, 404);
        return true;
      }
    );
  });
});
