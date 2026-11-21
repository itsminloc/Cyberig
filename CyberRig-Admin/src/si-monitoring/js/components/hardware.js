/**
 * CyberRig Hardware Catalog Component
 * Fetches, searches, and filters hardware products with instantaneous response
 * and one-click seamless insertion into the PC Builder.
 */
import { navigateTo } from '../router.js';
import { getStoredBuild, setStoredBuild } from './builder.js';

export const CATEGORIES = [
  { id: 'ALL', label: 'TẤT CẢ' },
  { id: 'CPU', label: 'CPU' },
  { id: 'GPU', label: 'CARD ĐỒ HỌA (VGA)' },
  { id: 'MOTHERBOARD', label: 'BO MẠCH CHỦ' },
  { id: 'RAM', label: 'RAM' },
  { id: 'PSU', label: 'NGUỒN (PSU)' },
  { id: 'COOLER', label: 'TẢN NHIỆT' },
  { id: 'CASE', label: 'VỎ CASE' },
  { id: 'STORAGE', label: 'Ổ CỨNG SSD' }
];

export const DEFAULT_HARDWARE_INVENTORY = [
  // 1. CPU
  {
    id: 'cpu-i5-13600k',
    category: 'CPU',
    name: 'Intel Core i5-13600K (3.5GHz Turbo 5.1GHz / 14 Cores 20 Threads / LGA1700)',
    brand: 'Intel',
    price: 7690000,
    stockQuantity: 25,
    specs: { socket: 'LGA1700', tdpWatts: 125, cores: 14, threads: 20, boostClock: '5.1 GHz' }
  },
  {
    id: 'cpu-i7-14700k',
    category: 'CPU',
    name: 'Intel Core i7-14700K (3.4GHz Turbo 5.6GHz / 20 Cores 28 Threads / LGA1700)',
    brand: 'Intel',
    price: 11290000,
    stockQuantity: 18,
    specs: { socket: 'LGA1700', tdpWatts: 253, cores: 20, threads: 28, boostClock: '5.6 GHz' }
  },
  {
    id: 'cpu-i9-14900k',
    category: 'CPU',
    name: 'Intel Core i9-14900K (3.2GHz Turbo 6.0GHz / 24 Cores 32 Threads / LGA1700)',
    brand: 'Intel',
    price: 15490000,
    stockQuantity: 10,
    specs: { socket: 'LGA1700', tdpWatts: 253, cores: 24, threads: 32, boostClock: '6.0 GHz' }
  },
  {
    id: 'cpu-i5-14400f',
    category: 'CPU',
    name: 'Intel Core i5-14400F (2.5GHz Turbo 4.7GHz / 10 Cores 16 Threads / LGA1700)',
    brand: 'Intel',
    price: 5190000,
    stockQuantity: 30,
    specs: { socket: 'LGA1700', tdpWatts: 65, cores: 10, threads: 16, boostClock: '4.7 GHz' }
  },
  {
    id: 'cpu-r7-7800x3d',
    category: 'CPU',
    name: 'AMD Ryzen 7 7800X3D (4.2GHz Turbo 5.0GHz / 8 Cores 16 Threads / AM5)',
    brand: 'AMD',
    price: 9990000,
    stockQuantity: 20,
    specs: { socket: 'AM5', tdpWatts: 120, cores: 8, threads: 16, boostClock: '5.0 GHz' }
  },
  {
    id: 'cpu-r5-7600x',
    category: 'CPU',
    name: 'AMD Ryzen 5 7600X (4.7GHz Turbo 5.3GHz / 6 Cores 12 Threads / AM5)',
    brand: 'AMD',
    price: 5690000,
    stockQuantity: 22,
    specs: { socket: 'AM5', tdpWatts: 105, cores: 6, threads: 12, boostClock: '5.3 GHz' }
  },
  {
    id: 'cpu-r9-7950x',
    category: 'CPU',
    name: 'AMD Ryzen 9 7950X (4.5GHz Turbo 5.7GHz / 16 Cores 32 Threads / AM5)',
    brand: 'AMD',
    price: 14890000,
    stockQuantity: 8,
    specs: { socket: 'AM5', tdpWatts: 170, cores: 16, threads: 32, boostClock: '5.7 GHz' }
  },
  {
    id: 'cpu-r5-5600x',
    category: 'CPU',
    name: 'AMD Ryzen 5 5600X (3.7GHz Turbo 4.6GHz / 6 Cores 12 Threads / AM4)',
    brand: 'AMD',
    price: 3490000,
    stockQuantity: 15,
    specs: { socket: 'AM4', tdpWatts: 65, cores: 6, threads: 12, boostClock: '4.6 GHz' }
  },

  // 2. MOTHERBOARD
  {
    id: 'mb-b760-plus',
    category: 'MOTHERBOARD',
    name: 'ASUS TUF GAMING B760-PLUS WIFI DDR5 (Socket LGA1700 / ATX)',
    brand: 'ASUS',
    price: 4590000,
    stockQuantity: 18,
    specs: { socket: 'LGA1700', chipset: 'B760', formFactor: 'ATX', ramType: 'DDR5', ramSlots: 4 }
  },
  {
    id: 'mb-z790-tomahawk',
    category: 'MOTHERBOARD',
    name: 'MSI MAG Z790 TOMAHAWK WIFI DDR5 (Socket LGA1700 / ATX)',
    brand: 'MSI',
    price: 7290000,
    stockQuantity: 14,
    specs: { socket: 'LGA1700', chipset: 'Z790', formFactor: 'ATX', ramType: 'DDR5', ramSlots: 4 }
  },
  {
    id: 'mb-b760m-aorus',
    category: 'MOTHERBOARD',
    name: 'GIGABYTE B760M AORUS ELITE AX DDR5 (Socket LGA1700 / mATX)',
    brand: 'GIGABYTE',
    price: 3890000,
    stockQuantity: 20,
    specs: { socket: 'LGA1700', chipset: 'B760', formFactor: 'mATX', ramType: 'DDR5', ramSlots: 4 }
  },
  {
    id: 'mb-b650-tomahawk',
    category: 'MOTHERBOARD',
    name: 'MSI MAG B650 TOMAHAWK WIFI DDR5 (Socket AM5 / ATX)',
    brand: 'MSI',
    price: 5490000,
    stockQuantity: 22,
    specs: { socket: 'AM5', chipset: 'B650', formFactor: 'ATX', ramType: 'DDR5', ramSlots: 4 }
  },
  {
    id: 'mb-b650e-strix',
    category: 'MOTHERBOARD',
    name: 'ASUS ROG STRIX B650E-F GAMING WIFI (Socket AM5 / ATX)',
    brand: 'ASUS',
    price: 7890000,
    stockQuantity: 12,
    specs: { socket: 'AM5', chipset: 'B650E', formFactor: 'ATX', ramType: 'DDR5', ramSlots: 4 }
  },
  {
    id: 'mb-b650m-asrock',
    category: 'MOTHERBOARD',
    name: 'ASRock B650M Pro RS WiFi DDR5 (Socket AM5 / mATX)',
    brand: 'ASRock',
    price: 3690000,
    stockQuantity: 16,
    specs: { socket: 'AM5', chipset: 'B650', formFactor: 'mATX', ramType: 'DDR5', ramSlots: 4 }
  },
  {
    id: 'mb-b550-tomahawk',
    category: 'MOTHERBOARD',
    name: 'MSI MAG B550 TOMAHAWK MAX WIFI (Socket AM4 / ATX)',
    brand: 'MSI',
    price: 3290000,
    stockQuantity: 10,
    specs: { socket: 'AM4', chipset: 'B550', formFactor: 'ATX', ramType: 'DDR4', ramSlots: 4 }
  },

  // 3. RAM
  {
    id: 'ram-corsair-ddr5-32',
    category: 'RAM',
    name: 'Corsair Vengeance RGB 32GB (2x16GB) DDR5 6000MHz Black',
    brand: 'Corsair',
    price: 3290000,
    stockQuantity: 40,
    specs: { generation: 'DDR5', capacityGb: 32, modulesCount: 2, speedMhz: 6000, timing: 'CL30' }
  },
  {
    id: 'ram-corsair-ddr5-16',
    category: 'RAM',
    name: 'Corsair Vengeance 16GB (2x8GB) DDR5 5600MHz Black',
    brand: 'Corsair',
    price: 1890000,
    stockQuantity: 35,
    specs: { generation: 'DDR5', capacityGb: 16, modulesCount: 2, speedMhz: 5600, timing: 'CL36' }
  },
  {
    id: 'ram-corsair-ddr5-64',
    category: 'RAM',
    name: 'Corsair Vengeance 64GB (2x32GB) DDR5 6000MHz Black CL30',
    brand: 'Corsair',
    price: 6290000,
    stockQuantity: 15,
    specs: { generation: 'DDR5', capacityGb: 64, modulesCount: 2, speedMhz: 6000, timing: 'CL30' }
  },
  {
    id: 'ram-gskill-ddr5-32',
    category: 'RAM',
    name: 'G.Skill Trident Z5 RGB 32GB (2x16GB) DDR5 6000MHz CL30',
    brand: 'G.Skill',
    price: 3490000,
    stockQuantity: 28,
    specs: { generation: 'DDR5', capacityGb: 32, modulesCount: 2, speedMhz: 6000, timing: 'CL30' }
  },
  {
    id: 'ram-kingston-ddr5-32',
    category: 'RAM',
    name: 'Kingston Fury Beast RGB 32GB (2x16GB) DDR5 5600MHz',
    brand: 'Kingston',
    price: 2990000,
    stockQuantity: 30,
    specs: { generation: 'DDR5', capacityGb: 32, modulesCount: 2, speedMhz: 5600, timing: 'CL36' }
  },
  {
    id: 'ram-kingston-ddr4-16',
    category: 'RAM',
    name: 'Kingston Fury Beast RGB 16GB (2x8GB) DDR4 3200MHz',
    brand: 'Kingston',
    price: 1290000,
    stockQuantity: 50,
    specs: { generation: 'DDR4', capacityGb: 16, modulesCount: 2, speedMhz: 3200, timing: 'CL16' }
  },
  {
    id: 'ram-teamgroup-ddr5-32',
    category: 'RAM',
    name: 'TeamGroup T-Force Delta RGB 32GB (2x16GB) DDR5 6400MHz White',
    brand: 'TeamGroup',
    price: 3690000,
    stockQuantity: 18,
    specs: { generation: 'DDR5', capacityGb: 32, modulesCount: 2, speedMhz: 6400, timing: 'CL32' }
  },

  // 4. GPU
  {
    id: 'gpu-rtx-4060-msi',
    category: 'GPU',
    name: 'MSI GeForce RTX 4060 VENTUS 2X BLACK 8G OC (199mm / TDP 115W)',
    brand: 'MSI',
    price: 8490000,
    stockQuantity: 28,
    specs: { lengthMm: 199, tdpWatts: 115, recommendedPsuWatts: 550, vramGb: 8 }
  },
  {
    id: 'gpu-rtx-4060-gigabyte',
    category: 'GPU',
    name: 'Gigabyte GeForce RTX 4060 WINDFORCE OC 8GB (192mm / TDP 115W)',
    brand: 'Gigabyte',
    price: 7990000,
    stockQuantity: 32,
    specs: { lengthMm: 192, tdpWatts: 115, recommendedPsuWatts: 550, vramGb: 8 }
  },
  {
    id: 'gpu-rtx-4060ti-msi',
    category: 'GPU',
    name: 'MSI GeForce RTX 4060 Ti VENTUS 2X BLACK 16GB (199mm / TDP 165W)',
    brand: 'MSI',
    price: 12490000,
    stockQuantity: 18,
    specs: { lengthMm: 199, tdpWatts: 165, recommendedPsuWatts: 600, vramGb: 16 }
  },
  {
    id: 'gpu-rtx-4070-gigabyte',
    category: 'GPU',
    name: 'GIGABYTE GeForce RTX 4070 WINDFORCE OC 12G (300mm / TDP 200W)',
    brand: 'GIGABYTE',
    price: 16890000,
    stockQuantity: 15,
    specs: { lengthMm: 300, tdpWatts: 200, recommendedPsuWatts: 650, vramGb: 12 }
  },
  {
    id: 'gpu-rtx-4070ti-tuf',
    category: 'GPU',
    name: 'ASUS TUF Gaming GeForce RTX 4070 Ti SUPER 16GB (305mm / TDP 285W)',
    brand: 'ASUS',
    price: 23490000,
    stockQuantity: 10,
    specs: { lengthMm: 305, tdpWatts: 285, recommendedPsuWatts: 750, vramGb: 16 }
  },
  {
    id: 'gpu-rtx-4080-strix',
    category: 'GPU',
    name: 'ASUS ROG Strix GeForce RTX 4080 16GB OC GDDR6X (357mm / TDP 320W)',
    brand: 'ASUS',
    price: 33990000,
    stockQuantity: 6,
    specs: { lengthMm: 357, tdpWatts: 320, recommendedPsuWatts: 850, vramGb: 16 }
  },
  {
    id: 'gpu-rtx-4090-strix',
    category: 'GPU',
    name: 'ASUS ROG Strix GeForce RTX 4090 OC 24GB (358mm / TDP 450W)',
    brand: 'ASUS',
    price: 52900000,
    stockQuantity: 5,
    specs: { lengthMm: 358, tdpWatts: 450, recommendedPsuWatts: 1000, vramGb: 24 }
  },
  {
    id: 'gpu-rx-7800xt-sapphire',
    category: 'GPU',
    name: 'Sapphire Pulse AMD Radeon RX 7800 XT 16GB (280mm / TDP 263W)',
    brand: 'Sapphire',
    price: 14590000,
    stockQuantity: 12,
    specs: { lengthMm: 280, tdpWatts: 263, recommendedPsuWatts: 700, vramGb: 16 }
  },

  // 5. PSU
  {
    id: 'psu-pk650d',
    category: 'PSU',
    name: 'Deepcool PK650D 650W 80 Plus Bronze',
    brand: 'Deepcool',
    price: 1290000,
    stockQuantity: 40,
    specs: { wattage: 650, efficiencyRating: '80_PLUS_BRONZE', modularType: 'NON_MODULAR' }
  },
  {
    id: 'psu-corsair-rm750e',
    category: 'PSU',
    name: 'Corsair RM750e 750W 80 Plus Gold Fully Modular ATX 3.0',
    brand: 'Corsair',
    price: 2690000,
    stockQuantity: 30,
    specs: { wattage: 750, efficiencyRating: '80_PLUS_GOLD', modularType: 'FULL_MODULAR' }
  },
  {
    id: 'psu-corsair-rm850e',
    category: 'PSU',
    name: 'Corsair RM850e 850W 80 Plus Gold ATX 3.0 PCIe 5.0',
    brand: 'Corsair',
    price: 3490000,
    stockQuantity: 20,
    specs: { wattage: 850, efficiencyRating: '80_PLUS_GOLD', modularType: 'FULL_MODULAR' }
  },
  {
    id: 'psu-msi-a850gl',
    category: 'PSU',
    name: 'MSI MAG A850GL PCIE5 850W 80 Plus Gold Full Modular',
    brand: 'MSI',
    price: 3190000,
    stockQuantity: 18,
    specs: { wattage: 850, efficiencyRating: '80_PLUS_GOLD', modularType: 'FULL_MODULAR' }
  },
  {
    id: 'psu-seasonic-gx1000',
    category: 'PSU',
    name: 'Seasonic Focus GX-1000 1000W 80 Plus Gold ATX 3.0',
    brand: 'Seasonic',
    price: 4890000,
    stockQuantity: 10,
    specs: { wattage: 1000, efficiencyRating: '80_PLUS_GOLD', modularType: 'FULL_MODULAR' }
  },

  // 6. COOLER
  {
    id: 'cooler-thermalright-pa120',
    category: 'COOLER',
    name: 'Thermalright Peerless Assassin 120 SE Dual Tower Air Cooler',
    brand: 'Thermalright',
    price: 890000,
    stockQuantity: 45,
    specs: { type: 'AIR', coolerHeightMm: 155, supportedSockets: ['LGA1700', 'AM5', 'AM4'] }
  },
  {
    id: 'cooler-ak620-digital',
    category: 'COOLER',
    name: 'DeepCool AK620 Digital Air Cooler (Cao 162mm / Dual Tower LED)',
    brand: 'DeepCool',
    price: 1890000,
    stockQuantity: 25,
    specs: { type: 'AIR', coolerHeightMm: 162, supportedSockets: ['LGA1700', 'AM5'] }
  },
  {
    id: 'cooler-lt720-360',
    category: 'COOLER',
    name: 'Deepcool LT720 AIO 360mm High Performance Liquid Cooler',
    brand: 'Deepcool',
    price: 2890000,
    stockQuantity: 20,
    specs: { type: 'AIO', coolerHeightMm: 52, supportedSockets: ['LGA1700', 'AM5'] }
  },
  {
    id: 'cooler-nzxt-kraken-360',
    category: 'COOLER',
    name: 'NZXT Kraken 360 RGB AIO Liquid Cooler LCD Display',
    brand: 'NZXT',
    price: 5490000,
    stockQuantity: 12,
    specs: { type: 'AIO', coolerHeightMm: 55, supportedSockets: ['LGA1700', 'AM5'] }
  },
  {
    id: 'cooler-noctua-nh-d15',
    category: 'COOLER',
    name: 'Noctua NH-D15 chromax.black Dual Tower High-End Cooler',
    brand: 'Noctua',
    price: 2890000,
    stockQuantity: 15,
    specs: { type: 'AIR', coolerHeightMm: 165, supportedSockets: ['LGA1700', 'AM5'] }
  },

  // 7. CASE
  {
    id: 'case-montech-air100',
    category: 'CASE',
    name: 'Montech AIR 100 ARGB Black Mid Tower (4 Fan ARGB)',
    brand: 'Montech',
    price: 1190000,
    stockQuantity: 30,
    specs: { maxGpuLengthMm: 330, maxCpuCoolerHeightMm: 161 }
  },
  {
    id: 'case-nzxt-h6-flow',
    category: 'CASE',
    name: 'NZXT H6 Flow RGB Mid-Tower Dual-Chamber Black (GPU max 350mm)',
    brand: 'NZXT',
    price: 3490000,
    stockQuantity: 18,
    specs: { maxGpuLengthMm: 350, maxCpuCoolerHeightMm: 165 }
  },
  {
    id: 'case-lianli-o11-evo',
    category: 'CASE',
    name: 'Lian Li O11 Dynamic EVO RGB Black Workstation Glass Chassis',
    brand: 'Lian Li',
    price: 4290000,
    stockQuantity: 12,
    specs: { maxGpuLengthMm: 422, maxCpuCoolerHeightMm: 167 }
  },
  {
    id: 'case-fractal-pop-air',
    category: 'CASE',
    name: 'Fractal Design Pop Air Black Solid Silent Mid Tower',
    brand: 'Fractal Design',
    price: 2190000,
    stockQuantity: 15,
    specs: { maxGpuLengthMm: 405, maxCpuCoolerHeightMm: 170 }
  },
  {
    id: 'case-corsair-4000d',
    category: 'CASE',
    name: 'Corsair 4000D Airflow Tempered Glass Mid-Tower Black',
    brand: 'Corsair',
    price: 2090000,
    stockQuantity: 25,
    specs: { maxGpuLengthMm: 360, maxCpuCoolerHeightMm: 170 }
  },

  // 8. STORAGE
  {
    id: 'ssd-kingston-nv2-1tb',
    category: 'STORAGE',
    name: 'Kingston NV2 1TB PCIe 4.0 NVMe M.2 SSD (Read 3500 MB/s)',
    brand: 'Kingston',
    price: 1590000,
    stockQuantity: 40,
    specs: { type: 'NVME_M2', capacityGb: 1000, readSpeedMbps: 3500 }
  },
  {
    id: 'ssd-samsung-980-pro-1tb',
    category: 'STORAGE',
    name: 'Samsung 980 PRO 1TB PCIe 4.0 NVMe M.2 SSD (Read 7000 MB/s)',
    brand: 'Samsung',
    price: 2490000,
    stockQuantity: 30,
    specs: { type: 'NVME_M2', capacityGb: 1000, readSpeedMbps: 7000 }
  },
  {
    id: 'ssd-samsung-990-pro-1tb',
    category: 'STORAGE',
    name: 'Samsung 990 PRO 1TB PCIe Gen 4.0 x4 M.2 NVMe SSD (Read 7450 MB/s)',
    brand: 'Samsung',
    price: 2990000,
    stockQuantity: 35,
    specs: { type: 'NVME_M2', capacityGb: 1000, readSpeedMbps: 7450 }
  },
  {
    id: 'ssd-samsung-990-pro-2tb',
    category: 'STORAGE',
    name: 'Samsung 990 PRO 2TB PCIe Gen 4.0 x4 M.2 NVMe SSD (Read 7450 MB/s)',
    brand: 'Samsung',
    price: 4990000,
    stockQuantity: 18,
    specs: { type: 'NVME_M2', capacityGb: 2000, readSpeedMbps: 7450 }
  },
  {
    id: 'ssd-wd-sn850x-1tb',
    category: 'STORAGE',
    name: 'WD Black SN850X 1TB PCIe Gen 4.0 NVMe SSD (Read 7300 MB/s)',
    brand: 'Western Digital',
    price: 2690000,
    stockQuantity: 22,
    specs: { type: 'NVME_M2', capacityGb: 1000, readSpeedMbps: 7300 }
  }
];

