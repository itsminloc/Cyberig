/**
 * CyberRig PC Builder Component
 * Manages configuration state, preset loading, live compatibility evaluation, and slot interactions.
 * Professional Architectural High-Tech Design (Icon-free, Precision Typography)
 */
import { ACCESS_KEY } from '../config.js';
import { navigateTo } from '../router.js';
import { showStorefrontToast, requireLoginModal } from '../ui-feedback.js';
import { openSimTestModal } from './modals.js';

export const BUILDER_SLOTS_DEF = [
  {
    category: 'CPU',
    index: '01',
    code: 'CPU',
    name: 'BỘ VI XỬ LÝ (CPU)',
    tag: 'CORE ARCHITECTURE',
    desc: 'Trái tim xử lý tính toán, quyết định chuẩn socket chân cắm và phân luồng tác vụ hệ thống'
  },
  {
    category: 'MOTHERBOARD',
    index: '02',
    code: 'MAINBOARD',
    name: 'BO MẠCH CHỦ (MAINBOARD)',
    tag: 'SYSTEM BUS PLATFORM',
    desc: 'Nền tảng kết nối toàn diện, điều phối bus RAM DDR5, băng thông PCIe Gen 5.0 và cấp nguồn VRM'
  },
  {
    category: 'RAM',
    index: '03',
    code: 'RAM DDR5',
    name: 'BỘ NHỚ TRONG (RAM)',
    tag: 'DATA BUFFER',
    desc: 'Bộ nhớ đệm tốc độ cao phục vụ xử lý đa nhiệm, load assets đồ họa và tối ưu phản hồi tức thì'
  },
  {
    category: 'GPU',
    index: '04',
    code: 'VGA / GPU',
    name: 'CARD ĐỒ HỌA (VGA / GPU)',
    tag: 'GRAPHICS ENGINE',
    desc: 'Card đồ họa rời chuyên biệt cho gaming độ phân giải cao 2K/4K, Ray Tracing và tăng tốc render 3D'
  },
  {
    category: 'PSU',
    index: '05',
    code: 'PSU',
    name: 'NGUỒN MÁY TÍNH (PSU)',
    tag: 'POWER MATRIX',
    desc: 'Bộ cấp nguồn công suất thực chuẩn 80 Plus đảm bảo cấp điện áp ổn định với biên dự phòng an toàn'
  },
  {
    category: 'COOLER',
    index: '06',
    code: 'COOLING',
    name: 'TẢN NHIỆT (COOLER)',
    tag: 'THERMAL REGULATION',
    desc: 'Tản nhiệt khí tháp đôi hoặc tản nhiệt nước AIO 360mm giải phóng nhiệt lượng và giữ xung nhịp ổn định'
  },
  {
    category: 'CASE',
    index: '07',
    code: 'CHASSIS',
    name: 'VỎ MÁY TÍNH (CASE)',
    tag: 'ENCLOSURE & AIRFLOW',
    desc: 'Khung vỏ bảo vệ buồng nhiệt kép Dual-Chamber, định hướng luồng gió đối lưu và tương thích chiều dài VGA'
  },
  {
    category: 'STORAGE',
    index: '08',
    code: 'NVMe SSD',
    name: 'Ổ CỨNG LƯU TRỮ (SSD / HDD)',
    tag: 'NVMe STORAGE BUS',
    desc: 'Ổ lưu trữ thể rắn NVMe chuẩn PCIe Gen 4/5 tốc độ đọc/ghi dữ liệu siêu tốc, tối ưu thời gian khởi động'
  }
];

