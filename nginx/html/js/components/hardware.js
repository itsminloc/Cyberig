/**
 * CyberRig Retail Hardware Storefront (/hardware)
 * FPT-Shop-inspired merchandising hub with Promo Banners, Visual Featured Categories,
 * Brand & Sort Filters, Instant Add-to-Builder, and Auth-Gated 1-Click Buy Now.
 */
import { ACCESS_KEY, USER_KEY } from '../config.js';
import { navigateTo } from '../router.js';
import { getStoredBuild, setStoredBuild } from './builder.js';
import { showStorefrontToast, requireLoginModal } from '../ui-feedback.js';
import {
  FEATURED_CATEGORY_TILES,
  BRAND_FILTERS,
  DEFAULT_HARDWARE_INVENTORY,
  getHardwareImage,
} from './hardware-catalog.data.js';

export { DEFAULT_HARDWARE_INVENTORY, getHardwareImage };

function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function getLoggedUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_e) {
    return null;
  }
}

export async function renderHardware() {
  const container = document.getElementById('hardware-view');
  if (!container) return;

  const urlParams = new URLSearchParams(window.location.search);
  let currentCategory = (urlParams.get('category') || 'ALL').toUpperCase();
  let currentBrand = 'ALL';
  let currentSort = 'FEATURED';
  let currentSearch = urlParams.get('search') || '';

  const user = getLoggedUser();
  const buildCount = (getStoredBuild() || []).length;

  container.innerHTML = `
    <div class="hardware-shell fpt-retail-shell">
      <!-- 1. Top Retail Deal Bar -->
      <div class="fpt-deal-strip">
        <div class="fpt-deal-left">
          <span class="fpt-hot-pill">SIÊU ƯU ĐÃI LINH KIỆN</span>
          <span>Giảm đến <strong>18%</strong> Combo Build PC · Trả góp <strong>0%</strong> · Bảo hành <strong>1 đổi 1 36 tháng</strong></span>
        </div>
        <div class="fpt-deal-right">
          ${user ? `<span class="fpt-member-chip">👋 Xin chào, <strong>${user.fullName || user.email}</strong></span>` : ''}
          <a href="/builder" class="pill-btn pill-btn-accent" style="padding:6px 14px;font-size:0.76rem;">
            Cấu hình đang chọn (${buildCount})
          </a>
        </div>
      </div>

      <!-- 2. Dual Promotional Spotlight Banners (FPT Shop Merchandising Style) -->
      <div class="fpt-promo-grid">
        <div class="fpt-promo-card is-dark-promo">
          <div class="fpt-promo-copy">
            <span class="fpt-promo-eyebrow">ĐẶC QUYỀN GEFORCE RTX &amp; RYZEN X3D</span>
            <h2 class="fpt-promo-title">Nâng cấp VGA &amp; Vi xử lý thế hệ mới</h2>
            <div class="fpt-promo-badges">
              <span>Giảm trực tiếp đến 3.5 Triệu</span>
              <span>Trả góp 0% lãi suất</span>
            </div>
            <button type="button" class="pill-btn pill-btn-accent" data-promo-cat="GPU" style="padding:8px 18px;font-size:0.8rem;">
              Săn Deal Card Đồ Họa →
            </button>
          </div>
          <img src="/assets/components/gpu-rtx.jpg" alt="RTX 40 Series Promo" class="fpt-promo-img" loading="lazy" />
        </div>

        <div class="fpt-promo-card is-studio-promo">
          <div class="fpt-promo-copy">
            <span class="fpt-promo-eyebrow">GIẢI PHÁP PC TOÀN DIỆN CYBERRIG</span>
            <h2 class="fpt-promo-title">Ráp PC chuẩn tương thích 100%</h2>
            <div class="fpt-promo-badges">
              <span>Miễn phí lắp ráp &amp; đi dây</span>
              <span>Giao nhanh nội thành 2h</span>
            </div>
            <a href="/builder" class="pill-btn pill-btn-outline" style="padding:8px 18px;font-size:0.8rem;">
              Mở Công Cụ Xây Dựng PC →
            </a>
          </div>
          <img src="/assets/cyberrig-studio-setup.jpg" alt="CyberRig PC Studio" class="fpt-promo-img" loading="lazy" />
        </div>
      </div>

      <!-- 3. Featured Visual Category Grid ("Danh mục nổi bật" like FPT Shop) -->
      <section class="fpt-cat-section" aria-label="Danh mục nổi bật">
        <div class="fpt-section-head">
          <h2 class="fpt-section-title">Danh mục nổi bật</h2>
          <button type="button" class="fpt-reset-cat-btn ${currentCategory === 'ALL' ? 'is-active' : ''}" id="hw-show-all-cats">
            Xem tất cả linh kiện
          </button>
        </div>
        <div class="fpt-cat-grid">
          ${FEATURED_CATEGORY_TILES.map((tile) => `
            <button type="button" class="fpt-cat-tile ${tile.id === currentCategory ? 'is-active' : ''}"
              data-tile-cat="${tile.id}" data-tile-route="${tile.route || ''}">
              <div class="fpt-cat-thumb-box">
                <img src="${tile.img}" alt="${tile.label}" loading="lazy" />
              </div>
              <span class="fpt-cat-name">${tile.label}</span>
              <span class="fpt-cat-sub">${tile.badge}</span>
            </button>
          `).join('')}
        </div>
      </section>

      <!-- 4. Search, Brand Chips & Price Sort Toolbar -->
      <div class="fpt-filter-toolbar">
        <div class="fpt-search-row">
          <div class="fpt-search-input-box">
            <input type="text" id="hw-search-input" placeholder="Nhập tên linh kiện, socket, thương hiệu cần tìm (RTX 4070, i5-13600K, DDR5, B760...)" value="${currentSearch}" />
            <button type="button" id="hw-search-btn" class="pill-btn pill-btn-accent" style="padding:7px 18px;font-size:0.8rem;">Tìm kiếm</button>
          </div>
          <select id="hw-sort-select" class="form-field-input fpt-sort-select" aria-label="Sắp xếp theo giá">
            <option value="FEATURED">Sắp xếp: Nổi bật nhất</option>
            <option value="PRICE_ASC">Giá thấp đến cao</option>
            <option value="PRICE_DESC">Giá cao đến thấp</option>
          </select>
        </div>
        <div class="fpt-brand-chips" id="hw-brand-strip">
          ${BRAND_FILTERS.map((b) => `
            <button type="button" class="fpt-brand-chip ${b === currentBrand ? 'is-active' : ''}" data-brand="${b}">
              ${b === 'ALL' ? 'Tất cả hãng' : b}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- 5. Results Header & Retail Product Grid -->
      <div class="fpt-results-bar">
        <span id="hw-results-count">Đang tải sản phẩm chính hãng...</span>
      </div>
      <div id="hw-products-root" class="hw-products-grid fpt-products-grid"></div>
    </div>
  `;

  // Load live backend catalog and merge with rich merchandising catalog
  let apiItems = [];
  try {
    const res = await fetch('/api/hardware?limit=100');
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        apiItems = json.data.map((d) => ({
          id: d.id,
          model: d.model,
          category: (d.categoryId || d.category || 'CPU').toUpperCase(),
          name: d.name,
          brand: d.brand,
          price: Number(d.price) || 0,
          discountPct: 12,
          stockQuantity: Number(d.stockQuantity ?? 10),
          specs: typeof d.specs === 'string' ? JSON.parse(d.specs || '{}') : (d.specs || {}),
        }));
      }
    }
  } catch (_e) {}

  // Deduplicate by normalized name prefix or model so seeded DB UUIDs override static slugs cleanly!
  const merged = [...apiItems];
  const seenNames = new Set(apiItems.map((i) => i.name.slice(0, 22).toLowerCase()));
  DEFAULT_HARDWARE_INVENTORY.forEach((defItem) => {
    if (!seenNames.has(defItem.name.slice(0, 22).toLowerCase())) {
      merged.push(defItem);
    }
  });

  const searchInput = document.getElementById('hw-search-input');
  const sortSelect = document.getElementById('hw-sort-select');
  const root = document.getElementById('hw-products-root');
  const resultsCount = document.getElementById('hw-results-count');

  function buildCartEntry(item) {
    const specsSummary = typeof item.specs === 'object' && item.specs
      ? Object.entries(item.specs).slice(0, 3).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join('/') : v}`).join(' • ')
      : String(item.specs || '');
    return {
      id: item.id,
      model: item.model,
      category: item.category,
      name: item.name,
      price: item.price,
      specs: specsSummary,
      socket: item.specs?.socket,
      tdp: item.specs?.tdpWatts || item.specs?.tdp,
      wattage: item.specs?.wattage,
      image: getHardwareImage(item),
    };
  }

  function renderGrid() {
    const q = (searchInput?.value || '').trim().toLowerCase();
    let list = merged.filter((item) => {
      if (currentCategory !== 'ALL' && item.category !== currentCategory) return false;
      if (currentBrand !== 'ALL' && (item.brand || '').toLowerCase() !== currentBrand.toLowerCase()) return false;
      if (q) {
        const hay = `${item.name} ${item.brand} ${JSON.stringify(item.specs || {})}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (currentSort === 'PRICE_ASC') list = [...list].sort((a, b) => a.price - b.price);
    if (currentSort === 'PRICE_DESC') list = [...list].sort((a, b) => b.price - a.price);

    if (resultsCount) {
      const catLabel = currentCategory === 'ALL' ? 'Tất cả linh kiện' : currentCategory;
      resultsCount.innerHTML = `<strong>${catLabel}</strong> · Tìm thấy <strong>${list.length}</strong> sản phẩm chính hãng sẵn sàng giao ngay`;
    }

    if (list.length === 0) {
      root.innerHTML = `
        <div class="fpt-empty-box">
          <p>Không tìm thấy sản phẩm phù hợp với bộ lọc hiện tại.</p>
          <button type="button" class="pill-btn pill-btn-outline" id="hw-reset-filters">Xóa bộ lọc &amp; Xem tất cả</button>
        </div>
      `;
      document.getElementById('hw-reset-filters')?.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        currentCategory = 'ALL';
        currentBrand = 'ALL';
        syncActivePills();
        renderGrid();
      });
      return;
    }

    root.innerHTML = list.map((item) => {
      const pct = item.discountPct || 10;
      const oldPrice = Math.round((item.price / (1 - pct / 100)) / 10000) * 10000;
      const imageUrl = getHardwareImage(item);
      const specsSummary = typeof item.specs === 'object' && item.specs
        ? Object.entries(item.specs).slice(0, 3).map(([, v]) => (Array.isArray(v) ? v.join('/') : v)).join(' · ')
        : '';
      const encoded = encodeURIComponent(JSON.stringify(buildCartEntry(item)));

      return `
        <article class="fpt-product-card">
          <div class="fpt-card-badges">
            <span class="fpt-installment-tag">Trả góp 0%</span>
            <span class="fpt-discount-tag">-${pct}%</span>
          </div>
          <div class="fpt-card-thumb">
            <img src="${imageUrl}" alt="${item.name}" loading="lazy" onerror="this.onerror=null;this.src='/assets/minimalist-pc-showcase.jpg';" />
          </div>
          <div class="fpt-card-brand-row">
            <span class="fpt-brand-label">${item.brand || item.category}</span>
            <span class="fpt-warranty-tag">1 đổi 1 · Còn ${item.stockQuantity}</span>
          </div>
          <h3 class="fpt-card-title">${item.name}</h3>
          <div class="fpt-card-specs">${specsSummary}</div>
          <div class="fpt-price-block">
            <div class="fpt-price-current">${formatVND(item.price)}</div>
            <div class="fpt-price-old">${formatVND(oldPrice)}</div>
          </div>
          <div class="fpt-card-actions">
            <button type="button" class="pill-btn pill-btn-accent fpt-buy-now-btn" data-entry="${encoded}">
              Mua ngay
            </button>
            <button type="button" class="pill-btn pill-btn-outline fpt-add-build-btn" data-entry="${encoded}">
              + Cấu hình
            </button>
          </div>
        </article>
      `;
    }).join('');

    root.querySelectorAll('.fpt-add-build-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const entry = JSON.parse(decodeURIComponent(btn.getAttribute('data-entry')));
        const nextBuild = getStoredBuild().filter((i) => i.category !== entry.category);
        nextBuild.push(entry);
        setStoredBuild(nextBuild);
        showStorefrontToast(`✓ Đã thêm ${entry.name.slice(0, 34)}... vào Cấu hình PC`, {
          actionLabel: 'Xem Builder',
          onAction: () => navigateTo('/builder'),
        });
      });
    });

    root.querySelectorAll('.fpt-buy-now-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const entry = JSON.parse(decodeURIComponent(btn.getAttribute('data-entry')));
        const nextBuild = getStoredBuild().filter((i) => i.category !== entry.category);
        nextBuild.push(entry);
        setStoredBuild(nextBuild);

        const token = localStorage.getItem(ACCESS_KEY);
        if (!token) {
          requireLoginModal({
            reason: 'Vui lòng đăng nhập tài khoản thành viên CyberRig để đặt mua sản phẩm, giữ chỗ tồn kho và kích hoạt bảo hành điện tử.',
            redirectUrl: '/checkout',
          });
          return;
        }
        navigateTo('/checkout');
      });
    });
  }

  function syncActivePills() {
    container.querySelectorAll('.fpt-cat-tile').forEach((el) => {
      el.classList.toggle('is-active', el.getAttribute('data-tile-cat') === currentCategory);
    });
    document.getElementById('hw-show-all-cats')?.classList.toggle('is-active', currentCategory === 'ALL');
    container.querySelectorAll('.fpt-brand-chip').forEach((el) => {
      el.classList.toggle('is-active', el.getAttribute('data-brand') === currentBrand);
    });
  }

  container.querySelectorAll('[data-promo-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentCategory = btn.getAttribute('data-promo-cat');
      syncActivePills();
      renderGrid();
      root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  document.getElementById('hw-show-all-cats')?.addEventListener('click', () => {
    currentCategory = 'ALL';
    syncActivePills();
    renderGrid();
  });

  container.querySelectorAll('.fpt-cat-tile').forEach((tile) => {
    tile.addEventListener('click', () => {
      const route = tile.getAttribute('data-tile-route');
      if (route) {
        navigateTo(route);
        return;
      }
      currentCategory = tile.getAttribute('data-tile-cat') || 'ALL';
      syncActivePills();
      renderGrid();
    });
  });

  container.querySelectorAll('.fpt-brand-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      currentBrand = chip.getAttribute('data-brand') || 'ALL';
      syncActivePills();
      renderGrid();
    });
  });

  searchInput?.addEventListener('input', renderGrid);
  document.getElementById('hw-search-btn')?.addEventListener('click', renderGrid);
  sortSelect?.addEventListener('change', () => {
    currentSort = sortSelect.value;
    renderGrid();
  });

  renderGrid();
}
