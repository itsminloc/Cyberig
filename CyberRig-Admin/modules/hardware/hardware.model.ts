/**
 * Hardware Domain Model & Types
 * Aligned with docs/DATABASE-SCHEMA.md
 */

export enum HardwareCategory {
  CPU = 'CPU',
  MOTHERBOARD = 'MOTHERBOARD',
  RAM = 'RAM',
  GPU = 'GPU',
  STORAGE = 'STORAGE',
  PSU = 'PSU',
  CASE = 'CASE',
  COOLER = 'COOLER',
}

export interface HardwareItem {
  id: string;
  categoryId: HardwareCategory;
  name: string;
  brand: string;
  model: string;
  price: number;
  stockQuantity: number;
  specs: HardwareSpecs;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Raw Database Row Structure for `hardware_items` table
 */
export interface HardwareItemRow {
  id: string;
  category_id: string;
  name: string;
  brand: string;
  model: string;
  price: string | number;
  stock_quantity: number;
  specs: string | HardwareSpecs;
  is_active?: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export type HardwareSpecs =
  | CpuSpecs
  | MotherboardSpecs
  | RamSpecs
  | GpuSpecs
  | PsuSpecs
  | CaseSpecs
  | CoolerSpecs
  | StorageSpecs
  | Record<string, unknown>;

export interface CpuSpecs {
  socket: string; // e.g. 'LGA1700', 'AM5'
  tdpWatts: number;
  cores: number;
  threads: number;
  baseClockGhz: number;
  boostClockGhz: number;
  integratedGpu: boolean;
  pcieGen?: number;
}

export interface MotherboardSpecs {
  socket: string;
  chipset: string; // e.g. 'B760', 'Z790', 'B650'
  formFactor: 'ATX' | 'Micro-ATX' | 'Mini-ITX' | 'E-ATX';
  ramType: 'DDR4' | 'DDR5';
  ramSlots: number;
  maxRamCapacityGb: number;
  pcieSlots: number;
  m2Slots: number;
  sataPorts: number;
}

export interface RamSpecs {
  generation: 'DDR4' | 'DDR5';
  capacityGb: number;
  modulesCount: number; // e.g. 2 for 2x16GB kit
  speedMhz: number;
}

export interface GpuSpecs {
  lengthMm: number;
  tdpWatts: number;
  recommendedPsuWatts: number;
  pcieGeneration: string;
  powerConnectors: string[]; // e.g. ['8-pin'], ['16-pin 12VHPWR']
  vramGb: number;
}

export interface PsuSpecs {
  wattage: number;
  efficiencyRating: '80_PLUS_BRONZE' | '80_PLUS_GOLD' | '80_PLUS_PLATINUM' | '80_PLUS_TITANIUM';
  modularType: 'NON_MODULAR' | 'SEMI_MODULAR' | 'FULL_MODULAR';
  pcie16PinPresent: boolean;
}

export interface CaseSpecs {
  formFactorSupport: ('ATX' | 'Micro-ATX' | 'Mini-ITX')[];
  maxGpuLengthMm: number;
  maxCpuCoolerHeightMm: number;
  supportedRadiators: string[]; // e.g. ['240mm', '360mm']
}

export interface CoolerSpecs {
  type: 'AIR' | 'AIO';
  supportedSockets: string[];
  radiatorSizeMm?: number; // For AIO (e.g. 240, 360)
  coolerHeightMm?: number; // For Air cooler (e.g. 158mm)
  tdpRatingWatts?: number;
}

export interface StorageSpecs {
  type: 'NVME_M2' | 'SATA_SSD' | 'SATA_HDD';
  capacityGb: number;
  readSpeedMbps?: number;
}

/**
 * Mapper: Converts database row to domain HardwareItem
 */
export function toDomainHardwareItem(row: HardwareItemRow): HardwareItem {
  return {
    id: row.id,
    categoryId: row.category_id as HardwareCategory,
    name: row.name,
    brand: row.brand,
    model: row.model,
    price: typeof row.price === 'string' ? parseFloat(row.price) : Number(row.price),
    stockQuantity: Number(row.stock_quantity),
    specs: typeof row.specs === 'string' ? JSON.parse(row.specs) : row.specs,
    isActive: row.is_active !== false,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}