export const PRESET_CATALOG = {
  'fps-competitive': {
    id: 'fps-competitive',
    name: 'FPS Competitive',
    badge: 'Esports & FPS 240Hz+',
    price: 22800000,
    items: [
      { id: 'cpu-i5-13600k', category: 'CPU', name: 'Intel Core i5-13600K', price: 7690000, specs: 'LGA1700 • 14C/20T • 125W TDP', socket: 'LGA1700', tdp: 125 },
      { id: 'mb-b760-plus', category: 'MOTHERBOARD', name: 'ASUS TUF Gaming B760-PLUS WIFI', price: 4490000, specs: 'LGA1700 • ATX • 4x DDR5 • PCIe 5.0', socket: 'LGA1700' },
      { id: 'ram-corsair-16gb', category: 'RAM', name: 'Corsair Vengeance 16GB (2x8GB) DDR5 5600MHz', price: 1890000, specs: '16GB (2x8GB) • DDR5 • 5600MHz CL36' },
      { id: 'gpu-rtx-4060-msi', category: 'GPU', name: 'Gigabyte GeForce RTX 4060 WINDFORCE OC 8GB', price: 7990000, specs: '8GB GDDR6 • PCIe 4.0 • 115W TDP • 192mm', tdp: 115 },
      { id: 'psu-deepcool-650w', category: 'PSU', name: 'Deepcool PK650D 650W 80 Plus Bronze', price: 1290000, specs: '650W • 80 Plus Bronze • Chuẩn ATX', wattage: 650 },
      { id: 'cooler-ak620', category: 'COOLER', name: 'Thermalright Peerless Assassin 120 SE', price: 890000, specs: 'Tháp đôi 6 ống đồng • Tản khí hiệu năng cao' },
      { id: 'case-montech-100', category: 'CASE', name: 'Montech AIR 100 ARGB Black', price: 1190000, specs: 'Mid Tower • Mặt lưới thoáng • 4 Fan ARGB' },
      { id: 'ssd-kingston-1tb', category: 'STORAGE', name: 'Kingston NV2 1TB PCIe 4.0 NVMe M.2 SSD', price: 1590000, specs: '1TB • NVMe PCIe Gen 4.0 • Đọc 3500 MB/s' }
    ]
  },
  'aaa-gaming': {
    id: 'aaa-gaming',
    name: 'AAA Gaming & MOBA',
    badge: 'Ray Tracing 2K/4K',
    price: 44500000,
    items: [
      { id: 'cpu-r7-7800x3d', category: 'CPU', name: 'AMD Ryzen 7 7800X3D', price: 10990000, specs: 'AM5 • 8C/16T • 3D V-Cache • 120W TDP', socket: 'AM5', tdp: 120 },
      { id: 'mb-b650-tomahawk', category: 'MOTHERBOARD', name: 'MSI MAG B650 TOMAHAWK WIFI', price: 5490000, specs: 'AM5 • ATX • 4x DDR5 • PCIe 4.0/5.0', socket: 'AM5' },
      { id: 'ram-gskill-32gb', category: 'RAM', name: 'G.Skill Trident Z5 RGB 32GB (2x16GB) DDR5 6000MHz', price: 3490000, specs: '32GB (2x16GB) • DDR5 • 6000MHz CL30' },
      { id: 'gpu-rtx-4070ti-tuf', category: 'GPU', name: 'ASUS TUF Gaming RTX 4070 Ti SUPER 16GB', price: 23490000, specs: '16GB GDDR6X • PCIe 4.0 • 285W TDP • 305mm', tdp: 285 },
      { id: 'psu-corsair-750w', category: 'PSU', name: 'Corsair RM750e 750W 80 Plus Gold ATX 3.0', price: 2890000, specs: '750W • 80 Plus Gold • PCIe 5.0 ATX 3.0', wattage: 750 },
      { id: 'cooler-lt720', category: 'COOLER', name: 'Deepcool LT720 AIO 360mm High Performance', price: 2890000, specs: 'Tản nước AIO 360mm • Pump thế hệ 4' },
      { id: 'case-nzxt-h6', category: 'CASE', name: 'NZXT H6 Flow RGB Dual-Chamber Black', price: 3290000, specs: 'Dual-Chamber • Kính vát góc • Tối ưu luồng gió' },
      { id: 'ssd-samsung-990pro-1tb', category: 'STORAGE', name: 'Samsung 990 PRO 1TB PCIe Gen 4.0 NVMe', price: 2990000, specs: '1TB • NVMe PCIe Gen 4.0 • Đọc 7450 MB/s' }
    ]
  },
  'creator-3d': {
    id: 'creator-3d',
    name: 'Editor & Render 3D',
    badge: 'Đồ họa & Kiến trúc',
    price: 69800000,
    items: [
      { id: 'cpu-i7-14700k', category: 'CPU', name: 'Intel Core i7-14700K', price: 11290000, specs: 'LGA1700 • 20C/28T • 253W Max TDP', socket: 'LGA1700', tdp: 253 },
      { id: 'mb-z790-tomahawk', category: 'MOTHERBOARD', name: 'MSI MAG Z790 TOMAHAWK MAX WIFI', price: 7490000, specs: 'LGA1700 • ATX • 4x DDR5 • Wi-Fi 7', socket: 'LGA1700' },
      { id: 'ram-corsair-64gb', category: 'RAM', name: 'Corsair Vengeance 64GB (2x32GB) DDR5 6000MHz', price: 6290000, specs: '64GB (2x32GB) • DDR5 • 6000MHz CL30' },
      { id: 'gpu-rtx-4080-rog', category: 'GPU', name: 'ASUS ROG Strix GeForce RTX 4080 16GB OC', price: 33990000, specs: '16GB GDDR6X • PCIe 4.0 • 320W TDP • 357mm', tdp: 320 },
      { id: 'psu-corsair-850w', category: 'PSU', name: 'Corsair RM850e 850W 80 Plus Gold ATX 3.0', price: 3490000, specs: '850W • 80 Plus Gold • Chuẩn PCIe 5.0', wattage: 850 },
      { id: 'cooler-kraken-360', category: 'COOLER', name: 'NZXT Kraken 360 RGB AIO Liquid Cooler', price: 5490000, specs: 'Tản nước 360mm • Màn hình LCD hiển thị nhiệt độ' },
      { id: 'case-o11-evo', category: 'CASE', name: 'Lian Li O11 Dynamic EVO RGB Black', price: 4290000, specs: 'Workstation Glass Chassis • Dải LED RGB kép' },
      { id: 'ssd-samsung-990pro-2tb', category: 'STORAGE', name: 'Samsung 990 PRO 2TB PCIe Gen 4.0 NVMe', price: 4990000, specs: '2TB • NVMe PCIe Gen 4.0 • Đọc 7450 MB/s' }
    ]
  },
  'autocad-engineering': {
    id: 'autocad-engineering',
    name: 'AutoCAD & Kỹ thuật',
    badge: 'Kỹ thuật & Mô phỏng',
    price: 29500000,
    items: [
      { id: 'cpu-i5-13600k', category: 'CPU', name: 'Intel Core i5-13600K', price: 7690000, specs: 'LGA1700 • 14C/20T • 125W TDP', socket: 'LGA1700', tdp: 125 },
      { id: 'mb-b760-plus', category: 'MOTHERBOARD', name: 'ASUS TUF Gaming B760-PLUS WIFI', price: 4490000, specs: 'LGA1700 • ATX • 4x DDR5 • PCIe 5.0', socket: 'LGA1700' },
      { id: 'ram-gskill-32gb', category: 'RAM', name: 'Kingston Fury Beast 32GB (2x16GB) DDR5 5600MHz', price: 2990000, specs: '32GB (2x16GB) • DDR5 • 5600MHz CL36' },
      { id: 'gpu-rtx-4060-msi', category: 'GPU', name: 'MSI GeForce RTX 4060 Ti VENTUS 2X BLACK 16GB', price: 12490000, specs: '16GB VRAM GDDR6 • Chuyên CAD/Revit/3dsMax', tdp: 165 },
      { id: 'psu-corsair-750w', category: 'PSU', name: 'Corsair RM750e 750W 80 Plus Gold', price: 2890000, specs: '750W • 80 Plus Gold • Chuẩn ATX', wattage: 750 },
      { id: 'cooler-ak620', category: 'COOLER', name: 'Deepcool AK620 Digital Air Cooler', price: 1790000, specs: 'Tháp đôi 6 ống đồng • Màn hình LED nhiệt độ' },
      { id: 'case-montech-100', category: 'CASE', name: 'Fractal Design Pop Air Black Solid', price: 2190000, specs: 'Mid Tower • Cách âm & Tản nhiệt tối ưu' },
      { id: 'ssd-kingston-1tb', category: 'STORAGE', name: 'Samsung 980 PRO 1TB PCIe 4.0 NVMe', price: 2490000, specs: '1TB • NVMe PCIe Gen 4.0 • Đọc 7000 MB/s' }
    ]
  }
};


