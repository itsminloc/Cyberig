/**
 * Admin Control Center & Inventory Hub Component (#admin)
 */
import { ACCESS_KEY, USER_KEY, formatVND } from '../config.js';
import { authModal, modalAlert } from './modals.js';
import { initAdminCrawler, refreshAdminCrawlerState } from './admin-crawler.js';
import { showStorefrontToast } from '../ui-feedback.js';

const adminControlCenterView = document.getElementById('admin-control-center-view');
const adminDeniedBox = document.getElementById('admin-denied-box');
const adminContentRoot = document.getElementById('admin-content-root');
const adminGreetingName = document.getElementById('admin-greeting-name');
const adminKpiTotal = document.getElementById('admin-kpi-total');
const adminKpiLow = document.getElementById('admin-kpi-low');
const adminKpiValue = document.getElementById('admin-kpi-value');
const adminSearchBox = document.getElementById('admin-search-box');
const adminCatFilter = document.getElementById('admin-cat-filter');
const adminStockFilter = document.getElementById('admin-stock-filter');
const adminOpenAddBtn = document.getElementById('admin-open-add-btn');
const adminHardwareTbody = document.getElementById('admin-hardware-tbody');

const adminAddModal = document.getElementById('admin-add-modal');
const adminAddCloseBtn = document.getElementById('admin-add-close-btn');
const adminAddAlert = document.getElementById('admin-add-alert');
const adminAddForm = document.getElementById('admin-add-form');
const addInputCat = document.getElementById('add-input-cat');
const addInputBrand = document.getElementById('add-input-brand');
const addInputName = document.getElementById('add-input-name');
const addInputPrice = document.getElementById('add-input-price');
const addInputStock = document.getElementById('add-input-stock');
const addInputSpecs = document.getElementById('add-input-specs');
const adminAddSubmitBtn = document.getElementById('admin-add-submit-btn');

const adminRestockModal = document.getElementById('admin-restock-modal');
const adminRestockCloseBtn = document.getElementById('admin-restock-close-btn');
const adminRestockAlert = document.getElementById('admin-restock-alert');
const adminRestockForm = document.getElementById('admin-restock-form');
const restockItemId = document.getElementById('restock-item-id');
const restockItemName = document.getElementById('restock-item-name');
const restockInputAdd = document.getElementById('restock-input-add');
const restockInputPrice = document.getElementById('restock-input-price');
const adminRestockSubmitBtn = document.getElementById('admin-restock-submit-btn');

let adminHardwareCache = [];

