import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { compatibilityService } from '../../../modules/compatibility/compatibility.service';
import { HardwareCategory } from '../../../modules/hardware/hardware.model';
import { MOCK_HARDWARE_CATALOG, BUILD_PRESETS } from '../../pages/pc-builder.data';

describe('PC Builder UI Data & Compatibility Integration (FE-03)', () => {
  test('Preset "Gaming Esport 1080p / 2K" must validate as COMPATIBLE', () => {
    const esportPreset = BUILD_PRESETS.find((p) => p.id === 'esport-1080p')!;
    assert.ok(esportPreset);

    const items = MOCK_HARDWARE_CATALOG.filter((item) =>
      esportPreset.itemIds.includes(item.id)
    );
    assert.strictEqual(items.length, 8);

    const result = compatibilityService.validateBuild(items);
    assert.strictEqual(result.status, 'COMPATIBLE');
    assert.strictEqual(result.issues.length, 0);
    assert.ok(result.totalEstimatedWattage > 300);
    assert.ok(result.recommendedPsuWattage >= 500);
  });

  test('Preset "AAA 4K Extreme Master" must validate as COMPATIBLE', () => {
    const aaaPreset = BUILD_PRESETS.find((p) => p.id === 'aaa-4k-master')!;
    assert.ok(aaaPreset);

    const items = MOCK_HARDWARE_CATALOG.filter((item) =>
      aaaPreset.itemIds.includes(item.id)
    );
    assert.strictEqual(items.length, 8);

    const result = compatibilityService.validateBuild(items);
    assert.strictEqual(result.status, 'COMPATIBLE');
    assert.strictEqual(result.issues.length, 0);
    assert.ok(result.totalEstimatedWattage > 700);
    assert.ok(result.recommendedPsuWattage >= 1000);
  });

  test('Replacing CPU with AM5 in Intel build flags SOCKET conflict', () => {
    const esportPreset = BUILD_PRESETS.find((p) => p.id === 'esport-1080p')!;
    const items = MOCK_HARDWARE_CATALOG.filter((item) =>
      esportPreset.itemIds.includes(item.id)
    );

    // Swap CPU with AMD Ryzen 7 7800X3D (AM5)
    const am5Cpu = MOCK_HARDWARE_CATALOG.find((i) => i.id === 'cpu-r7-7800x3d')!;
    const swapped = items.map((i) => (i.categoryId === HardwareCategory.CPU ? am5Cpu : i));

    const result = compatibilityService.validateBuild(swapped);
    assert.strictEqual(result.status, 'INCOMPATIBLE');
    const socketIssue = result.issues.find((i) => i.rule === 'SOCKET');
    assert.ok(socketIssue);
    assert.strictEqual(socketIssue.type, 'ERROR');
  });

  test('Pairing high TDP CPU with H610 Motherboard triggers VRM WARNING', () => {
    const esportPreset = BUILD_PRESETS.find((p) => p.id === 'esport-1080p')!;
    const items = MOCK_HARDWARE_CATALOG.filter((item) =>
      esportPreset.itemIds.includes(item.id)
    );

    // Swap Motherboard to ASUS PRIME H610M-K D4 and RAM to DDR4
    const h610Mb = MOCK_HARDWARE_CATALOG.find((i) => i.id === 'mb-h610m-d4')!;
    const ddr4Ram = MOCK_HARDWARE_CATALOG.find((i) => i.id === 'ram-kingston-ddr4-16')!;

    const swapped = items.map((i) => {
      if (i.categoryId === HardwareCategory.MOTHERBOARD) return h610Mb;
      if (i.categoryId === HardwareCategory.RAM) return ddr4Ram;
      return i;
    });

    const result = compatibilityService.validateBuild(swapped);
    assert.strictEqual(result.status, 'WARNING');
    const vrmWarning = result.issues.find(
      (i) => i.rule === 'SOCKET' && i.type === 'WARNING'
    );
    assert.ok(vrmWarning);
  });

  test('Selecting 400W PSU with RTX 4070 triggers POWER conflict', () => {
    const esportPreset = BUILD_PRESETS.find((p) => p.id === 'esport-1080p')!;
    const items = MOCK_HARDWARE_CATALOG.filter((item) =>
      esportPreset.itemIds.includes(item.id)
    );

    // Swap PSU to 400W
    const psu400w = MOCK_HARDWARE_CATALOG.find((i) => i.id === 'psu-cm-elite-400w')!;
    const swapped = items.map((i) => (i.categoryId === HardwareCategory.PSU ? psu400w : i));

    const result = compatibilityService.validateBuild(swapped);
    assert.strictEqual(result.status, 'INCOMPATIBLE');
    const powerIssue = result.issues.find((i) => i.rule === 'POWER');
    assert.ok(powerIssue);
    assert.strictEqual(powerIssue.type, 'ERROR');
  });

  test('Selecting RTX 4090 with small Case triggers CLEARANCE conflict', () => {
    const esportPreset = BUILD_PRESETS.find((p) => p.id === 'esport-1080p')!;
    const items = MOCK_HARDWARE_CATALOG.filter((item) =>
      esportPreset.itemIds.includes(item.id)
    );

    // Swap Case to Jonsbo C6 (Max GPU 255mm) and GPU to RTX 4090 (358mm)
    const caseJonsbo = MOCK_HARDWARE_CATALOG.find((i) => i.id === 'case-jonsbo-c6')!;
    const gpu4090 = MOCK_HARDWARE_CATALOG.find((i) => i.id === 'gpu-rtx-4090-strix')!;
    const psu1000 = MOCK_HARDWARE_CATALOG.find((i) => i.id === 'psu-corsair-rm1000x')!;

    const swapped = items.map((i) => {
      if (i.categoryId === HardwareCategory.CASE) return caseJonsbo;
      if (i.categoryId === HardwareCategory.GPU) return gpu4090;
      if (i.categoryId === HardwareCategory.PSU) return psu1000;
      return i;
    });

    const result = compatibilityService.validateBuild(swapped);
    assert.strictEqual(result.status, 'INCOMPATIBLE');
    const clearanceIssue = result.issues.find((i) => i.rule === 'CLEARANCE');
    assert.ok(clearanceIssue);
    assert.strictEqual(clearanceIssue.type, 'ERROR');
  });
});

