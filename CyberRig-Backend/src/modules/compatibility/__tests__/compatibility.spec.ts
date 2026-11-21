/**
 * Unit Tests for Hardware Compatibility Engine
 * Covers:
 * - Case 1: Standard Compatible Build (i5 13600K + B760 DDR5 + RAM DDR5 + RTX 4070 + PSU 750W + Case 400mm)
 * - Case 2: Socket Mismatch (Ryzen 7 7800X3D AM5 + B760 LGA1700)
 * - Case 3: Insufficient Power (RTX 4070 200W + i5 13600K 125W + PSU 400W)
 * - Case 4: Dimension Clearance Conflict (GPU 340mm + Case 300mm)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { compatibilityService } from '../compatibility.service';
import { HardwareCategory, HardwareItem } from '../../hardware/hardware.model';

// Mock Fixtures
const cpu13600K: HardwareItem = {
  id: 'cpu-13600k',
  categoryId: HardwareCategory.CPU,
  name: 'Intel Core i5-13600K Processor',
  brand: 'Intel',
  model: 'BX8071513600K',
  price: 7690000,
  stockQuantity: 20,
  specs: {
    socket: 'LGA1700',
    tdpWatts: 125,
    cores: 14,
    threads: 20,
    baseClockGhz: 3.5,
    boostClockGhz: 5.1,
    integratedGpu: true,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const cpu7800X3D: HardwareItem = {
  id: 'cpu-7800x3d',
  categoryId: HardwareCategory.CPU,
  name: 'AMD Ryzen 7 7800X3D Processor',
  brand: 'AMD',
  model: '100-100000910WOF',
  price: 9990000,
  stockQuantity: 15,
  specs: {
    socket: 'AM5',
    tdpWatts: 120,
    cores: 8,
    threads: 16,
    baseClockGhz: 4.2,
    boostClockGhz: 5.0,
    integratedGpu: true,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mbB760Ddr5: HardwareItem = {
  id: 'mb-b760',
  categoryId: HardwareCategory.MOTHERBOARD,
  name: 'ASUS TUF GAMING B760-PLUS WIFI DDR5',
  brand: 'ASUS',
  model: 'TUF-B760-PLUS-WIFI',
  price: 4590000,
  stockQuantity: 18,
  specs: {
    socket: 'LGA1700',
    chipset: 'B760',
    formFactor: 'ATX',
    ramType: 'DDR5',
    ramSlots: 4,
    maxRamCapacityGb: 192,
    pcieSlots: 3,
    m2Slots: 3,
    sataPorts: 4,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const ram32GbDdr5: HardwareItem = {
  id: 'ram-32gb-ddr5',
  categoryId: HardwareCategory.RAM,
  name: 'Corsair Vengeance RGB 32GB (2x16GB) DDR5 6000MHz',
  brand: 'Corsair',
  model: 'CMH32GX5M2B6000C30',
  price: 3290000,
  stockQuantity: 30,
  specs: {
    generation: 'DDR5',
    capacityGb: 32,
    modulesCount: 2,
    speedMhz: 6000,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const ram16GbDdr4: HardwareItem = {
  id: 'ram-16gb-ddr4',
  categoryId: HardwareCategory.RAM,
  name: 'Kingston FURY Beast 16GB DDR4 3200MHz',
  brand: 'Kingston',
  model: 'KF432C16BB/16',
  price: 1090000,
  stockQuantity: 40,
  specs: {
    generation: 'DDR4',
    capacityGb: 16,
    modulesCount: 1,
    speedMhz: 3200,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const gpuRtx4070: HardwareItem = {
  id: 'gpu-rtx-4070',
  categoryId: HardwareCategory.GPU,
  name: 'GIGABYTE GeForce RTX 4070 WINDFORCE OC 12G',
  brand: 'GIGABYTE',
  model: 'GV-N4070WF3OC-12GD',
  price: 16890000,
  stockQuantity: 12,
  specs: {
    lengthMm: 300,
    tdpWatts: 200,
    recommendedPsuWatts: 650,
    pcieGeneration: 'PCIe 4.0',
    powerConnectors: ['8-pin'],
    vramGb: 12,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const gpuLong340mm: HardwareItem = {
  id: 'gpu-long-340mm',
  categoryId: HardwareCategory.GPU,
  name: 'ASUS ROG Strix GeForce RTX 4090 OC 24GB',
  brand: 'ASUS',
  model: 'ROG-STRIX-RTX4090-O24G-GAMING',
  price: 52990000,
  stockQuantity: 5,
  specs: {
    lengthMm: 340,
    tdpWatts: 450,
    recommendedPsuWatts: 1000,
    pcieGeneration: 'PCIe 4.0',
    powerConnectors: ['16-pin'],
    vramGb: 24,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const psu750W: HardwareItem = {
  id: 'psu-750w',
  categoryId: HardwareCategory.PSU,
  name: 'Corsair RM750e 750W 80 Plus Gold Fully Modular',
  brand: 'Corsair',
  model: 'CP-9020262-NA',
  price: 2690000,
  stockQuantity: 25,
  specs: {
    wattage: 750,
    efficiencyRating: '80_PLUS_GOLD',
    modularType: 'FULL_MODULAR',
    pcie16PinPresent: true,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const psu400W: HardwareItem = {
  id: 'psu-400w',
  categoryId: HardwareCategory.PSU,
  name: 'Cooler Master Elite V3 400W',
  brand: 'Cooler Master',
  model: 'MPW-4001-ACABN1',
  price: 790000,
  stockQuantity: 10,
  specs: {
    wattage: 400,
    efficiencyRating: '80_PLUS_BRONZE',
    modularType: 'NON_MODULAR',
    pcie16PinPresent: false,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const case400mm: HardwareItem = {
  id: 'case-400mm',
  categoryId: HardwareCategory.CASE,
  name: 'NZXT H6 Flow RGB Mid-Tower Dual-Chamber',
  brand: 'NZXT',
  model: 'CC-H61FB-R1',
  price: 3490000,
  stockQuantity: 15,
  specs: {
    formFactorSupport: ['ATX', 'Micro-ATX', 'Mini-ITX'],
    maxGpuLengthMm: 400,
    maxCpuCoolerHeightMm: 165,
    supportedRadiators: ['360mm', '280mm', '240mm'],
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const caseCompact300mm: HardwareItem = {
  id: 'case-compact-300mm',
  categoryId: HardwareCategory.CASE,
  name: 'Jonsbo C6 Mini-ITX/mATX Mesh Case',
  brand: 'Jonsbo',
  model: 'JONSBO-C6-BLACK',
  price: 990000,
  stockQuantity: 8,
  specs: {
    formFactorSupport: ['Micro-ATX', 'Mini-ITX'],
    maxGpuLengthMm: 300,
    maxCpuCoolerHeightMm: 75,
    supportedRadiators: [],
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Hardware Compatibility Engine (BE-04)', () => {
  it('Case 1 (Chuẩn): i5 13600K + B760 DDR5 + RAM DDR5 + RTX 4070 + Nguồn 750W + Case 400mm -> COMPATIBLE', () => {
    const buildItems: HardwareItem[] = [
      cpu13600K,
      mbB760Ddr5,
      ram32GbDdr5,
      gpuRtx4070,
      psu750W,
      case400mm,
    ];

    const result = compatibilityService.validateBuild(buildItems);

    assert.strictEqual(result.status, 'COMPATIBLE');
    assert.strictEqual(result.issues.length, 0);

    // Wattage = 125 (CPU) + 200 (GPU) + 50 (MB) + 50 (Other) = 425W
    assert.strictEqual(result.totalEstimatedWattage, 425);
    // Recommended PSU = ceil(425 * 1.25 / 50) * 50 = ceil(531.25 / 50) * 50 = 550W
    assert.strictEqual(result.recommendedPsuWattage, 550);
  });

  it('Case 2 (Lệch Socket): CPU Ryzen 7 7800X3D (AM5) + Mainboard B760 (LGA1700) -> INCOMPATIBLE', () => {
    const buildItems: HardwareItem[] = [
      cpu7800X3D, // AM5
      mbB760Ddr5, // LGA1700
      ram32GbDdr5,
      gpuRtx4070,
      psu750W,
      case400mm,
    ];

    const result = compatibilityService.validateBuild(buildItems);

    assert.strictEqual(result.status, 'INCOMPATIBLE');

    const socketError = result.issues.find(
      (issue) => issue.rule === 'SOCKET' && issue.type === 'ERROR'
    );
    assert.ok(socketError, 'Phải có lỗi tương thích Socket');
    assert.match(socketError.message, /AM5/i);
    assert.match(socketError.message, /LGA1700/i);
  });

  it('Case 3 (Thiếu Nguồn): RTX 4070 (200W) + i5 13600K (125W) + Nguồn 400W -> INCOMPATIBLE', () => {
    const buildItems: HardwareItem[] = [
      cpu13600K,   // 125W
      mbB760Ddr5,  // 50W
      ram32GbDdr5,
      gpuRtx4070,  // 200W
      psu400W,     // 400W < 425W Total
      case400mm,
    ];

    const result = compatibilityService.validateBuild(buildItems);

    assert.strictEqual(result.status, 'INCOMPATIBLE');

    const powerError = result.issues.find(
      (issue) => issue.rule === 'POWER' && issue.type === 'ERROR'
    );
    assert.ok(powerError, 'Phải có lỗi công suất nguồn không đủ đáp ứng hệ thống');
    assert.match(powerError.message, /400W/);
    assert.match(powerError.message, /425W/);
  });

  it('Case 4 (Cấn Kích Thước): GPU dài 340mm + Case hỗ trợ tối đa 300mm -> INCOMPATIBLE', () => {
    const buildItems: HardwareItem[] = [
      cpu13600K,
      mbB760Ddr5,
      ram32GbDdr5,
      gpuLong340mm,       // Dài 340mm
      psu750W,
      caseCompact300mm,   // Max GPU 300mm (an toàn: 290mm)
    ];

    const result = compatibilityService.validateBuild(buildItems);

    assert.strictEqual(result.status, 'INCOMPATIBLE');

    const clearanceError = result.issues.find(
      (issue) => issue.rule === 'CLEARANCE' && issue.type === 'ERROR'
    );
    assert.ok(clearanceError, 'Phải có lỗi cấn chiều dài card đồ họa');
    assert.match(clearanceError.message, /340mm/);
    assert.match(clearanceError.message, /300mm/);
  });

  it('Bonus Case (Lệch chuẩn RAM): RAM DDR4 trên Mainboard DDR5 -> INCOMPATIBLE', () => {
    const buildItems: HardwareItem[] = [
      cpu13600K,
      mbB760Ddr5,   // Khe DDR5
      ram16GbDdr4,  // Chuẩn DDR4
      gpuRtx4070,
      psu750W,
      case400mm,
    ];

    const result = compatibilityService.validateBuild(buildItems);

    assert.strictEqual(result.status, 'INCOMPATIBLE');
    const ramError = result.issues.find(
      (issue) => issue.rule === 'RAM' && issue.type === 'ERROR'
    );
    assert.ok(ramError, 'Phải có lỗi lệch chuẩn thế hệ RAM DDR4 vs DDR5');
  });
});