export function renderAdminTable(items) {
  if (!adminHardwareTbody) return;
  if (!items || items.length === 0) {
    adminHardwareTbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 36px; color: var(--text-muted);">
          Không tìm thấy linh kiện nào phù hợp với bộ lọc hiện tại.
        </td>
      </tr>
    `;
    return;
  }

  adminHardwareTbody.innerHTML = items.map(item => {
    let badgeHtml = '';
    if (item.stockQuantity === 0) {
      badgeHtml = '<span class="role-badge-pill" style="background: rgba(239, 68, 68, 0.12); color: #ef4444; border: 1px solid rgba(239,68,68,0.3);">HẾT HÀNG</span>';
    } else if (item.stockQuantity <= 2) {
      badgeHtml = '<span class="role-badge-pill" style="background: rgba(245, 158, 11, 0.12); color: #f59e0b; border: 1px solid rgba(245,158,11,0.3);">SẮP HẾT</span>';
    } else {
      badgeHtml = '<span class="role-badge-pill is-customer">CÒN HÀNG</span>';
    }

    const itemJson = encodeURIComponent(JSON.stringify(item));
    return `
      <tr>
        <td style="font-family: var(--font-mono); font-size: 0.76rem; color: var(--text-muted);">
          ${item.id ? item.id.substring(0, 8).toUpperCase() : 'N/A'}
        </td>
        <td style="font-weight: 600;">
          <div>${item.name || 'Chưa đặt tên'}</div>
          ${item.model ? `<div style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono);">${item.model}</div>` : ''}
        </td>
        <td>
          <span class="role-badge-pill" style="background: var(--pill-bg); color: var(--text-main); border: 1px solid var(--border-subtle);">
            ${item.categoryId}
          </span>
        </td>
        <td style="color: var(--text-muted);">${item.brand || 'N/A'}</td>
        <td style="text-align: right; font-weight: 700; color: var(--text-main);">
          ${formatVND(item.price)}
        </td>
        <td style="text-align: center; font-family: var(--font-mono); font-size: 0.9rem; font-weight: 700; color: ${item.stockQuantity <= 2 ? '#ef4444' : 'var(--text-main)'};">
          ${item.stockQuantity}
        </td>
        <td style="text-align: center;">${badgeHtml}</td>
        <td style="text-align: right;">
          <div style="display: flex; gap: 6px; justify-content: flex-end;">
            <button
              type="button"
              class="pill-btn pill-btn-outline"
              style="padding: 4px 12px; font-size: 0.74rem;"
              onclick="openAdminRestockModal('${itemJson}')"
            >
              Nhập kho / Đổi giá
            </button>
            <button
              type="button"
              class="pill-btn pill-btn-outline"
              style="padding: 4px 10px; font-size: 0.74rem; color: #ef4444; border-color: rgba(239, 68, 68, 0.3);"
              onclick="confirmDeleteHardwareItem('${item.id}', '${encodeURIComponent(item.name)}')"
            >
              Ngừng bán
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

export function applyAdminFilters() {
  const q = (adminSearchBox?.value || '').toLowerCase().trim();
  const cat = adminCatFilter?.value || 'ALL';
  const stock = adminStockFilter?.value || 'ALL';

  const filtered = adminHardwareCache.filter(it => {
    if (cat !== 'ALL' && it.categoryId !== cat) return false;
    if (stock === 'LOW' && it.stockQuantity > 2) return false;
    if (stock === 'OUT' && it.stockQuantity !== 0) return false;
    if (q) {
      const matchName = it.name && it.name.toLowerCase().includes(q);
      const matchBrand = it.brand && it.brand.toLowerCase().includes(q);
      const matchModel = it.model && it.model.toLowerCase().includes(q);
      const matchId = it.id && it.id.toLowerCase().includes(q);
      if (!matchName && !matchBrand && !matchModel && !matchId) return false;
    }
    return true;
  });

  renderAdminTable(filtered);
}

export async function loadAdminDashboard() {
  const token = localStorage.getItem(ACCESS_KEY);
  const rawUser = localStorage.getItem(USER_KEY);
  let user = null;
  try { if (rawUser) user = JSON.parse(rawUser); } catch (e) {}

  if (!token || !user || user.role !== 'ADMIN') {
    return;
  }

  if (adminGreetingName) {
    adminGreetingName.textContent = 'ADMIN CONTROL HUB // ' + (user.fullName || user.email || 'ROOT');
  }

  if (adminHardwareTbody) {
    adminHardwareTbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 36px; color: var(--text-muted);">
          Đang tải danh mục kho linh kiện...
        </td>
      </tr>
    `;
  }

  try {
    const res = await fetch('/api/hardware?limit=100', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const json = await res.json();
    const items = (res.ok && json.data) ? json.data : [];
    adminHardwareCache = items;

    const totalCount = items.length;
    const lowStockCount = items.filter(it => (Number(it.stockQuantity) || 0) <= 2).length;
    const totalValuation = items.reduce((acc, it) => acc + (Number(it.price) || 0) * (Number(it.stockQuantity) || 0), 0);

    if (adminKpiTotal) adminKpiTotal.textContent = totalCount;
    if (adminKpiLow) adminKpiLow.textContent = lowStockCount;
    if (adminKpiValue) adminKpiValue.textContent = formatVND(totalValuation);

    applyAdminFilters();
    refreshAdminCrawlerState();
  } catch (err) {
    if (adminHardwareTbody) {
      adminHardwareTbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 36px; color: #ef4444;">
            Không thể tải dữ liệu kho từ server.
          </td>
        </tr>
      `;
    }
  }
}

export function initAdmin() {
  initAdminCrawler(loadAdminDashboard);
  if (adminSearchBox) adminSearchBox.addEventListener('input', applyAdminFilters);
  if (adminCatFilter) adminCatFilter.addEventListener('change', applyAdminFilters);
  if (adminStockFilter) adminStockFilter.addEventListener('change', applyAdminFilters);

  // Admin Add Modal
  if (adminOpenAddBtn) {
    adminOpenAddBtn.addEventListener('click', () => {
      if (adminAddModal) {
        if (adminAddAlert) {
          adminAddAlert.className = 'alert-banner';
          adminAddAlert.textContent = '';
        }
        if (adminAddForm) adminAddForm.reset();
        if (addInputCat) addInputCat.value = 'CPU';
        if (addInputStock) addInputStock.value = '10';
        adminAddModal.classList.add('is-active');
      }
    });
  }

  if (adminAddCloseBtn) {
    adminAddCloseBtn.addEventListener('click', () => {
      adminAddModal.classList.remove('is-active');
    });
  }

  if (adminAddForm) {
    adminAddForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const token = localStorage.getItem(ACCESS_KEY);
      if (!token) return;

      if (adminAddAlert) {
        adminAddAlert.className = 'alert-banner';
        adminAddAlert.textContent = '';
      }
      if (adminAddSubmitBtn) {
        adminAddSubmitBtn.disabled = true;
        adminAddSubmitBtn.textContent = 'Đang lưu linh kiện...';
      }

      let parsedSpecs = undefined;
      if (addInputSpecs && addInputSpecs.value.trim()) {
        try {
          parsedSpecs = JSON.parse(addInputSpecs.value.trim());
        } catch (err) {
          if (adminAddAlert) {
            adminAddAlert.className = 'alert-banner is-error';
            adminAddAlert.textContent = 'Định dạng JSON trong thông số kỹ thuật không hợp lệ.';
          }
          if (adminAddSubmitBtn) {
            adminAddSubmitBtn.disabled = false;
            adminAddSubmitBtn.textContent = 'Xác Nhận Thêm Vào Kho';
          }
          return;
        }
      }

      const payload = {
        categoryId: addInputCat.value,
        name: addInputName.value.trim(),
        brand: addInputBrand.value.trim(),
        price: Number(addInputPrice.value),
        stockQuantity: Number(addInputStock.value),
        specs: parsedSpecs
      };

      try {
        const res = await fetch('/api/admin/hardware', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (res.ok && json.success) {
          if (adminAddAlert) {
            adminAddAlert.className = 'alert-banner is-success';
            adminAddAlert.textContent = 'Đã thêm mới linh kiện vào kho thành công.';
          }
          setTimeout(() => {
            adminAddModal.classList.remove('is-active');
            loadAdminDashboard();
          }, 600);
        } else {
          if (adminAddAlert) {
            adminAddAlert.className = 'alert-banner is-error';
            adminAddAlert.textContent = json.error?.message || 'Không thể thêm linh kiện.';
          }
        }
      } catch (err) {
        if (adminAddAlert) {
          adminAddAlert.className = 'alert-banner is-error';
          adminAddAlert.textContent = 'Lỗi kết nối tới máy chủ.';
        }
      } finally {
        if (adminAddSubmitBtn) {
          adminAddSubmitBtn.disabled = false;
          adminAddSubmitBtn.textContent = 'Xác Nhận Thêm Vào Kho';
        }
      }
    });
  }

  // Admin Restock Close
  if (adminRestockCloseBtn) {
    adminRestockCloseBtn.addEventListener('click', () => {
      adminRestockModal.classList.remove('is-active');
    });
  }

  // Admin Restock Form Submit
  if (adminRestockForm) {
    adminRestockForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const token = localStorage.getItem(ACCESS_KEY);
      const id = restockItemId.value;
      if (!token || !id) return;

      if (adminRestockAlert) {
        adminRestockAlert.className = 'alert-banner';
        adminRestockAlert.textContent = '';
      }
      if (adminRestockSubmitBtn) {
        adminRestockSubmitBtn.disabled = true;
        adminRestockSubmitBtn.textContent = 'Đang cập nhật...';
      }

      const addStock = Number(restockInputAdd.value);
      const newPrice = restockInputPrice.value.trim() ? Number(restockInputPrice.value) : undefined;

      try {
        const res = await fetch(`/api/admin/hardware/${id}/stock`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({ addStock, newPrice })
        });
        const json = await res.json();
        if (res.ok && json.success) {
          if (adminRestockAlert) {
            adminRestockAlert.className = 'alert-banner is-success';
            adminRestockAlert.textContent = 'Đã cập nhật tồn kho và giá bán thành công.';
          }
          setTimeout(() => {
            adminRestockModal.classList.remove('is-active');
            loadAdminDashboard();
          }, 600);
        } else {
          if (adminRestockAlert) {
            adminRestockAlert.className = 'alert-banner is-error';
            adminRestockAlert.textContent = json.error?.message || 'Không thể cập nhật tồn kho.';
          }
        }
      } catch (err) {
        if (adminRestockAlert) {
          adminRestockAlert.className = 'alert-banner is-error';
          adminRestockAlert.textContent = 'Lỗi kết nối tới máy chủ.';
        }
      } finally {
        if (adminRestockSubmitBtn) {
          adminRestockSubmitBtn.disabled = false;
          adminRestockSubmitBtn.textContent = 'Cập Nhật Kho & Giá';
        }
      }
    });
  }
}

