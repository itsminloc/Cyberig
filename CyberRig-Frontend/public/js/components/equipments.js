/**
 * CyberRig PC Setup & Workspace Equipments Catalog Component (/equipments)
 * 100% Icon-Free, Pure Typographic & Sharp Industrial Design Engine
 */
import { formatVND } from '../config.js';
import { navigateTo } from '../router.js';

export const EQUIPMENT_CATEGORIES = [
  { id: 'ALL', label: '[ TẤT CẢ ]' },
  { id: 'MONITOR', label: '[ MÀN HÌNH ]' },
  { id: 'DESK', label: '[ BÀN NÂNG HẠ ]' },
  { id: 'CHAIR', label: '[ GHẾ ERGONOMIC ]' },
  { id: 'KEYBOARD', label: '[ BÀN PHÍM CƠ ]' },
  { id: 'MOUSE', label: '[ CHUỘT GAMING ]' },
  { id: 'AUDIO', label: '[ TAI NGHE & LOA ]' },
  { id: 'ACCESSORY', label: '[ PHỤ KIỆN SETUP ]' }
];

export const EQUIPMENTS_INVENTORY = [
  // 1. MONITORS
  {
    id: 'mon-asus-pg27aqdm',
    category: 'MONITOR',
    categoryLabel: 'MÀN HÌNH OLED 240HZ',
    name: 'ASUS ROG Swift OLED PG27AQDM (27" / 2K QHD 2560x1440 / 240Hz / 0.03ms / 99% DCI-P3)',
    brand: 'ASUS ROG',
    price: 24990000,
    stockQuantity: 12,
    specs: { panel: 'OLED', refreshRate: '240Hz', resolution: '2560x1440 (2K)', response: '0.03ms GTG', colorGamut: '99% DCI-P3' }
  },
  {
    id: 'mon-dell-u2723qe',
    category: 'MONITOR',
    categoryLabel: 'MÀN HÌNH ĐỒ HỌA 4K',
    name: 'Dell UltraSharp U2723QE 4K IPS Black (27" / 4K UHD 3840x2160 / IPS Black / 100% sRGB / Type-C 90W)',
    brand: 'Dell',
    price: 13890000,
    stockQuantity: 18,
    specs: { panel: 'IPS Black', refreshRate: '60Hz', resolution: '3840x2160 (4K)', response: '5ms', colorGamut: '100% sRGB / 98% DCI-P3' }
  },
  {
    id: 'mon-lg-27gr95qe',
    category: 'MONITOR',
    categoryLabel: 'MÀN HÌNH GAMING OLED',
    name: 'LG UltraGear 27GR95QE-B OLED 240Hz (27" / QHD 2560x1440 / 240Hz / 0.03ms / G-Sync & FreeSync Premium)',
    brand: 'LG',
    price: 20490000,
    stockQuantity: 9,
    specs: { panel: 'OLED', refreshRate: '240Hz', resolution: '2560x1440 (2K)', response: '0.03ms GTG', colorGamut: '98.5% DCI-P3' }
  },
  {
    id: 'mon-samsung-neo-g9',
    category: 'MONITOR',
    categoryLabel: 'MÀN HÌNH CONG SIÊU RỘNG',
    name: 'Samsung Odyssey Neo G9 49" Mini-LED (49" Dual QHD 5120x1440 / 240Hz / 1000R Cong / Quantum Mini-LED)',
    brand: 'Samsung',
    price: 34900000,
    stockQuantity: 5,
    specs: { panel: 'Quantum Mini-LED', refreshRate: '240Hz', resolution: '5120x1440 (Dual QHD)', response: '1ms', curvature: '1000R' }
  },

  // 2. STANDING DESKS
  {
    id: 'desk-epione-pro2',
    category: 'DESK',
    categoryLabel: 'BÀN NÂNG HẠ THÔNG MINH',
    name: 'Bàn Nâng Hạ Epione SmartDesk Pro 2.0 (Động cơ kép Dual Motor / Gỗ sồi 160x80cm / Tải trọng 130kg / Nhớ 4 vị trí)',
    brand: 'Epione',
    price: 9490000,
    stockQuantity: 15,
    specs: { motor: 'Dual Motor siêu êm', dimensions: '160cm x 80cm x 2.5cm', maxLoad: '130 kg', heightRange: '60cm - 125cm' }
  },
  {
    id: 'desk-hyperwork-atlas',
    category: 'DESK',
    categoryLabel: 'BÀN CÔNG THÁI HỌC',
    name: 'Bàn Làm Việc HyperWork Atlas Pro Dual-Motor (Động cơ kép <45dB / Cảm biến chống kẹt thông minh / 140x75cm)',
    brand: 'HyperWork',
    price: 7890000,
    stockQuantity: 20,
    specs: { motor: 'Dual Motor <45dB', dimensions: '140cm x 75cm', maxLoad: '120 kg', feature: 'Chống kẹt Anti-Collision' }
  },
  {
    id: 'desk-corner-studio',
    category: 'DESK',
    categoryLabel: 'BÀN CHỮ L CHUYÊN NGHIỆP',
    name: 'Bàn Làm Việc Góc Chữ L HyperWork Corner Studio (Khung thép hộp sơn tĩnh điện / Khay giấu dây ẩn / Tải trọng 150kg)',
    brand: 'HyperWork',
    price: 6290000,
    stockQuantity: 8,
    specs: { style: 'Chữ L góc rộng', material: 'Thép sơn tĩnh điện & Gỗ MDF P2', maxLoad: '150 kg', features: 'Tích hợp khay đi dây ngầm' }
  },

  // 3. ERGONOMIC CHAIRS
  {
    id: 'chair-herman-aeron',
    category: 'CHAIR',
    categoryLabel: 'GHẾ CÔNG THÁI HỌC ĐẲNG CẤP',
    name: 'Herman Miller Aeron Remastered (Size B / Lưới Pellicle 8Z thoáng khí / Đệm đỡ thắt lưng PostureFit SL)',
    brand: 'Herman Miller',
    price: 36500000,
    stockQuantity: 6,
    specs: { mesh: 'Pellicle 8Z độc quyền', lumbar: 'PostureFit SL điều chỉnh kép', arms: 'Tay vịn 4D bọc da', warranty: '12 Năm' }
  },
  {
    id: 'chair-sihoo-c300',
    category: 'CHAIR',
    categoryLabel: 'GHẾ CÔNG THÁI HỌC CAO CẤP',
    name: 'Ghế Công Thái Học Sihoo Doro-C300 (Tựa lưng kép đa chiều Dynamic Bionic / Lưới Cloud Mesh / Kê tay 6D)',
    brand: 'Sihoo',
    price: 7990000,
    stockQuantity: 25,
    specs: { backrest: 'Dynamic Bionic Lumbar', armrest: 'Kê tay 6D đa hướng', mesh: 'Cloud Mesh đàn hồi cao', recline: 'Ngả 138 độ' }
  },
  {
    id: 'chair-ergohuman-elite2',
    category: 'CHAIR',
    categoryLabel: 'GHẾ ERGONOMIC CÓ KÊ CHÂN',
    name: 'Ghế Ergonomic Ergohuman Elite 2 Pro (Lưới Matrex USA / Khung nhôm đúc nguyên khối / Kèm đệm kê chân gập gọn)',
    brand: 'Ergohuman',
    price: 14200000,
    stockQuantity: 11,
    specs: { mesh: 'Matrex USA siêu bền', frame: 'Hợp kim nhôm đúc cao cấp', footrest: 'Tích hợp kê chân gập ẩn', warranty: '5 Năm' }
  },

  // 4. MECHANICAL KEYBOARDS
  {
    id: 'kb-keychron-q1-pro',
    category: 'KEYBOARD',
    categoryLabel: 'BÀN PHÍM CƠ CUSTOM',
    name: 'Keychron Q1 Pro Wireless Custom (Full Nhôm CNC / Gasket Mount / Bluetooth 5.1 & Type-C / K Pro Banana Switch)',
    brand: 'Keychron',
    price: 4890000,
    stockQuantity: 16,
    specs: { layout: '75% (81 phím)', body: 'Full Nhôm CNC anodized', mount: 'Gasket Mount + Foam tiêu âm', connectivity: 'Bluetooth 5.1 / Type-C' }
  },
  {
    id: 'kb-akko-mod007b',
    category: 'KEYBOARD',
    categoryLabel: 'BÀN PHÍM TỪ TÍNH RAPID TRIGGER',
    name: 'Akko MOD007B-PC Tokyo Hall Effect (Switch từ tính Rapid Trigger 0.1mm / Không dây Tri-Mode / LED RGB từng phím)',
    brand: 'Akko',
    price: 3290000,
    stockQuantity: 14,
    specs: { switch: 'Akko Magnetic Hall Effect', rapidTrigger: '0.1mm - 4.0mm tùy biến', connectivity: '2.4GHz / BT 5.0 / Dây USB', keycaps: 'PBT Dye-Sub JDA' }
  },
  {
    id: 'kb-fl-og98',
    category: 'KEYBOARD',
    categoryLabel: 'BÀN PHÍM CƠ RETRO',
    name: 'FL-Esports OG98 Retro Vintage (Thiết kế phong cách Retro 90s / Gasket Mount / Switch TTC Flame Red V2)',
    brand: 'FL-Esports',
    price: 2590000,
    stockQuantity: 20,
    specs: { layout: '98 phím full numpad', structure: 'Gasket Mount đệm silicon', switch: 'TTC Flame Red V2 linear', hotswap: 'Mạch xuôi 5-pin' }
  },

  // 5. GAMING MICE
  {
    id: 'mouse-logi-gprox',
    category: 'MOUSE',
    categoryLabel: 'CHUỘT ESPORTS KHÔNG DÂY',
    name: 'Logitech G Pro X Superlight 2 (Trọng lượng 60g / Cảm biến HERO 2 32.000 DPI / Tần số phản hồi 4000Hz)',
    brand: 'Logitech G',
    price: 3490000,
    stockQuantity: 30,
    specs: { weight: '60 grams', sensor: 'HERO 2 (32.000 DPI)', pollingRate: '4000 Hz Lightspeed', switches: 'Lightforce Hybrid quang học' }
  },
  {
    id: 'mouse-razer-viper-v3',
    category: 'MOUSE',
    categoryLabel: 'CHUỘT SIÊU NHẸ 54G',
    name: 'Razer Viper V3 Pro Wireless (Trọng lượng 54g / Cảm biến Focus Pro 35K Gen-2 / Không dây HyperPolling 8000Hz)',
    brand: 'Razer',
    price: 4190000,
    stockQuantity: 18,
    specs: { weight: '54 grams', sensor: 'Focus Pro 35K Gen-2', pollingRate: '8000 Hz HyperPolling', battery: 'Lên tới 95 giờ' }
  },
  {
    id: 'mouse-mx-master-3s',
    category: 'MOUSE',
    categoryLabel: 'CHUỘT CÔNG VIỆC CÔNG THÁI HỌC',
    name: 'Logitech MX Master 3S (Cuộn từ MagSpeed 1000 dòng/giây / Yên tĩnh Quiet Clicks / Kết nối 3 thiết bị)',
    brand: 'Logitech',
    price: 2450000,
    stockQuantity: 24,
    specs: { scrollWheel: 'MagSpeed điện từ', clicks: 'Quiet Clicks giảm 90% tiếng ồn', tracking: 'Cảm biến 8000 DPI Darkfield', multiDevice: 'Flow chuyển file giữa 3 máy tính' }
  },

  // 6. ACCESSORIES & AUDIO
  {
    id: 'acc-benq-screenbar-halo',
    category: 'ACCESSORY',
    categoryLabel: 'ĐÈN TREO MÀN HÌNH CHỐNG MỎI MẮT',
    name: 'BenQ ScreenBar Halo (Cảm biến ánh sáng tự động / Remote xoay không dây / Đèn nền hắt tường giảm mỏi mắt)',
    brand: 'BenQ',
    price: 3990000,
    stockQuantity: 22,
    specs: { control: 'Remote xoay không dây cảm ứng', feature: 'Đèn hắt sau tường ambient light', optical: 'Góc chiếu bất đối xứng chống lóa màn', powered: 'USB 5V/1.5A' }
  },
  {
    id: 'acc-arm-humanmotion-t9',
    category: 'ACCESSORY',
    categoryLabel: 'TAY NÂNG ARM MÀN HÌNH KÉP',
    name: 'HumanMotion T9 Pro Dual (Trợ lực lò xo khí nén Gas Spring / Tải trọng 15kg/tay / Hỗ trợ màn cong 17-43 inch)',
    brand: 'HumanMotion',
    price: 2390000,
    stockQuantity: 19,
    specs: { capacity: 'Mỗi tay nâng chịu tải 15kg', displaySize: '17 đến 43 inch', vesa: '75x75mm & 100x100mm', mechanics: 'Lò xo trợ lực Gas Spring' }
  },
  {
    id: 'acc-cable-tray',
    category: 'ACCESSORY',
    categoryLabel: 'KHAY QUẢN LÝ DÂY CÁP GẦM BÀN',
    name: 'Khay Giấu Dây Cáp Gầm Bàn HyperWork Cable Spine (Thép sơn tĩnh điện chống cháy / Chứa trọn củ sạc & ổ cắm)',
    brand: 'HyperWork',
    price: 690000,
    stockQuantity: 40,
    specs: { material: 'Thép cán nguội SPCC', mounting: 'Kẹp bàn không cần khoan lỗ', dimensions: '60cm x 12cm x 10cm' }
  },
  {
    id: 'audio-steelseries-nova7',
    category: 'AUDIO',
    categoryLabel: 'TAI NGHE GAMING HI-RES KHÔNG DÂY',
    name: 'SteelSeries Arctis Nova 7 Wireless (Âm thanh vòm 360 Spatial / Pin 38h sạc nhanh / Mic khử tạp âm AI ClearCast)',
    brand: 'SteelSeries',
    price: 4690000,
    stockQuantity: 15,
    specs: { audio: 'Hi-Res Drivers + Sonar Audio Software Suite', wireless: 'Dual 2.4GHz & Bluetooth đồng thời', battery: '38 Giờ chơi liên tục', mic: 'ClearCast Gen 2 khử nhiễu AI' }
  }
];

