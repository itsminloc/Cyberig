/**
 * CyberRig Hardware Storefront Static Catalog & Merchandising Metadata
 * Extracted per Single Responsibility Principle (SRP) for clean modular maintenance.
 */

export const FEATURED_CATEGORY_TILES = [
  { id: 'CPU', label: 'Vi xử lý CPU', badge: 'Gen 14 / AM5', img: '/assets/components/cpu-intel.jpg' },
  { id: 'GPU', label: 'Card đồ họa VGA', badge: 'RTX 40 Series', img: '/assets/components/gpu-rtx.jpg' },
  { id: 'MOTHERBOARD', label: 'Bo mạch chủ', badge: 'Z790 / B650', img: '/assets/components/mb-gaming.jpg' },
  { id: 'RAM', label: 'RAM DDR5', badge: '6000MHz+', img: '/assets/components/ram-rgb.jpg' },
  { id: 'STORAGE', label: 'Ổ cứng SSD', badge: 'PCIe Gen 4', img: '/assets/components/ssd-nvme.jpg' },
  { id: 'PSU', label: 'Nguồn máy tính', badge: '80+ Gold', img: '/assets/components/psu-modular.jpg' },
  { id: 'COOLER', label: 'Tản nhiệt AIO', badge: '360mm LCD', img: '/assets/components/cooler-aio.jpg' },
  { id: 'CASE', label: 'Vỏ Case PC', badge: 'Dual-Chamber', img: '/assets/components/case-chassis.jpg' },
  { id: 'EQUIPMENTS', label: 'Màn hình & Gear', badge: 'OLED 240Hz', img: '/assets/equipments/mon-asus-pg27aqdm.jpg', route: '/equipments' },
];

export const BRAND_FILTERS = ['ALL', 'ASUS', 'MSI', 'GIGABYTE', 'Intel', 'AMD', 'Corsair', 'Samsung', 'Kingston', 'NZXT'];