// Global window actions for table row click events
window.openAdminRestockModal = function(encodedItemJson) {
  try {
    const item = JSON.parse(decodeURIComponent(encodedItemJson));
    if (restockItemId) restockItemId.value = item.id;
    if (restockItemName) restockItemName.textContent = `[${item.categoryId}] ${item.name} — Tồn kho: ${item.stockQuantity} — ${formatVND(item.price)}`;
    if (restockInputAdd) restockInputAdd.value = '5';
    if (restockInputPrice) restockInputPrice.value = '';
    if (adminRestockAlert) {
      adminRestockAlert.className = 'alert-banner';
      adminRestockAlert.textContent = '';
    }
    if (adminRestockModal) adminRestockModal.classList.add('is-active');
  } catch (e) {}
};

window.confirmDeleteHardwareItem = async function(id, encodedName) {
  const name = decodeURIComponent(encodedName || id);
  const ok = confirm(`CẢNH BÁO QUẢN TRỊ:\nBạn có chắc chắn muốn ngừng kinh doanh sản phẩm "${name}"?\nSản phẩm sẽ bị ẩn khỏi danh mục công khai.`);
  if (!ok) return;

  const token = localStorage.getItem(ACCESS_KEY);
  if (!token) return;

  try {
    const res = await fetch(`/api/admin/hardware/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const json = await res.json();
    if (res.ok && json.success) {
      showStorefrontToast('✓ Đã ngừng kinh doanh linh kiện thành công.');
      loadAdminDashboard();
    } else {
      showStorefrontToast('⚠ ' + (json.error?.message || 'Không thể xóa mềm linh kiện.'), { tone: 'error' });
    }
  } catch (err) {
    showStorefrontToast('⚠ Lỗi kết nối tới máy chủ khi ngừng bán sản phẩm.', { tone: 'error' });
  }
};