const BUILD_STORAGE_KEY = 'cyberrig_builder_items';

export function getStoredBuild() {
  try {
    const raw = localStorage.getItem(BUILD_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function setStoredBuild(items) {
  try {
    localStorage.setItem(BUILD_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {}
}

export function loadPreset(presetId) {
  const preset = PRESET_CATALOG[presetId];
  if (preset) {
    setStoredBuild(preset.items);
  }
}

export function clearBuild() {
  setStoredBuild([]);
}

function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function renderSpecChips(specsStr) {
  if (!specsStr) return '';
  const parts = specsStr.split(/[•,]/).map(s => s.trim()).filter(Boolean);
  return parts.map(part => `<span class="slot-spec-chip">${part}</span>`).join('');
}

export function renderBuilder() {
  const container = document.getElementById('builder-view');
  if (!container) return;

  const items = getStoredBuild();
  const itemMap = {};
  items.forEach(i => { itemMap[i.category] = i; });

  const cpu = itemMap['CPU'];
  const mb = itemMap['MOTHERBOARD'];
  const psu = itemMap['PSU'];
  const gpu = itemMap['GPU'];
  const ram = itemMap['RAM'];
  const cooler = itemMap['COOLER'];
  const caseItem = itemMap['CASE'];
  const storage = itemMap['STORAGE'];

  // Check incoming toast from Hardware Catalog
  const toastRaw = sessionStorage.getItem('cyberrig_builder_toast');
  let toastData = null;
  if (toastRaw) {
    try {
      toastData = JSON.parse(toastRaw);
      sessionStorage.removeItem('cyberrig_builder_toast');
    } catch (e) {}
  }

  // Progressive Compatibility Engine Calculation
  let percent = 0;
  let compatMsg = '';
  let compatClass = 'is-compatible';

  if (items.length === 0) {
    percent = 0;
    compatClass = 'is-empty';
    compatMsg = '[ CHƯA CÓ LINH KIỆN ] Vui lòng chọn linh kiện hoặc nạp 1 trong 4 cấu hình mẫu để thẩm định';
  } else if (cpu && !mb) {
    percent = 35;
    compatClass = 'is-partial';
    compatMsg = `[ ĐÃ CHỌN CPU ${cpu.socket || ''} ] ${cpu.name} — Hãy chọn tiếp Bo Mạch Chủ để kiểm tra socket!`;
  } else if (!cpu && mb) {
    percent = 35;
    compatClass = 'is-partial';
    compatMsg = `[ ĐÃ CHỌN BO MẠCH CHỦ ${mb.socket || ''} ] ${mb.name} — Hãy chọn tiếp CPU để kiểm tra socket!`;
  } else if (cpu && mb && cpu.socket && mb.socket && cpu.socket !== mb.socket) {
    percent = 40;
    compatClass = 'is-conflict';
    compatMsg = `[ XUNG ĐỘT SOCKET ] CPU (${cpu.socket}) KHÔNG tương thích với Bo Mạch Chủ (${mb.socket})!`;
  } else {
    // Sockets match!
    let score = 0;
    if (cpu && mb) score += 60;
    else score += 30;

    if (ram) score += 10;
    if (gpu) score += 10;
    if (psu) {
      const estimatedTdp = (cpu?.tdp || 65) + (gpu?.tdp || 120) + 75;
      const recWattage = Math.ceil((estimatedTdp * 1.25) / 50) * 50;
      if (psu.wattage && psu.wattage < recWattage) {
        compatClass = 'is-conflict';
        score += 5;
        compatMsg = `[ CẢNH BÁO NGUỒN ] Công suất PSU (${psu.wattage}W) thấp hơn khuyến nghị (${recWattage}W)!`;
      } else {
        score += 10;
      }
    }
    if (cooler) score += 4;
    if (caseItem) score += 3;
    if (storage) score += 3;

    percent = Math.min(100, score);

    if (compatClass !== 'is-conflict') {
      if (percent === 100) {
        compatClass = 'is-compatible';
        compatMsg = '[ 100% TƯƠNG THÍCH HOÀN HẢO ] Toàn bộ 8 linh kiện đạt chuẩn kỹ thuật phòng Lab CyberRig!';
      } else if (percent >= 80) {
        compatClass = 'is-compatible';
        compatMsg = `[ TƯƠNG THÍCH CAO ${percent}% ] Nền tảng hoạt động tối ưu. Hãy hoàn tất các linh kiện còn lại!`;
      } else {
        compatClass = 'is-partial';
        compatMsg = `[ ĐỒNG BỘ SOCKET ${cpu?.socket || mb?.socket || ''} ${percent}% ] Vi xử lý và Bo Mạch Chủ khớp hoàn toàn! Tiếp tục hoàn thiện.`;
      }
    }
  }

  // Calculate totals
  const totalCost = items.reduce((sum, item) => sum + (item.price || 0), 0);
  const totalTdp = (cpu?.tdp || 65) + (gpu?.tdp || 120) + 75;
  const psuWattage = psu?.wattage || 0;

  container.innerHTML = `
    <div class="builder-shell">
      ${toastData ? `
        <div class="builder-toast-banner" id="builder-toast-banner">
          <span class="toast-msg"><strong>[ CYBERRIG HARDWARE LAB ]</strong> ${toastData.message}</span>
          <button type="button" class="toast-close-btn" onclick="document.getElementById('builder-toast-banner')?.remove()">&times;</button>
        </div>
      ` : ''}

      <!-- Breadcrumb & Top Controls -->
      <div class="builder-top-bar">
        <div class="builder-headline-group">
          <div class="builder-tagline">CYBERRIG LAB // PC COMPATIBILITY ARCHITECTURE</div>
          <h1 class="builder-main-title">XÂY DỰNG CẤU HÌNH PC CHUYÊN NGHIỆP</h1>
        </div>
        <div class="builder-actions-top">
          <button type="button" id="builder-reset-btn" class="tech-btn tech-btn-outline tech-btn-sm">
            Khởi Tạo Lại Từ Đầu
          </button>
          <a href="/#tier-presets" class="tech-btn tech-btn-outline tech-btn-sm" id="builder-back-presets">
            Xem 4 Cấu Hình Tiêu Chuẩn
          </a>
        </div>
      </div>

      <!-- Live Compatibility Engine Bar -->
      <div class="builder-compat-card ${compatClass}" id="builder-compat-engine-card" role="region" aria-label="Engine thẩm định tương thích tự động">
        <div class="compat-status-row">
          <div class="compat-badge-group">
            <div class="compat-pulse-dot"></div>
            <span class="compat-status-title">TRẠNG THÁI TƯƠNG THÍCH:</span>
            <span class="compat-status-val" id="builder-compat-status-val">${compatMsg}</span>
          </div>
          <div class="compat-percent-badge"><span id="builder-compat-percent-val">0</span>%</div>
        </div>
        <div class="compat-bar-track">
          <div class="compat-bar-fill" id="builder-compat-bar-fill" style="width: 0%;"></div>
        </div>
        <div class="compat-metrics-chips">
          <div class="compat-chip">
            <span class="c-lbl">Socket CPU &amp; Main:</span>
            <span class="c-val">${cpu?.socket || 'Chưa chọn'} / ${mb?.socket || 'Chưa chọn'}</span>
          </div>
          <div class="compat-chip">
            <span class="c-lbl">Ước tính TDP:</span>
            <span class="c-val">${totalTdp}W</span>
          </div>
          <div class="compat-chip">
            <span class="c-lbl">Khuyến nghị Nguồn:</span>
            <span class="c-val">${Math.ceil((totalTdp * 1.25) / 50) * 50}W+ (PSU: ${psuWattage ? psuWattage + 'W' : 'Chưa chọn'})</span>
          </div>
        </div>
      </div>

      <!-- Main Slots Grid & Summary Column -->
      <div class="builder-layout-split">
        <!-- Left: 8 Professional Hardware Slots -->
        <div class="builder-slots-col">
          ${BUILDER_SLOTS_DEF.map(slotDef => {
            const item = itemMap[slotDef.category];
            if (item) {
              return `
                <div class="builder-slot-card is-filled" data-cat="${slotDef.category}">
                  <!-- Slot Header Strip -->
                  <div class="slot-cat-header">
                    <div class="slot-cat-ident">
                      <span class="slot-idx-badge">[ ${slotDef.index} ]</span>
                      <span class="slot-cat-name">${slotDef.name}</span>
                      <span class="slot-tag-badge">${slotDef.tag}</span>
                    </div>
                    <div class="slot-status-badge is-configured">
                      <span class="status-indicator-dot"></span>
                      <span class="status-indicator-text">ĐÃ THIẾT LẬP</span>
                    </div>
                  </div>

                  <!-- Slot Body (Filled State) -->
                  <div class="slot-item-body">
                    <div class="slot-item-info">
                      <h3 class="slot-item-title">${item.name}</h3>
                      <div class="slot-specs-row">
                        ${renderSpecChips(item.specs)}
                      </div>
                    </div>
                    <div class="slot-item-meta">
                      <div class="slot-price-wrapper">
                        <span class="slot-price-label">ĐƠN GIÁ NIÊM YẾT</span>
                        <div class="slot-item-price">${formatVND(item.price || 0)}</div>
                      </div>
                      <div class="slot-btn-group">
                        <button type="button" class="tech-btn tech-btn-outline tech-btn-sm slot-pick-btn" data-category="${slotDef.category}">
                          Thay Đổi
                        </button>
                        <button type="button" class="tech-btn tech-btn-outline tech-btn-sm slot-remove-btn" data-category="${slotDef.category}">
                          Gỡ Bỏ
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              `;
            } else {
              return `
                <div class="builder-slot-card is-empty" data-cat="${slotDef.category}">
                  <!-- Slot Header Strip -->
                  <div class="slot-cat-header">
                    <div class="slot-cat-ident">
                      <span class="slot-idx-badge">[ ${slotDef.index} ]</span>
                      <span class="slot-cat-name">${slotDef.name}</span>
                      <span class="slot-tag-badge">${slotDef.tag}</span>
                    </div>
                    <div class="slot-status-badge is-pending">
                      <span class="status-indicator-dot empty"></span>
                      <span class="status-indicator-text">CHƯA THIẾT LẬP</span>
                    </div>
                  </div>

                  <!-- Slot Body (Empty State) -->
                  <div class="slot-empty-body">
                    <div class="slot-empty-info">
                      <div class="slot-empty-title">KHOANG LINH KIỆN ĐANG ĐỂ TRỐNG</div>
                      <div class="slot-empty-desc">${slotDef.desc}</div>
                    </div>
                    <div class="slot-empty-action">
                      <button type="button" class="tech-btn tech-btn-accent tech-btn-sm slot-pick-btn slot-add-primary-btn" data-category="${slotDef.category}">
                        <span class="btn-symbol">+</span>
                        <span>CHỌN LINH KIỆN</span>
                      </button>
                    </div>
                  </div>
                </div>
              `;
            }
          }).join('')}
        </div>

        <!-- Right: Summary & Checkout Card -->
        <div class="builder-summary-col">
          <div class="builder-summary-card">
            <div class="summary-header-row">
              <span class="summary-badge-mono">[ SUMMARY ]</span>
              <h3 class="summary-title">TỔNG KẾT CẤU HÌNH</h3>
            </div>
            <div class="summary-row">
              <span>Số linh kiện đã cấu hình:</span>
              <span class="summary-count">${items.length} / 8</span>
            </div>
            <div class="summary-row">
              <span>Công suất tiêu thụ tối đa:</span>
              <span>~${totalTdp} Watts</span>
            </div>
            <div class="summary-row">
              <span>Biên an toàn điện năng:</span>
              <span class="summary-power-badge">+25% Ready</span>
            </div>
            <div class="summary-divider"></div>
            <div class="summary-total-box">
              <span class="total-lbl">TỔNG DỰ TOÁN CHI PHÍ:</span>
              <div class="total-val">${formatVND(totalCost)}</div>
            </div>
            <button type="button" id="builder-quote-btn" class="tech-btn tech-btn-accent" style="width: 100%; padding: 12px 14px; margin-top: 18px; font-weight: 800; font-size: 0.84rem; white-space: normal; line-height: 1.25; text-align: center;">
              [ ĐẶT HÀNG &amp; THANH TOÁN VIETQR ]
            </button>
            <button type="button" id="builder-b2b-btn" class="tech-btn tech-btn-outline" style="width: 100%; margin-top: 10px; padding: 10px 14px; font-size: 0.8rem; text-align: center;">
              [ BÁO GIÁ DỰ ÁN (B2B) ]
            </button>
            <button type="button" id="builder-browse-hw-btn" class="tech-btn tech-btn-outline" style="width: 100%; margin-top: 10px; padding: 10px 14px; font-size: 0.8rem; text-align: center;">
              [ KHÁM PHÁ KHO LINH KIỆN ]
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach Event Handlers
  const resetBtn = document.getElementById('builder-reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      clearBuild();
      renderBuilder();
    });
  }

  const quoteBtn = document.getElementById('builder-quote-btn');
  if (quoteBtn) {
    quoteBtn.addEventListener('click', () => {
      const current = getStoredBuild();
      if (!current || current.length === 0) {
        showStorefrontToast('Vui lòng chọn ít nhất một linh kiện vào cấu hình trước khi đặt hàng!', { tone: 'warn' });
        return;
      }
      const token = localStorage.getItem(ACCESS_KEY);
      if (!token) {
        requireLoginModal({
          reason: 'Bạn cần đăng nhập tài khoản thành viên CyberRig để đặt hàng cấu hình PC, khóa tồn kho linh kiện và lưu chứng nhận bảo hành điện tử.',
          redirectUrl: '/checkout',
        });
        return;
      }
      navigateTo('/checkout');
    });
  }

  const b2bBtn = document.getElementById('builder-b2b-btn');
  if (b2bBtn) {
    b2bBtn.addEventListener('click', () => {
      const b2bModal = document.getElementById('b2b-modal');
      if (b2bModal) {
        b2bModal.classList.add('is-active');
      }
    });
  }


  const browseBtn = document.getElementById('builder-browse-hw-btn');
  if (browseBtn) {
    browseBtn.addEventListener('click', () => {
      navigateTo('/hardware');
    });
  }

  // Remove item
  container.querySelectorAll('.slot-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-category');
      const current = getStoredBuild().filter(i => i.category !== cat);
      setStoredBuild(current);
      renderBuilder();
    });
  });

  // Pick / Change item
  container.querySelectorAll('.slot-pick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-category');
      navigateTo(`/hardware?category=${cat}`);
    });
  });

  // Interactive Live Compatibility Scanner on Builder Page (matches Landing Page interaction & speed)
  initBuilderCompatScanner(percent, compatMsg);
}

/**
 * Interactive Live Compatibility Scanner Engine for PC Builder Page
 * Dynamically computes and displays the actual configuration compatibility score.
 * Smoothly animates up to the target compatibility percentage and HOLDS at that value.
 * Does NOT drain to 0% on mouseleave.
 */
function initBuilderCompatScanner(finalPercent, finalStatusMsg) {
  const card = document.getElementById('builder-compat-engine-card');
  const percentVal = document.getElementById('builder-compat-percent-val');
  const fillBar = document.getElementById('builder-compat-bar-fill');
  const statusMsg = document.getElementById('builder-compat-status-val');

  if (!card || !percentVal || !fillBar || !statusMsg) return;

  let currentPercent = 0;
  let targetPercent = finalPercent;
  let animFrameId = null;
  let lastTimestamp = null;

  function updateUI(pct) {
    percentVal.textContent = Math.floor(pct);
    fillBar.style.width = pct + '%';
  }

  function step(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
    lastTimestamp = timestamp;

    if (currentPercent < targetPercent) {
      currentPercent = Math.min(targetPercent, currentPercent + (dt * 65));
      updateUI(currentPercent);
      if (currentPercent < targetPercent) {
        animFrameId = requestAnimationFrame(step);
      } else {
        lastTimestamp = null;
        updateUI(targetPercent);
        statusMsg.textContent = finalStatusMsg;
      }
    } else if (currentPercent > targetPercent) {
      currentPercent = Math.max(targetPercent, currentPercent - (dt * 90));
      updateUI(currentPercent);
      if (currentPercent > targetPercent) {
        animFrameId = requestAnimationFrame(step);
      } else {
        lastTimestamp = null;
        updateUI(targetPercent);
        statusMsg.textContent = finalStatusMsg;
      }
    } else {
      updateUI(targetPercent);
      statusMsg.textContent = finalStatusMsg;
    }
  }

  // Smoothly animate to targetPercent
  if (targetPercent > 0) {
    animFrameId = requestAnimationFrame(step);
  } else {
    updateUI(0);
    statusMsg.textContent = finalStatusMsg;
  }

  // Hover provides tactile feedback and deep scanning visual pulse
  card.addEventListener('mouseenter', () => {
    card.classList.add('is-rumbling');
  });

  // Mouse leave removes rumble but STAYS at the compatibility percentage
  card.addEventListener('mouseleave', () => {
    card.classList.remove('is-rumbling');
    statusMsg.textContent = finalStatusMsg;
  });

  // Click opens quick test diagnostic modal
  card.addEventListener('click', (e) => {
    if (e.target.closest('button') || e.target.closest('a')) return;
    openSimTestModal();
  });
}