export const DEFAULT_HARDWARE_INVENTORY = [
  { id: 'cpu-i5-13600k', category: 'CPU', name: 'Intel Core i5-13600K (3.5GHz Turbo 5.1GHz / 14 Nhân 20 Luồng / LGA1700)', brand: 'Intel', price: 7690000, discountPct: 12, stockQuantity: 25, specs: { socket: 'LGA1700', tdpWatts: 125, cores: 14, boostClock: '5.1 GHz' } },
  { id: 'cpu-i7-14700k', category: 'CPU', name: 'Intel Core i7-14700K (3.4GHz Turbo 5.6GHz / 20 Nhân 28 Luồng / LGA1700)', brand: 'Intel', price: 11290000, discountPct: 10, stockQuantity: 18, specs: { socket: 'LGA1700', tdpWatts: 253, cores: 20, boostClock: '5.6 GHz' } },
  { id: 'cpu-i9-14900k', category: 'CPU', name: 'Intel Core i9-14900K (3.2GHz Turbo 6.0GHz / 24 Nhân 32 Luồng / LGA1700)', brand: 'Intel', price: 15490000, discountPct: 9, stockQuantity: 10, specs: { socket: 'LGA1700', tdpWatts: 253, cores: 24, boostClock: '6.0 GHz' } },
  { id: 'cpu-r7-7800x3d', category: 'CPU', name: 'AMD Ryzen 7 7800X3D (4.2GHz Turbo 5.0GHz / 8 Nhân 16 Luồng / AM5 3D V-Cache)', brand: 'AMD', price: 9990000, discountPct: 14, stockQuantity: 20, specs: { socket: 'AM5', tdpWatts: 120, cores: 8, boostClock: '5.0 GHz' } },
  { id: 'cpu-r5-7600x', category: 'CPU', name: 'AMD Ryzen 5 7600X (4.7GHz Turbo 5.3GHz / 6 Nhân 12 Luồng / AM5)', brand: 'AMD', price: 5690000, discountPct: 15, stockQuantity: 22, specs: { socket: 'AM5', tdpWatts: 105, cores: 6, boostClock: '5.3 GHz' } },
  { id: 'mb-b760-plus', category: 'MOTHERBOARD', name: 'ASUS TUF GAMING B760-PLUS WIFI DDR5 (Socket LGA1700 / ATX)', brand: 'ASUS', price: 4590000, discountPct: 11, stockQuantity: 18, specs: { socket: 'LGA1700', chipset: 'B760', formFactor: 'ATX', ramType: 'DDR5' } },
  { id: 'mb-z790-tomahawk', category: 'MOTHERBOARD', name: 'MSI MAG Z790 TOMAHAWK WIFI DDR5 (Socket LGA1700 / ATX)', brand: 'MSI', price: 7290000, discountPct: 10, stockQuantity: 14, specs: { socket: 'LGA1700', chipset: 'Z790', formFactor: 'ATX', ramType: 'DDR5' } },
  { id: 'mb-b650-tomahawk', category: 'MOTHERBOARD', name: 'MSI MAG B650 TOMAHAWK WIFI DDR5 (Socket AM5 / ATX)', brand: 'MSI', price: 5490000, discountPct: 12, stockQuantity: 22, specs: { socket: 'AM5', chipset: 'B650', formFactor: 'ATX', ramType: 'DDR5' } },
  { id: 'mb-b650e-strix', category: 'MOTHERBOARD', name: 'ASUS ROG STRIX B650E-F GAMING WIFI (Socket AM5 / PCIe 5.0)', brand: 'ASUS', price: 7890000, discountPct: 9, stockQuantity: 12, specs: { socket: 'AM5', chipset: 'B650E', formFactor: 'ATX', ramType: 'DDR5' } },
  { id: 'ram-corsair-ddr5-32', category: 'RAM', name: 'Corsair Vengeance RGB 32GB (2x16GB) DDR5 6000MHz CL30 Black', brand: 'Corsair', price: 3290000, discountPct: 13, stockQuantity: 40, specs: { generation: 'DDR5', capacityGb: 32, speedMhz: 6000, timing: 'CL30' } },
  { id: 'ram-gskill-ddr5-32', category: 'RAM', name: 'G.Skill Trident Z5 RGB 32GB (2x16GB) DDR5 6000MHz CL30', brand: 'G.Skill', price: 3490000, discountPct: 11, stockQuantity: 28, specs: { generation: 'DDR5', capacityGb: 32, speedMhz: 6000, timing: 'CL30' } },
  { id: 'ram-kingston-ddr4-16', category: 'RAM', name: 'Kingston Fury Beast RGB 16GB (2x8GB) DDR4 3200MHz', brand: 'Kingston', price: 1290000, discountPct: 16, stockQuantity: 50, specs: { generation: 'DDR4', capacityGb: 16, speedMhz: 3200, timing: 'CL16' } },
  { id: 'gpu-rtx-4060-msi', category: 'GPU', name: 'MSI GeForce RTX 4060 VENTUS 2X BLACK 8G OC GDDR6', brand: 'MSI', price: 8490000, discountPct: 12, stockQuantity: 28, specs: { lengthMm: 199, tdpWatts: 115, vramGb: 8 } },
  { id: 'gpu-rtx-4070-gigabyte', category: 'GPU', name: 'GIGABYTE GeForce RTX 4070 WINDFORCE OC 12G GDDR6X', brand: 'GIGABYTE', price: 16890000, discountPct: 14, stockQuantity: 15, specs: { lengthMm: 300, tdpWatts: 200, vramGb: 12 } },
  { id: 'gpu-rtx-4070ti-tuf', category: 'GPU', name: 'ASUS TUF Gaming GeForce RTX 4070 Ti SUPER 16GB OC', brand: 'ASUS', price: 23490000, discountPct: 10, stockQuantity: 10, specs: { lengthMm: 305, tdpWatts: 285, vramGb: 16 } },
  { id: 'gpu-rtx-4080-strix', category: 'GPU', name: 'ASUS ROG Strix GeForce RTX 4080 SUPER 16GB OC GDDR6X', brand: 'ASUS', price: 33990000, discountPct: 11, stockQuantity: 6, specs: { lengthMm: 357, tdpWatts: 320, vramGb: 16 } },
  { id: 'gpu-rtx-4090-strix', category: 'GPU', name: 'ASUS ROG Strix GeForce RTX 4090 OC Edition 24GB', brand: 'ASUS', price: 52900000, discountPct: 8, stockQuantity: 5, specs: { lengthMm: 358, tdpWatts: 450, vramGb: 24 } },
  { id: 'psu-corsair-rm750e', category: 'PSU', name: 'Corsair RM750e 750W 80 Plus Gold Fully Modular ATX 3.0', brand: 'Corsair', price: 2690000, discountPct: 12, stockQuantity: 30, specs: { wattage: 750, efficiencyRating: '80+ Gold', modularType: 'Full Modular' } },
  { id: 'psu-corsair-rm850e', category: 'PSU', name: 'Corsair RM850e 850W 80 Plus Gold ATX 3.0 PCIe 5.0', brand: 'Corsair', price: 3490000, discountPct: 10, stockQuantity: 20, specs: { wattage: 850, efficiencyRating: '80+ Gold', modularType: 'Full Modular' } },
  { id: 'cooler-ak620-digital', category: 'COOLER', name: 'DeepCool AK620 Digital Dual-Tower Air Cooler Màn Hình LED', brand: 'DeepCool', price: 1890000, discountPct: 15, stockQuantity: 25, specs: { type: 'AIR', coolerHeightMm: 162, supportedSockets: ['LGA1700', 'AM5'] } },
  { id: 'cooler-lt720-360', category: 'COOLER', name: 'DeepCool LT720 AIO 360mm High Performance Liquid Cooler', brand: 'DeepCool', price: 2890000, discountPct: 13, stockQuantity: 20, specs: { type: 'AIO 360', coolerHeightMm: 52, supportedSockets: ['LGA1700', 'AM5'] } },
  { id: 'case-nzxt-h6-flow', category: 'CASE', name: 'NZXT H6 Flow RGB Mid-Tower Dual-Chamber Tempered Glass', brand: 'NZXT', price: 3490000, discountPct: 11, stockQuantity: 18, specs: { maxGpuLengthMm: 350, maxCpuCoolerHeightMm: 165 } },
  { id: 'case-lianli-o11-evo', category: 'CASE', name: 'Lian Li O11 Dynamic EVO RGB Workstation Dual-Chamber', brand: 'Lian Li', price: 4290000, discountPct: 9, stockQuantity: 12, specs: { maxGpuLengthMm: 422, maxCpuCoolerHeightMm: 167 } },
  { id: 'ssd-samsung-990-pro-1tb', category: 'STORAGE', name: 'Samsung 990 PRO 1TB PCIe Gen 4.0 x4 M.2 NVMe (7450 MB/s)', brand: 'Samsung', price: 2990000, discountPct: 16, stockQuantity: 35, specs: { type: 'NVMe Gen4', capacityGb: 1000, readSpeedMbps: 7450 } },
  { id: 'ssd-samsung-990-pro-2tb', category: 'STORAGE', name: 'Samsung 990 PRO 2TB PCIe Gen 4.0 x4 M.2 NVMe (7450 MB/s)', brand: 'Samsung', price: 4990000, discountPct: 14, stockQuantity: 18, specs: { type: 'NVMe Gen4', capacityGb: 2000, readSpeedMbps: 7450 } },
];

export function getHardwareImage(item) {
  if (item.image) return item.image;
  const cat = (item.category || '').toUpperCase();
  const name = (item.name || '').toLowerCase();
  if (cat === 'CPU') return name.includes('intel') || name.includes('i5') || name.includes('i7') || name.includes('i9') ? '/assets/components/cpu-intel.jpg' : '/assets/components/cpu-amd.jpg';
  if (cat === 'MOTHERBOARD') return '/assets/components/mb-gaming.jpg';
  if (cat === 'RAM') return '/assets/components/ram-rgb.jpg';
  if (cat === 'GPU') return '/assets/components/gpu-rtx.jpg';
  if (cat === 'PSU') return '/assets/components/psu-modular.jpg';
  if (cat === 'COOLER') return '/assets/components/cooler-aio.jpg';
  if (cat === 'CASE') return '/assets/components/case-chassis.jpg';
  if (cat === 'STORAGE') return '/assets/components/ssd-nvme.jpg';
  return '/assets/components/cpu-intel.jpg';
}
