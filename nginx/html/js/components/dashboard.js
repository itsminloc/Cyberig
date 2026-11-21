/**
 * Customer Dashboard Component (#dashboard)
 * 100% Icon-Free, Pure Typographic & Sharp Industrial Design Engine
 */
import { ACCESS_KEY, USER_KEY, formatVND, formatDate } from '../config.js';
import { authModal, modalAlert } from './modals.js';
import { navigateTo } from '../router.js';

const dashSkeleton = document.getElementById('dash-skeleton');
const dashContentRoot = document.getElementById('dash-content-root');
const dashGreetingName = document.getElementById('dash-greeting-name');
const dashUserRoleBadge = document.getElementById('dash-user-role-badge');
const telemetryOrdersCount = document.getElementById('telemetry-orders-count');
const telemetryRepairsCount = document.getElementById('telemetry-repairs-count');
const dashTabOrdersBtn = document.getElementById('dash-tab-orders-btn');
const dashTabRepairsBtn = document.getElementById('dash-tab-repairs-btn');
const dashOrdersBadge = document.getElementById('dash-orders-badge');
const dashRepairsBadge = document.getElementById('dash-repairs-badge');
const dashOrdersList = document.getElementById('dash-orders-list');
const dashRepairsList = document.getElementById('dash-repairs-list');
const dashTabOrdersContent = document.getElementById('dash-tab-orders-content');
const dashTabRepairsContent = document.getElementById('dash-tab-repairs-content');
const dashOpenTicketModalBtn = document.getElementById('dash-open-ticket-modal-btn');

// Modal Elements
const ticketModal = document.getElementById('ticket-create-modal');
const ticketModalCloseBtn = document.getElementById('ticket-modal-close-btn');
const ticketModalCancelBtn = document.getElementById('ticket-modal-cancel-btn');
const ticketModalAlert = document.getElementById('ticket-modal-alert');
const ticketCreateForm = document.getElementById('ticket-create-form');
const ticketModalSuccess = document.getElementById('ticket-modal-success');
const ticketModalResultCode = document.getElementById('ticket-modal-result-code');
const ticketModalTrackBtn = document.getElementById('ticket-modal-track-btn');
const ticketModalDoneBtn = document.getElementById('ticket-modal-done-btn');
const originOptCyberrig = document.getElementById('origin-opt-cyberrig');
const originOptExternal = document.getElementById('origin-opt-external');
const ticketInputOrigin = document.getElementById('ticket-input-origin');

let currentCreatedTicketCode = '';

export function initDashboard() {
  // Tab switching
  if (dashTabOrdersBtn && dashTabRepairsBtn) {
    dashTabOrdersBtn.addEventListener('click', () => {
      dashTabOrdersBtn.classList.add('is-active');
      dashTabRepairsBtn.classList.remove('is-active');
      if (dashTabOrdersContent) dashTabOrdersContent.style.display = 'block';
      if (dashTabRepairsContent) dashTabRepairsContent.style.display = 'none';
    });

    dashTabRepairsBtn.addEventListener('click', () => {
      dashTabRepairsBtn.classList.add('is-active');
      dashTabOrdersBtn.classList.remove('is-active');
      if (dashTabRepairsContent) dashTabRepairsContent.style.display = 'block';
      if (dashTabOrdersContent) dashTabOrdersContent.style.display = 'none';
    });
  }

  // Open ticket creation modal
  if (dashOpenTicketModalBtn) {
    dashOpenTicketModalBtn.addEventListener('click', () => {
      openTicketModal();
    });
  }

  // Origin selector toggle in modal
  if (originOptCyberrig && originOptExternal && ticketInputOrigin) {
    originOptCyberrig.addEventListener('click', () => {
      originOptCyberrig.classList.add('is-selected');
      originOptExternal.classList.remove('is-selected');
      ticketInputOrigin.value = 'CYBERRIG';
    });

    originOptExternal.addEventListener('click', () => {
      originOptExternal.classList.add('is-selected');
      originOptCyberrig.classList.remove('is-selected');
      ticketInputOrigin.value = 'EXTERNAL';
    });
  }

  // Modal close handlers
  const closeModal = () => {
    if (ticketModal) ticketModal.classList.remove('is-active');
  };

  if (ticketModalCloseBtn) ticketModalCloseBtn.addEventListener('click', closeModal);
  if (ticketModalCancelBtn) ticketModalCancelBtn.addEventListener('click', closeModal);

  if (ticketModalDoneBtn) {
    ticketModalDoneBtn.addEventListener('click', () => {
      closeModal();
      loadCustomerDashboard();
    });
  }

  if (ticketModalTrackBtn) {
    ticketModalTrackBtn.addEventListener('click', () => {
      closeModal();
      if (currentCreatedTicketCode) {
        navigateTo(`/repair-tracking?code=${currentCreatedTicketCode}`);
      } else {
        navigateTo('/repair-tracking');
      }
    });
  }

  // Form submission
  if (ticketCreateForm) {
    ticketCreateForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleTicketSubmit();
    });
  }
}