function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export function getHardwareImage(item) {
  if (item.image) return item.image;
  const cat = (item.category || '').toUpperCase();
  const name = (item.name || '').toLowerCase();

  if (cat === 'CPU') {
    if (name.includes('intel') || name.includes('i5') || name.includes('i7') || name.includes('i9')) {
      return '/assets/components/cpu-intel.jpg';
    }
    return '/assets/components/cpu-amd.jpg';
  }
  if (cat === 'MOTHERBOARD') {
    return '/assets/components/mb-gaming.jpg';
  }
  if (cat === 'RAM') {
    return '/assets/components/ram-rgb.jpg';
  }
  if (cat === 'GPU') {
    return '/assets/components/gpu-rtx.jpg';
  }
  if (cat === 'PSU') {
    return '/assets/components/psu-modular.jpg';
  }
  if (cat === 'COOLER') {
    return '/assets/components/cooler-aio.jpg';
  }
  if (cat === 'CASE') {
    return '/assets/components/case-chassis.jpg';
  }
  if (cat === 'STORAGE') {
    return '/assets/components/ssd-nvme.jpg';
  }
  return '/assets/components/cpu-intel.jpg';
}

export async function renderHardware() {
  const container = document.getElementById('hardware-view');
  if (!container) return;

  const urlParams = new URLSearchParams(window.location.search);
  let currentCategory = urlParams.get('category') || 'ALL';
  let currentSearch = urlParams.get('search') || '';

  container.innerHTML = `
    <div class="hardware-shell">
      <div class="hw-header-group">
        <div class="hw-tagline">CYBERRIG HARDWARE LAB // INVENTORY CATALOG</div>
        <h1 class="hw-main-title">KHO LINH KIỆN PHẦN CỨNG TIÊU CHUẨN</h1>
        <p class="hw-subtext">Tra cứu thông số kỹ thuật, socket kết nối, điện áp và nạp linh kiện trực tiếp vào cấu hình PC Builder.</p>
      </div>

      <!-- Filter Controls Bar -->
      <div class="hw-controls-bar">
        <div class="hw-search-box">
          <input type="text" id="hw-search-input" class="hw-input" placeholder="Tìm tên linh kiện (RTX 4070, Ryzen 7, i5, DDR5, B760...)" value="${currentSearch}" />
          <button type="button" id="hw-search-btn" class="tech-btn tech-btn-accent tech-btn-sm">Tìm Kiếm</button>
        </div>
        <div class="hw-category-pills">
          ${CATEGORIES.map(cat => `
            <button type="button" class="hw-cat-pill ${cat.id === currentCategory ? 'is-active' : ''}" data-cat="${cat.id}">
              ${cat.label}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Live Results Info -->
      <div class="hw-info-banner" id="hw-results-info" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">
        <span id="hw-results-count">Đang nạp kho linh kiện...</span>
        <a href="/builder" class="tech-btn tech-btn-outline tech-btn-sm">
          &larr; Xem Cấu Hình Builder Đang Lắp
        </a>
      </div>

      <!-- Hardware Products Grid -->
      <div id="hw-products-root" class="hw-products-grid">
        <div class="hw-loading-state">Đang nạp dữ liệu linh kiện từ hệ thống kho CyberRig...</div>
      </div>
    </div>
  `;

  // Fetch or resolve items
  let allAvailableItems = [];
  try {
    const res = await fetch('/api/hardware?limit=100');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        allAvailableItems = data.data.map(d => ({
          id: d.id,
          category: d.categoryId || d.category,
          name: d.name,
          brand: d.brand,
          price: d.price,
          stockQuantity: d.stockQuantity,
          specs: typeof d.specs === 'string' ? JSON.parse(d.specs || '{}') : (d.specs || {})
        }));
      }
    }
  } catch (e) {
    console.warn('[Hardware Catalog] API offline, using robust client inventory catalog.');
  }

  // Merge with DEFAULT_HARDWARE_INVENTORY (deduplicate by id or name)
  const itemMap = new Map();
  DEFAULT_HARDWARE_INVENTORY.forEach(item => itemMap.set(item.id, item));
  allAvailableItems.forEach(item => itemMap.set(item.id, item));
  const fullCatalog = Array.from(itemMap.values());

  const searchInput = document.getElementById('hw-search-input');
  const searchBtn = document.getElementById('hw-search-btn');
  const root = document.getElementById('hw-products-root');
  const resultsCount = document.getElementById('hw-results-count');

  function renderFilteredGrid() {
    const term = searchInput.value.trim().toLowerCase();
    let filtered = fullCatalog;

    if (currentCategory && currentCategory !== 'ALL') {
      filtered = filtered.filter(item => (item.category || '').toUpperCase() === currentCategory.toUpperCase());
    }

    if (term) {
      filtered = filtered.filter(item => {
        const n = (item.name || '').toLowerCase();
        const b = (item.brand || '').toLowerCase();
        const s = typeof item.specs === 'object' ? JSON.stringify(item.specs).toLowerCase() : String(item.specs).toLowerCase();
        return n.includes(term) || b.includes(term) || s.includes(term);
      });
    }

    if (resultsCount) {
      resultsCount.textContent = `Hiển thị ${filtered.length} linh kiện tiêu chuẩn phù hợp`;
    }

    if (filtered.length === 0) {
      root.innerHTML = `
        <div class="hw-empty-state" style="grid-column: 1 / -1; padding: 48px; text-align: center;">
          <p style="font-size: 1.1rem; color: var(--text-muted); margin-bottom: 16px;">Không tìm thấy linh kiện phù hợp với từ khóa "${searchInput.value}".</p>
          <button type="button" class="tech-btn tech-btn-outline tech-btn-sm" id="hw-reset-filters">Xóa Bộ Lọc</button>
        </div>
      `;
      const resetBtn = document.getElementById('hw-reset-filters');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          searchInput.value = '';
          currentCategory = 'ALL';
          container.querySelectorAll('.hw-cat-pill').forEach(p => {
            p.classList.toggle('is-active', p.getAttribute('data-cat') === 'ALL');
          });
          renderFilteredGrid();
        });
      }
      return;
    }

    root.innerHTML = filtered.map(item => {
      const specsSummary = typeof item.specs === 'object' && item.specs !== null
        ? Object.entries(item.specs).slice(0, 4).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join('/') : v}`).join(' • ')
        : (item.specs || '');

      const socketVal = item.specs?.socket || (Array.isArray(item.specs?.supportedSockets) ? item.specs.supportedSockets.join('/') : undefined);
      const tdpVal = item.specs?.tdpWatts || item.specs?.tdp;
      const wattageVal = item.specs?.wattage;
      const imageUrl = getHardwareImage(item);

      return `
        <div class="hw-product-card" data-cat="${item.category}">
          <div class="hw-card-top">
            <span class="hw-cat-badge">${item.category || 'HARDWARE'}</span>
            <span class="hw-stock-badge in-stock">
              ${item.stockQuantity > 0 ? `Còn ${item.stockQuantity} sản phẩm` : 'Sẵn hàng tại Lab'}
            </span>
          </div>
          <div class="hw-card-thumb-wrap" style="position: relative; overflow: hidden;">
            <img src="${imageUrl}" alt="${item.name}" class="hw-card-thumb" loading="lazy" onerror="this.onerror=null; this.src='/assets/minimalist-pc-showcase.jpg';" />
            <span style="position: absolute; bottom: 8px; left: 8px; background: rgba(0, 0, 0, 0.75); color: #fff; font-family: var(--font-mono); font-size: 0.68rem; font-weight: 700; padding: 3px 8px; letter-spacing: 0.05em; text-transform: uppercase;">
              ${item.brand || item.category}
            </span>
          </div>
          <h3 class="hw-card-name">${item.name}</h3>
          <div class="hw-card-specs">${specsSummary}</div>
          <div class="hw-card-bottom">
            <div class="hw-card-price">${formatVND(item.price || 0)}</div>
            <button type="button" class="tech-btn tech-btn-accent tech-btn-sm hw-add-to-builder-btn" 
              data-item='${JSON.stringify({
                category: item.category,
                name: item.name,
                price: item.price,
                specs: specsSummary,
                socket: socketVal,
                tdp: tdpVal,
                wattage: wattageVal,
                image: imageUrl
              }).replace(/'/g, "&#39;")}'>
              + Chọn
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach Add to Builder listeners
    root.querySelectorAll('.hw-add-to-builder-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        try {
          const raw = btn.getAttribute('data-item');
          const newItem = JSON.parse(raw);
          const current = getStoredBuild().filter(i => i.category !== newItem.category);
          current.push(newItem);
          setStoredBuild(current);

          // Save toast feedback
          sessionStorage.setItem('cyberrig_builder_toast', JSON.stringify({
            message: `ĐÃ CHỌN: ${newItem.name} vào khoang ${newItem.category}!`,
            category: newItem.category
          }));

          navigateTo('/builder');
        } catch (err) {
          console.error('Error adding to builder:', err);
        }
      });
    });
  }

  // Live filter as user types
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderFilteredGrid();
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const params = new URLSearchParams();
        if (currentCategory && currentCategory !== 'ALL') params.set('category', currentCategory);
        if (searchInput.value.trim()) params.set('search', searchInput.value.trim());
        window.history.replaceState({}, '', `/hardware?${params.toString()}`);
        renderFilteredGrid();
      }
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      const params = new URLSearchParams();
      if (currentCategory && currentCategory !== 'ALL') params.set('category', currentCategory);
      if (searchInput.value.trim()) params.set('search', searchInput.value.trim());
      window.history.replaceState({}, '', `/hardware?${params.toString()}`);
      renderFilteredGrid();
    });
  }

  // Category pills live click
  container.querySelectorAll('.hw-cat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      currentCategory = pill.getAttribute('data-cat');
      container.querySelectorAll('.hw-cat-pill').forEach(p => p.classList.remove('is-active'));
      pill.classList.add('is-active');

      const params = new URLSearchParams();
      if (currentCategory && currentCategory !== 'ALL') params.set('category', currentCategory);
      if (searchInput.value.trim()) params.set('search', searchInput.value.trim());
      window.history.replaceState({}, '', `/hardware?${params.toString()}`);

      renderFilteredGrid();
    });
  });

  // Initial Grid Render
  renderFilteredGrid();
}
