import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { HardwareService } from './hardware.service';
import { HardwareCategory } from './hardware.model';
import { EntityNotFoundError } from '../../core/errors';

describe('Hardware Query Service & Multi-criteria Filter (Task BE-07)', () => {
  const service = new HardwareService();

  test('Test case 1: Lọc theo category: "CPU" chỉ trả về linh kiện thuộc phân loại CPU', async () => {
    const result = await service.getHardwareItems({ category: 'CPU' });

    assert.ok(result.items.length > 0, 'Danh sách CPU không được rỗng');
    assert.strictEqual(result.pagination.total, result.items.length);

    for (const item of result.items) {
      assert.strictEqual(
        item.categoryId,
        HardwareCategory.CPU,
        `Linh kiện ${item.name} phải có categoryId là CPU`
      );
    }
  });

  test('Test case 2: Lọc minPrice: 3000000, maxPrice: 7000000 chỉ trả về sản phẩm trong tầm giá', async () => {
    const minPrice = 3000000;
    const maxPrice = 7000000;

    const result = await service.getHardwareItems({ minPrice, maxPrice });

    assert.ok(result.items.length > 0, 'Phải có sản phẩm trong tầm giá 3M - 7M');

    for (const item of result.items) {
      assert.ok(
        item.price >= minPrice,
        `Giá ${item.price} của ${item.name} phải >= ${minPrice}`
      );
      assert.ok(
        item.price <= maxPrice,
        `Giá ${item.price} của ${item.name} phải <= ${maxPrice}`
      );
    }
  });

  test('Test case 3: Khi bật inStockOnly: true, danh sách trả về không chứa bất kỳ linh kiện nào có stock_quantity <= 0', async () => {
    // 1. Khi tắt inStockOnly: có chứa sản phẩm hết hàng (cpu-r5-5600x với stock 0)
    const allItemsResult = await service.getHardwareItems({ inStockOnly: false, limit: 100 });
    const hasOutOfStock = allItemsResult.items.some((i) => i.stockQuantity === 0);
    assert.strictEqual(hasOutOfStock, true, 'Danh sách tổng phải chứa sản phẩm hết hàng');

    // 2. Khi bật inStockOnly: true
    const inStockResult = await service.getHardwareItems({ inStockOnly: true });

    assert.ok(inStockResult.items.length > 0, 'Phải có sản phẩm còn hàng');
    for (const item of inStockResult.items) {
      assert.ok(
        item.stockQuantity > 0,
        `Sản phẩm ${item.name} phải có số lượng tồn kho > 0 (hiện tại: ${item.stockQuantity})`
      );
    }

    const outOfStockInFiltered = inStockResult.items.some((i) => i.stockQuantity <= 0);
    assert.strictEqual(outOfStockInFiltered, false, 'Không được có sản phẩm hết hàng khi inStockOnly: true');
  });

  test('Test case 4: Kiểm tra tính toán phân trang (offset, limit, totalPages) chuẩn xác', async () => {
    const limit = 3;
    const page1 = await service.getHardwareItems({ page: 1, limit });
    const page2 = await service.getHardwareItems({ page: 2, limit });

    assert.strictEqual(page1.pagination.page, 1);
    assert.strictEqual(page1.pagination.limit, 3);
    assert.strictEqual(page1.items.length, 3);

    assert.strictEqual(page2.pagination.page, 2);
    assert.strictEqual(page2.pagination.limit, 3);
    assert.strictEqual(page2.items.length, 3);

    // Dữ liệu trang 1 và trang 2 không được trùng lặp
    const page1Ids = page1.items.map((i) => i.id);
    const page2Ids = page2.items.map((i) => i.id);
    const hasOverlap = page1Ids.some((id) => page2Ids.includes(id));
    assert.strictEqual(hasOverlap, false, 'Dữ liệu các trang phân tách không được trùng lặp');

    // Tổng số trang tính đúng
    const expectedTotalPages = Math.ceil(page1.pagination.total / limit);
    assert.strictEqual(page1.pagination.totalPages, expectedTotalPages);
  });

  test('Test case 5: Gọi getHardwareById với ID không tồn tại phải ném EntityNotFoundError (mã HTTP 404)', async () => {
    const nonExistentId = 'non-existent-hw-uuid-99999';

    await assert.rejects(
      async () => {
        await service.getHardwareById(nonExistentId);
      },
      (err: unknown) => {
        assert.ok(err instanceof EntityNotFoundError);
        assert.strictEqual(err.statusCode, 404);
        assert.strictEqual(err.code, 'ENTITY_NOT_FOUND');
        assert.ok(err.message.includes(nonExistentId));
        return true;
      }
    );
  });

  test('Bonus: Lấy chi tiết linh kiện hợp lệ bằng getHardwareById', async () => {
    const validId = 'cpu-i5-13600k';
    const item = await service.getHardwareById(validId);

    assert.ok(item);
    assert.strictEqual(item.id, validId);
    assert.strictEqual(item.brand, 'Intel');
    assert.strictEqual(item.price, 7690000);
    assert.strictEqual(item.categoryId, HardwareCategory.CPU);
  });

  test('Bonus: Tìm kiếm chuỗi ký tự theo tên (search: "rtx")', async () => {
    const result = await service.getHardwareItems({ search: 'rtx' });

    assert.ok(result.items.length > 0);
    for (const item of result.items) {
      assert.ok(
        item.name.toLowerCase().includes('rtx'),
        `Tên sản phẩm ${item.name} phải chứa chuỗi 'rtx'`
      );
    }
  });

  test('Bonus: Lọc theo thương hiệu không phân biệt hoa thường (brand: "asus")', async () => {
    const result = await service.getHardwareItems({ brand: 'asus' });

    assert.ok(result.items.length > 0);
    for (const item of result.items) {
      assert.strictEqual(
        item.brand.toLowerCase(),
        'asus',
        `Thương hiệu của ${item.name} phải là ASUS`
      );
    }
  });
});