export function openTicketModal(prefill = {}) {
  if (!ticketModal) return;

  // Reset form and state
  if (ticketCreateForm) {
    ticketCreateForm.reset();
    ticketCreateForm.style.display = 'block';
  }
  if (ticketModalSuccess) ticketModalSuccess.style.display = 'none';
  if (ticketModalAlert) ticketModalAlert.style.display = 'none';

  // Get active user info
  const rawUser = localStorage.getItem(USER_KEY);
  let user = null;
  try { if (rawUser) user = JSON.parse(rawUser); } catch (e) {}

  const nameInput = document.getElementById('ticket-input-name');
  const emailInput = document.getElementById('ticket-input-email');
  const phoneInput = document.getElementById('ticket-input-phone');
  const deviceInput = document.getElementById('ticket-input-device');

  if (user) {
    if (nameInput && !nameInput.value) nameInput.value = user.fullName || '';
    if (emailInput && !emailInput.value) emailInput.value = user.email || '';
    if (phoneInput && !phoneInput.value && user.phone) phoneInput.value = user.phone;
  }

  if (prefill.device && deviceInput) deviceInput.value = prefill.device;
  if (prefill.origin && ticketInputOrigin) {
    ticketInputOrigin.value = prefill.origin;
    if (prefill.origin === 'EXTERNAL') {
      originOptExternal?.click();
    } else {
      originOptCyberrig?.click();
    }
  }

  ticketModal.classList.add('is-active');
}

async function handleTicketSubmit() {
  const submitBtn = document.getElementById('ticket-modal-submit-btn');
  const token = localStorage.getItem(ACCESS_KEY);

  const customerName = document.getElementById('ticket-input-name')?.value;
  const customerPhone = document.getElementById('ticket-input-phone')?.value;
  const customerEmail = document.getElementById('ticket-input-email')?.value;
  const deviceType = document.getElementById('ticket-input-device')?.value;
  const serialNumber = document.getElementById('ticket-input-serial')?.value;
  const initialCondition = document.getElementById('ticket-input-condition')?.value;
  const faultDescription = document.getElementById('ticket-input-fault')?.value;
  const deviceOrigin = ticketInputOrigin?.value || 'CYBERRIG';
  const priority = document.getElementById('ticket-input-priority')?.value || 'STANDARD';

  if (ticketModalAlert) ticketModalAlert.style.display = 'none';

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '[ ĐANG KHỞI TẠO PHIẾU... ]';
    }

    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/tickets', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        customerName,
        customerPhone,
        customerEmail,
        deviceType,
        serialNumber,
        initialCondition,
        faultDescription,
        deviceOrigin,
        priority,
      }),
    });

    const json = await res.json();

    if (res.ok && json.success && json.data) {
      const ticket = json.data;
      currentCreatedTicketCode = ticket.ticketCode;

      if (ticketCreateForm) ticketCreateForm.style.display = 'none';
      if (ticketModalSuccess) {
        ticketModalSuccess.style.display = 'block';
        if (ticketModalResultCode) ticketModalResultCode.textContent = ticket.ticketCode;
      }
    } else {
      if (ticketModalAlert) {
        ticketModalAlert.style.display = 'block';
        ticketModalAlert.style.background = 'rgba(239, 68, 68, 0.15)';
        ticketModalAlert.style.color = '#ef4444';
        ticketModalAlert.style.border = '1px solid rgba(239, 68, 68, 0.4)';
        ticketModalAlert.textContent = json.error?.message || 'Không thể tạo phiếu sửa chữa. Vui lòng thử lại.';
      }
    }
  } catch (err) {
    if (ticketModalAlert) {
      ticketModalAlert.style.display = 'block';
      ticketModalAlert.style.background = 'rgba(239, 68, 68, 0.15)';
      ticketModalAlert.style.color = '#ef4444';
      ticketModalAlert.style.border = '1px solid rgba(239, 68, 68, 0.4)';
      ticketModalAlert.textContent = 'Lỗi kết nối máy chủ. Vui lòng kiểm tra lại đường truyền.';
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '[ XÁC NHẬN TẠO PHIẾU TIẾP NHẬN ]';
    }
  }
}