describe('Hardware Selection Modal & Catalog Filter Integration (Task FE-05 / PB-08)', () => {
  // Import dynamically or directly from service
  const { fetchHardwareCatalog } = require('../../services/hardware.api');

  test('FE-05 Test 1: fetchHardwareCatalog filters items by category correctly', async () => {
    const res = await fetchHardwareCatalog({ category: HardwareCategory.GPU });
    assert.ok(res.items.length > 0, 'GPU items list should not be empty');
    for (const item of res.items) {
      assert.strictEqual(item.categoryId, HardwareCategory.GPU);
    }
  });

  test('FE-05 Test 2: fetchHardwareCatalog filters by brand case-insensitively', async () => {
    const res = await fetchHardwareCatalog({
      category: HardwareCategory.MOTHERBOARD,
      brand: 'asus',
    });
    assert.ok(res.items.length > 0, 'Should find ASUS motherboards');
    for (const item of res.items) {
      assert.strictEqual(item.brand.toLowerCase(), 'asus');
    }
  });

  test('FE-05 Test 3: fetchHardwareCatalog filters by price range accurately', async () => {
    const minPrice = 5000000;
    const maxPrice = 10000000;
    const res = await fetchHardwareCatalog({
      minPrice,
      maxPrice,
    });
    assert.ok(res.items.length > 0, 'Should find items between 5M and 10M');
    for (const item of res.items) {
      assert.ok(item.price >= minPrice, `Price ${item.price} should be >= ${minPrice}`);
      assert.ok(item.price <= maxPrice, `Price ${item.price} should be <= ${maxPrice}`);
    }
  });

  test('FE-05 Test 4: inStockOnly flag excludes items with stockQuantity <= 0', async () => {
    const res = await fetchHardwareCatalog({ inStockOnly: true });
    assert.ok(res.items.length > 0);
    for (const item of res.items) {
      assert.ok(item.stockQuantity > 0, 'Item must be in stock');
    }
  });

  test('FE-05 Test 5: Pagination calculations (offset, page, limit, totalPages)', async () => {
    const limit = 3;
    const page1 = await fetchHardwareCatalog({ page: 1, limit });
    assert.strictEqual(page1.pagination.page, 1);
    assert.strictEqual(page1.pagination.limit, 3);
    assert.strictEqual(page1.items.length, 3);
    assert.ok(page1.pagination.totalPages >= 2);

    const page2 = await fetchHardwareCatalog({ page: 2, limit });
    assert.strictEqual(page2.pagination.page, 2);
    assert.notStrictEqual(page1.items[0].id, page2.items[0].id);
  });

  test('FE-05 Test 6: Selecting an item replaces existing slot item and updates compatibility', () => {
    const baseItems = MOCK_HARDWARE_CATALOG.filter((i) =>
      BUILD_PRESETS[0].itemIds.includes(i.id)
    );

    // Initial esport build is COMPATIBLE
    const initResult = compatibilityService.validateBuild(baseItems);
    assert.strictEqual(initResult.status, 'COMPATIBLE');

    // Simulate modal selection of incompatible CPU (AM5 Ryzen 7800X3D on B760 motherboard)
    const newCpu = MOCK_HARDWARE_CATALOG.find((i) => i.id === 'cpu-r7-7800x3d')!;
    assert.ok(newCpu);

    const updatedItems = [
      ...baseItems.filter((i) => i.categoryId !== HardwareCategory.CPU),
      newCpu,
    ];

    const updatedResult = compatibilityService.validateBuild(updatedItems);
    assert.strictEqual(updatedResult.status, 'INCOMPATIBLE');
    assert.ok(updatedResult.issues.some((iss) => iss.rule === 'SOCKET'));
  });
});