export async function renderEquipments() {
  const container = document.getElementById('equipments-view');
  if (!container) return;

  const urlParams = new URLSearchParams(window.location.search);
  let currentCategory = urlParams.get('category') || 'ALL';
  let currentSearch = urlParams.get('search') || '';

  container.innerHTML = `
    <div class="hardware-shell">
      <div class="hw-header-group">
        <div class="hw-tagline">[ CYBERRIG LAB // WORKSPACE &amp; BATTLESTATION EQUIPMENTS ]</div>
        <h1 class="hw-main-title">HỆ SINH THÁI GÓC SETUP &amp; CÔNG THÁI HỌC</h1>
        <p class="hw-subtext">Màn hình tần số quét cao, bàn nâng hạ thông minh, ghế ergonomic y khoa, gear thi đấu và phụ kiện tối ưu không gian làm việc chuyên nghiệp.</p>
      </div>

      <!-- Filter Controls Bar -->
      <div class="hw-controls-bar">
        <div class="hw-search-box">
          <input
            type="text"
            id="eq-search-input"
            class="hw-input"
            placeholder="Tìm kiếm thiết bị setup (Màn hình 240Hz, Bàn Epione, Ghế Herman Miller, Bàn phím cơ, Chuột, Đèn BenQ...)"
            value="${currentSearch}"
          />
          <button type="button" id="eq-search-btn" class="tech-btn tech-btn-accent" style="padding: 10px 20px; font-size: 0.8rem;">
            [ TÌM KIẾM ]
          </button>
        </div>

        <div class="hw-category-pills">
          ${EQUIPMENT_CATEGORIES.map(cat => `
            <button
              type="button"
              class="hw-cat-pill ${cat.id === currentCategory ? 'is-active' : ''}"
              data-cat="${cat.id}"
            >
              ${cat.label}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Live Counter & Action Banner -->
      <div class="hw-info-banner" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid var(--border-subtle); font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted); flex-wrap: wrap; gap: 12px;">
        <span id="eq-results-count">[ ĐANG LỌC KHO THIẾT BỊ SETUP... ]</span>
        <div style="display: flex; gap: 10px; align-items: center;">
          <button type="button" class="tech-btn tech-btn-accent" id="eq-combo-btn" style="padding: 7px 16px; font-size: 0.76rem;">
            [ + ĐẶT TƯ VẤN COMBO GÓC SETUP ]
          </button>
          <a href="/hardware" class="tech-btn tech-btn-outline" style="padding: 7px 16px; font-size: 0.76rem;">
            [ XEM KHO LINH KIỆN PC ]
          </a>
        </div>
      </div>

      <!-- Products Grid -->
      <div id="eq-products-root" class="hw-products-grid"></div>
    </div>
  `;

  // Filter and display logic
  function filterAndRender() {
    const root = document.getElementById('eq-products-root');
    const counter = document.getElementById('eq-results-count');
    if (!root) return;

    let filtered = EQUIPMENTS_INVENTORY;

    if (currentCategory !== 'ALL') {
      filtered = filtered.filter(item => item.category === currentCategory);
    }

    if (currentSearch) {
      const q = currentSearch.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q) ||
        (item.categoryLabel && item.categoryLabel.toLowerCase().includes(q))
      );
    }

    if (counter) {
      counter.textContent = `[ HIỂN THỊ: ${filtered.length} / ${EQUIPMENTS_INVENTORY.length} THIẾT BỊ SETUP ]`;
    }

    if (filtered.length === 0) {
      root.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: var(--bg-card); border: 1px solid var(--border-medium);">
          <div style="font-family: var(--font-mono); font-size: 0.76rem; color: var(--text-muted); margin-bottom: 8px;">[ KHÔNG TÌM THẤY THIẾT BỊ PHÙ HỢP ]</div>
          <h3 style="font-family: var(--font-condensed); font-size: 1.6rem; text-transform: uppercase; margin-bottom: 12px; color: var(--text-main);">KHÔNG CÓ KẾT QUẢ CHO TỪ KHÓA NÀY</h3>
          <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 20px;">Vui lòng thử lại với danh mục khác hoặc xóa bộ lọc tìm kiếm.</p>
          <button type="button" class="tech-btn tech-btn-accent" id="eq-reset-filter-btn" style="padding: 10px 20px; font-size: 0.8rem;">
            [ HIỂN THỊ TẤT CẢ THIẾT BỊ ]
          </button>
        </div>
      `;
      document.getElementById('eq-reset-filter-btn')?.addEventListener('click', () => {
        currentCategory = 'ALL';
        currentSearch = '';
        const input = document.getElementById('eq-search-input');
        if (input) input.value = '';
        container.querySelectorAll('.hw-cat-pill').forEach(p => {
          p.classList.toggle('is-active', p.getAttribute('data-cat') === 'ALL');
        });
        filterAndRender();
      });
      return;
    }

    root.innerHTML = filtered.map(item => {
      const specsSummary = Object.entries(item.specs || {})
        .slice(0, 3)
        .map(([k, v]) => `<div style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-muted); line-height: 1.5;"><span style="color: var(--text-main); font-weight: 600;">•</span> ${v}</div>`)
        .join('');

      return `
        <div class="hw-product-card" data-id="${item.id}">
          <div>
            <div class="hw-card-top">
              <span class="hw-cat-badge">${item.categoryLabel || item.category}</span>
              <span class="hw-stock-badge ${item.stockQuantity > 0 ? 'in-stock' : 'out-of-stock'}">
                [ SẴN KHO: ${item.stockQuantity} ]
              </span>
            </div>

            <div class="hw-card-thumb-wrap" style="height: 180px; position: relative; overflow: hidden; background: #0d121d; border: 1px solid var(--border-subtle); margin-bottom: 14px;">
              <img
                src="${item.image || `/assets/equipments/${item.id}.jpg`}"
                alt="${item.name}"
                class="hw-card-thumb"
                loading="lazy"
                onerror="this.onerror=null; this.src='/assets/cyberrig-studio-setup.jpg';"
                style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.35s ease;"
              />
              <span style="position: absolute; bottom: 8px; left: 8px; background: rgba(0, 0, 0, 0.75); color: #fff; font-family: var(--font-mono); font-size: 0.68rem; font-weight: 700; padding: 3px 8px; letter-spacing: 0.05em; text-transform: uppercase;">
                ${item.brand}
              </span>
            </div>

            <h3 style="font-family: var(--font-sans); font-size: 0.95rem; font-weight: 700; color: var(--text-main); line-height: 1.35; margin-bottom: 12px; min-height: 52px;">
              ${item.name}
            </h3>

            <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); padding: 10px 12px; margin-bottom: 16px;">
              <div style="font-family: var(--font-mono); font-size: 0.68rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">THÔNG SỐ ĐẶC TÍNH:</div>
              ${specsSummary}
            </div>
          </div>

          <div style="border-top: 1px solid var(--border-subtle); padding-top: 14px; margin-top: auto;">
            <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px;">
              <span style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase;">GIÁ NIÊM YẾT:</span>
              <span style="font-family: var(--font-mono); font-size: 1.25rem; font-weight: 800; color: var(--accent-primary);">
                ${formatVND(item.price)}
              </span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <button
                type="button"
                class="tech-btn tech-btn-accent eq-add-btn"
                data-id="${item.id}"
                data-name="${item.name}"
                style="padding: 8px; font-size: 0.74rem; text-align: center;"
              >
                [ CHỌN SETUP ]
              </button>
              <button
                type="button"
                class="tech-btn tech-btn-outline eq-consult-btn"
                data-id="${item.id}"
                data-name="${item.name}"
                style="padding: 8px; font-size: 0.74rem; text-align: center;"
              >
                [ TƯ VẤN ]
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach card buttons
    root.querySelectorAll('.eq-add-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.getAttribute('data-name');
        btn.textContent = '[ ĐÃ CHỌN ✓ ]';
        btn.style.background = '#10b981';
        btn.style.color = '#ffffff';
        setTimeout(() => {
          btn.textContent = '[ CHỌN SETUP ]';
          btn.style.background = '';
          btn.style.color = '';
        }, 1500);
      });
    });

    root.querySelectorAll('.eq-consult-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.getAttribute('data-name');
        if (window.openB2BQuote) {
          window.openB2BQuote();
          const reqInput = document.getElementById('b2b-requirements');
          if (reqInput) reqInput.value = `Tôi cần tư vấn và báo giá thiết bị: ${name}`;
        }
      });
    });
  }

  // Search listeners
  const searchInput = document.getElementById('eq-search-input');
  const searchBtn = document.getElementById('eq-search-btn');

  function doSearch() {
    currentSearch = searchInput ? searchInput.value.trim() : '';
    const params = new URLSearchParams();
    if (currentCategory && currentCategory !== 'ALL') params.set('category', currentCategory);
    if (currentSearch) params.set('search', currentSearch);
    window.history.replaceState({}, '', `/equipments?${params.toString()}`);
    filterAndRender();
  }

  if (searchBtn) searchBtn.addEventListener('click', doSearch);
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      currentSearch = searchInput.value.trim();
      filterAndRender();
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        doSearch();
      }
    });
  }

  // Category pill listeners
  container.querySelectorAll('.hw-cat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      container.querySelectorAll('.hw-cat-pill').forEach(p => p.classList.remove('is-active'));
      pill.classList.add('is-active');
      currentCategory = pill.getAttribute('data-cat');
      const params = new URLSearchParams();
      if (currentCategory && currentCategory !== 'ALL') params.set('category', currentCategory);
      if (currentSearch) params.set('search', currentSearch);
      window.history.replaceState({}, '', `/equipments?${params.toString()}`);
      filterAndRender();
    });
  });

  // Combo consult button
  document.getElementById('eq-combo-btn')?.addEventListener('click', () => {
    if (window.openB2BQuote) {
      window.openB2BQuote();
      const reqInput = document.getElementById('b2b-requirements');
      if (reqInput) reqInput.value = 'Tôi cần tư vấn gói Combo Setup bàn làm việc & phòng làm việc trọn gói (Bàn nâng hạ, Ghế công thái học, Màn hình, Arm đỡ và Gear).';
    }
  });

  filterAndRender();
}