export async function loadCustomerDashboard() {
  const token = localStorage.getItem(ACCESS_KEY);
  const rawUser = localStorage.getItem(USER_KEY);
  let user = null;
  try {
    if (rawUser) user = JSON.parse(rawUser);
  } catch (e) {}

  if (!token || !user) {
    if (dashSkeleton) dashSkeleton.style.display = 'block';
    if (dashContentRoot) dashContentRoot.style.display = 'none';
    if (authModal) {
      authModal.classList.add('is-active');
      if (modalAlert) {
        modalAlert.className = 'alert-banner is-error';
        modalAlert.textContent = 'Vui lòng đăng nhập tài khoản khách hàng để truy cập Dàn máy của tôi!';
      }
    }
    return;
  }

  if (dashSkeleton) dashSkeleton.style.display = 'none';
  if (dashContentRoot) dashContentRoot.style.display = 'block';
  if (dashGreetingName) dashGreetingName.textContent = user.fullName || user.email;
  if (dashUserRoleBadge) dashUserRoleBadge.textContent = user.role;

  if (dashOrdersList) {
    dashOrdersList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted); font-family: var(--font-mono); font-size: 0.84rem;">[ ĐANG TRUY VẤN CƠ SỞ DỮ LIỆU ĐƠN HÀNG... ]</div>';
  }
  if (dashRepairsList) {
    dashRepairsList.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-muted); font-family: var(--font-mono); font-size: 0.84rem;">[ ĐANG TRUY VẤN LỊCH SỬ THIẾT BỊ SỬA CHỮA... ]</div>';
  }

  try {
    const [ordersRes, ticketsRes] = await Promise.all([
      fetch('/api/customer/orders', { headers: { 'Authorization': 'Bearer ' + token } }),
      fetch('/api/customer/tickets', { headers: { 'Authorization': 'Bearer ' + token } })
    ]);

    const ordersJson = await ordersRes.json();
    const ticketsJson = await ticketsRes.json();

    const orders = (ordersRes.ok && ordersJson.data) ? ordersJson.data : [];
    const tickets = (ticketsRes.ok && ticketsJson.data) ? ticketsJson.data : [];

    if (telemetryOrdersCount) telemetryOrdersCount.textContent = orders.length;
    const activeRepairs = tickets.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
    if (telemetryRepairsCount) telemetryRepairsCount.textContent = activeRepairs.length;
    if (dashOrdersBadge) dashOrdersBadge.textContent = orders.length;
    if (dashRepairsBadge) dashRepairsBadge.textContent = tickets.length;

    // Render Orders Table
    if (dashOrdersList) {
      if (orders.length === 0) {
        dashOrdersList.innerHTML = `
          <div class="dash-empty-card">
            <span class="dash-empty-badge">[ HỆ THỐNG ĐƠN HÀNG TRỐNG ]</span>
            <div class="dash-empty-title">CHƯA CÓ ĐƠN HÀNG NÀO</div>
            <div class="dash-empty-desc">Bạn chưa khởi tạo đơn đặt cấu hình PC nào trong hệ thống. Hãy chọn các linh kiện chuẩn công nghiệp để xây dựng cấu hình tối ưu.</div>
            <a href="/builder" class="tech-btn tech-btn-accent">[ XÂY DỰNG DÀN PC ĐẦU TIÊN ]</a>
          </div>
        `;
      } else {
        dashOrdersList.innerHTML = `
          <div class="data-table-frame">
            <table class="minimal-table">
              <thead>
                <tr>
                  <th>MÃ ĐƠN HÀNG</th>
                  <th>NGÀY KHỞI TẠO</th>
                  <th>TRẠNG THÁI</th>
                  <th style="text-align: right;">TỔNG THANH TOÁN</th>
                  <th>CHI TIẾT CẤU HÌNH</th>
                </tr>
              </thead>
              <tbody>
                ${orders.map(ord => {
                  const items = ord.items || [];
                  const itemsSummary = items.map(i => `${i.name || i.hardwareId} (x${i.quantity})`).join(', ');
                  return `
                    <tr>
                      <td style="font-family: var(--font-mono); font-weight: 700; color: var(--accent-primary);">
                        #${ord.orderCode || ord.id.substring(0, 8).toUpperCase()}
                      </td>
                      <td style="color: var(--text-muted); font-size: 0.8rem; font-family: var(--font-mono);">
                        ${formatDate(ord.createdAt)}
                      </td>
                      <td>
                        <span class="status-pill-mono ${ord.status === 'CONFIRMED' ? 'is-completed' : 'is-received'}">
                          [ ${ord.status} ]
                        </span>
                      </td>
                      <td style="text-align: right; font-family: var(--font-mono); font-weight: 800; color: var(--text-main);">
                        ${formatVND(ord.totalPrice)}
                      </td>
                      <td style="color: var(--text-muted); font-size: 0.82rem; max-width: 320px; line-height: 1.4;">
                        ${itemsSummary || 'Chi tiết cấu hình PC CyberRig'}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    }

    // Render Repairs Table
    if (dashRepairsList) {
      if (tickets.length === 0) {
        dashRepairsList.innerHTML = `
          <div class="dash-empty-card">
            <span class="dash-empty-badge">[ HÀNG ĐỢI SỬA CHỮA TRỐNG ]</span>
            <div class="dash-empty-title">KHÔNG CÓ THIẾT BỊ NÀO ĐANG XỬ LÝ</div>
            <div class="dash-empty-desc">Bạn không có máy hoặc linh kiện nào đang trong quy trình bảo hành/sửa chữa tại CyberRig Lab.</div>
            <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
              <button type="button" class="tech-btn tech-btn-accent" onclick="window.dashOpenModal()">
                [ + TẠO PHIẾU KIỂM TRA MỚI ]
              </button>
              <a href="/repair-tracking" class="tech-btn tech-btn-outline">
                [ TRA CỨU BẰNG MÃ PHIẾU ]
              </a>
            </div>
          </div>
        `;
      } else {
        dashRepairsList.innerHTML = `
          <div class="data-table-frame">
            <table class="minimal-table">
              <thead>
                <tr>
                  <th>MÃ PHIẾU</th>
                  <th>THIẾT BỊ / LINH KIỆN</th>
                  <th>NGUỒN GỐC</th>
                  <th>NGÀY TIẾP NHẬN</th>
                  <th>TRẠNG THÁI TIẾN ĐỘ</th>
                  <th style="text-align: right;">THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                ${tickets.map(tk => {
                  const condition = tk.initialCondition || '';
                  const isExternal = condition.includes('MUA BÊN NGOÀI');
                  const originBadge = isExternal
                    ? '<span class="origin-tag origin-external">[ LINH KIỆN NGOÀI ]</span>'
                    : '<span class="origin-tag origin-cyberrig">[ MUA TẠI CYBERRIG ]</span>';

                  const statusClass = `is-${(tk.status || '').toLowerCase()}`;

                  return `
                    <tr>
                      <td style="font-family: var(--font-mono); font-weight: 800; color: #38bdf8;">
                        #${tk.ticketCode}
                      </td>
                      <td>
                        <div style="font-weight: 700; color: var(--text-main); margin-bottom: 2px;">
                          ${tk.deviceType || tk.deviceName || 'PC Gaming'}
                        </div>
                        <div style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-muted);">
                          S/N: ${tk.serialNumber || 'N/A'}
                        </div>
                      </td>
                      <td>
                        ${originBadge}
                      </td>
                      <td style="color: var(--text-muted); font-size: 0.8rem; font-family: var(--font-mono);">
                        ${formatDate(tk.createdAt)}
                      </td>
                      <td>
                        <span class="status-pill-mono ${statusClass}">
                          [ ${tk.status} ]
                        </span>
                      </td>
                      <td style="text-align: right;">
                        <a href="/repair-tracking?code=${tk.ticketCode}" class="tech-btn tech-btn-outline" style="padding: 6px 14px; font-size: 0.74rem;">
                          [ CHI TIẾT TIẾN TRÌNH ]
                        </a>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    }

  } catch (err) {
    if (dashOrdersList) dashOrdersList.innerHTML = '<div style="color: #ef4444; padding: 24px; font-family: var(--font-mono); font-size: 0.85rem;">[ LỖI KẾT NỐI // KHÔNG THỂ TẢI DỮ LIỆU TỪ MÁY CHỦ ]</div>';
    if (dashRepairsList) dashRepairsList.innerHTML = '<div style="color: #ef4444; padding: 24px; font-family: var(--font-mono); font-size: 0.85rem;">[ LỖI KẾT NỐI // KHÔNG THỂ TẢI DỮ LIỆU TỪ MÁY CHỦ ]</div>';
  }
}

// Global window helper for button click inside HTML strings
window.dashOpenModal = () => openTicketModal();
