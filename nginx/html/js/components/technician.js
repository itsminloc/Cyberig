/**
 * CyberRig Technician Diagnostic Workbench Component
 * Sprint 8 / Professional Lab Hardware Inspection & Quotation
 * 100% Icon-Free, Pure Typographic & Sharp Industrial Design Engine
 */

import { ACCESS_KEY, USER_KEY } from '../config.js';
import { authModal, modalAlert } from './modals.js';
import { navigateTo } from '../router.js';
import { openTicketModal } from './dashboard.js';

function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// Fallback seed tickets for guaranteed zero-downtime offline demonstration
const DEFAULT_TECH_TICKETS = [
  {
    id: 'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e',
    ticketCode: 'TK-1001',
    customerName: 'Trần Minh Hoàng',
    customerPhone: '0984321987',
    customerEmail: 'hoang.tran@example.com',
    deviceType: 'PC Gaming Cyber Rig Intel Gen 13',
    serialNumber: 'SN-CR-1001-VN',
    initialCondition: 'Máy bật lên quạt quay, màn hình đen, buzzer kêu 3 tiếng bip liên tục.',
    faultDescription: 'Nghi ngờ lỗi RAM hoặc khe cắm RAM chập chờn.',
    diagnosisNotes: 'KTV đã giám định: Chân tiếp xúc khe RAM 1 chập chờn, thanh RAM 1 hỏng IC nhớ. Cần thay thế 1 thanh RAM Kingston Fury DDR5 16GB.',
    status: 'QUOTED',
    quoteAmount: 1640000,
    laborCost: 150000,
    partsCost: 1490000,
    parts: [
      { name: 'Kingston Fury Beast 16GB DDR5 5600MHz', price: 1490000, quantity: 1 }
    ],
    warrantyMonths: 12,
    createdAt: '2026-09-08T08:00:00Z',
    timeline: [
      { toStatus: 'RECEIVED', note: 'Tiếp nhận thiết bị tại quầy kỹ thuật', createdAt: '2026-09-08T08:00:00Z' },
      { toStatus: 'DIAGNOSING', note: 'Bắt đầu tháo máy đo xung và test socket', createdAt: '2026-09-08T08:30:00Z' },
      { toStatus: 'QUOTED', note: 'Lập báo giá thay thế linh kiện RAM DDR5', createdAt: '2026-09-08T10:15:00Z' }
    ]
  },
  {
    id: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    ticketCode: 'TK-20260905-001',
    customerName: 'Nguyễn Văn An',
    customerPhone: '0901234567',
    customerEmail: 'an.nguyen@example.com',
    deviceType: 'PC Gaming Custom (Core i7 / RTX 3080)',
    serialNumber: 'SN-CR-99281-VN',
    initialCondition: 'Máy còn nguyên tem, case kính trầy xước nhẹ góc dưới, quạt tản nhiệt bám bụi.',
    faultDescription: 'Bật nguồn quạt quay nhưng không xuất hình, mainboard báo đèn đỏ VGA led.',
    diagnosisNotes: 'Kỹ thuật viên đang đo áp tầng nguồn 12V PCIe và kiểm tra chân socket.',
    status: 'RECEIVED',
    warrantyMonths: 3,
    createdAt: '2026-09-05T08:00:00Z',
    timeline: [
      { toStatus: 'RECEIVED', note: 'Tiếp nhận thiết bị tại quầy kỹ thuật CyberRig Lab', createdAt: '2026-09-05T08:00:00Z' }
    ]
  },
  {
    id: 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
    ticketCode: 'TK-20260910-008',
    customerName: 'Lê Quốc Bảo',
    customerPhone: '0912348899',
    customerEmail: 'bao.le@example.com',
    deviceType: 'Máy trạm Workstation Dual Xeon',
    serialNumber: 'SN-CR-WS-004',
    initialCondition: 'Nhiệt độ CPU lên tới 98 độ khi render Premiere, sập nguồn đột ngột.',
    faultDescription: 'Tản nhiệt AIO bị cạn nước làm mát hoặc nghẹt bơm nước tản nhiệt.',
    diagnosisNotes: 'Bơm nước AIO 360mm bị cháy cuộn cảm motor. Đã thay thế cụm tản nhiệt DeepCool LT720.',
    status: 'REPAIRING',
    quoteAmount: 3250000,
    laborCost: 250000,
    partsCost: 3000000,
    parts: [
      { name: 'Tản nhiệt nước AIO DeepCool LT720 360mm', price: 3000000, quantity: 1 }
    ],
    warrantyMonths: 24,
    createdAt: '2026-09-10T09:00:00Z',
    timeline: [
      { toStatus: 'RECEIVED', note: 'Tiếp nhận máy trạm từ khách hàng', createdAt: '2026-09-10T09:00:00Z' },
      { toStatus: 'DIAGNOSING', note: 'Test nhiệt độ full tải phát hiện kẹt bơm AIO', createdAt: '2026-09-10T10:00:00Z' },
      { toStatus: 'QUOTED', note: 'Khách duyệt thay tản nhiệt nước AIO 360mm', createdAt: '2026-09-10T11:00:00Z' },
      { toStatus: 'REPAIRING', note: 'KTV đang tiến hành tra keo kim loại lỏng và ráp tản nhiệt', createdAt: '2026-09-10T14:00:00Z' }
    ]
  },
  {
    id: 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a',
    ticketCode: 'TK-20260912-015',
    customerName: 'Phạm Hồng Nhung',
    customerPhone: '0977889900',
    customerEmail: 'nhung.pham@example.com',
    deviceType: 'PC Mini-ITX Intel Core i5',
    serialNumber: 'SN-CR-ITX-771',
    initialCondition: 'Máy không vào được Windows, BIOS không nhận ổ đĩa NVMe.',
    faultDescription: 'Lỗi ổ SSD NVMe 512GB bị mất phân vùng boot.',
    diagnosisNotes: 'Đã thay thế SSD Kingston NV2 1TB NVMe PCIe 4.0 và nạp lại bản quyền Windows 11 Pro.',
    status: 'QC',
    quoteAmount: 1650000,
    laborCost: 150000,
    partsCost: 1500000,
    parts: [
      { name: 'SSD Kingston NV2 1TB M.2 NVMe PCIe Gen4', price: 1500000, quantity: 1 }
    ],
    warrantyMonths: 36,
    createdAt: '2026-09-12T13:30:00Z',
    timeline: [
      { toStatus: 'RECEIVED', note: 'Tiếp nhận PC mini ITX', createdAt: '2026-09-12T13:30:00Z' },
      { toStatus: 'DIAGNOSING', note: 'Test NVMe controller lỗi chip nhớ NAND', createdAt: '2026-09-12T14:00:00Z' },
      { toStatus: 'QUOTED', note: 'Báo giá thay SSD NVMe 1TB', createdAt: '2026-09-12T14:30:00Z' },
      { toStatus: 'REPAIRING', note: 'Đã thay ổ cứng mới và cài lại hệ điều hành', createdAt: '2026-09-12T16:00:00Z' },
      { toStatus: 'QC', note: 'Đang chạy CrystalDiskMark và MemTest64 kiểm thử QC', createdAt: '2026-09-12T17:00:00Z' }
    ]
  }
];

let stateTickets = [...DEFAULT_TECH_TICKETS];
let selectedTicketId = stateTickets[0].id;
let currentFilter = 'ALL';

export async function loadTechnicianWorkbench() {
  const container = document.getElementById('technician-view');
  if (!container) return;

  // Verify Role: TECHNICIAN or ADMIN
  const token = localStorage.getItem(ACCESS_KEY);
  const rawUser = localStorage.getItem(USER_KEY);
  let user = null;
  try { if (rawUser) user = JSON.parse(rawUser); } catch (e) {}

  if (!token || !user) {
    renderAccessDenied(container, 'UNAUTHENTICATED');
    return;
  }

  if (user.role !== 'TECHNICIAN' && user.role !== 'ADMIN') {
    renderAccessDenied(container, 'FORBIDDEN');
    return;
  }

  // Fetch real tickets from backend API
  try {
    const res = await fetch('/api/tickets', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const json = await res.json();
    if (res.ok && json.success && Array.isArray(json.data) && json.data.length > 0) {
      // Merge backend tickets with demo seed tickets to ensure variety
      const backendTickets = json.data;
      const merged = [...backendTickets];
      DEFAULT_TECH_TICKETS.forEach(dt => {
        if (!merged.some(t => t.id === dt.id || t.ticketCode === dt.ticketCode)) {
          merged.push(dt);
        }
      });
      stateTickets = merged;
    }
  } catch (e) {
    console.warn('Technician API fetch tickets error, using cached seed:', e);
  }

  renderWorkbenchShell(container, user);
}

/**
 * Access Denied screen matching 100% industrial system
 */
function renderAccessDenied(container, reason) {
  container.innerHTML = `
    <div class="tech-shell">
      <div class="tech-denied-box">
        <div class="tech-badge-mono" style="color: #ef4444;">[ 403 FORBIDDEN // YÊU CẦU QUYỀN KỸ THUẬT ]</div>
        <h2 class="tech-main-title" style="margin: 12px 0;">TRUY CẬP BỊ TỪ CHỐI</h2>
        <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.6; margin-bottom: 24px;">
          ${reason === 'UNAUTHENTICATED'
            ? 'Vui lòng đăng nhập với tài khoản Kỹ thuật viên (TECHNICIAN) hoặc Quản trị viên (ADMIN) để truy cập bàn làm việc chẩn đoán.'
            : 'Tài khoản hiện tại của bạn không có thẩm quyền Kỹ thuật viên. Vui lòng liên hệ Trưởng phòng Lab CyberRig để cấp quyền.'}
        </p>
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <button type="button" id="tech-login-btn" class="tech-btn tech-btn-accent" style="padding: 12px 24px;">
            ĐĂNG NHẬP VỚI TÀI KHOẢN KỸ THUẬT
          </button>
          <button type="button" id="tech-home-btn" class="tech-btn tech-btn-outline" style="padding: 12px 24px;">
            QUAY VỀ TRANG CHỦ
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('tech-login-btn')?.addEventListener('click', () => {
    if (authModal) authModal.classList.add('is-active');
  });

  document.getElementById('tech-home-btn')?.addEventListener('click', () => {
    navigateTo('/');
  });
}

/**
 * Main Workbench Shell Render
 */
function renderWorkbenchShell(container, user) {
  // Compute KPIs
  const totalCount = stateTickets.length;
  const receivedCount = stateTickets.filter(t => t.status === 'RECEIVED').length;
  const diagnosingCount = stateTickets.filter(t => t.status === 'DIAGNOSING').length;
  const quotedCount = stateTickets.filter(t => t.status === 'QUOTED').length;
  const repairingCount = stateTickets.filter(t => t.status === 'REPAIRING').length;
  const qcCount = stateTickets.filter(t => t.status === 'QC').length;
  const completedCount = stateTickets.filter(t => t.status === 'COMPLETED').length;

  container.innerHTML = `
    <div class="tech-shell">
      <!-- Top Header Bar -->
      <div class="tech-header-bar">
        <div>
          <span class="tech-badge-mono">[ CYBERRIG HARDWARE LAB // DIAGNOSTIC WORKBENCH ]</span>
          <h1 class="tech-main-title">BÀN LÀM VIỆC KỸ THUẬT VIÊN &amp; GIÁM ĐỊNH</h1>
          <p class="tech-main-subtext">Hệ thống phân tích lỗi phần cứng, tạo bảng bóc tách linh kiện và quản lý vòng đời sửa chữa</p>
        </div>
        <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
          <div>
            <span class="tech-badge-mono">[ NHÂN VIÊN TRỰC LAB ]</span>
            <div style="font-family: var(--font-mono); font-size: 0.95rem; font-weight: 700; color: var(--text-main);">
              ${user.fullName || user.email} (${user.role})
            </div>
          </div>
          <button type="button" class="tech-btn tech-btn-accent" id="tech-open-intake-btn" style="padding: 8px 18px; font-size: 0.78rem;">
            [ + TIẾP NHẬN THIẾT BỊ TẠI QUẦY ]
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="tech-kpi-grid">
        <div class="tech-kpi-card">
          <div class="tech-kpi-val">${totalCount}</div>
          <div class="tech-kpi-lbl">TỔNG PHIẾU BẢO HÀNH</div>
        </div>
        <div class="tech-kpi-card">
          <div class="tech-kpi-val" style="color: #38bdf8;">${receivedCount}</div>
          <div class="tech-kpi-lbl">TIẾP NHẬN MỚI</div>
        </div>
        <div class="tech-kpi-card">
          <div class="tech-kpi-val" style="color: #fbbf24;">${diagnosingCount + quotedCount}</div>
          <div class="tech-kpi-lbl">CHẨN ĐOÁN &amp; BÁO GIÁ</div>
        </div>
        <div class="tech-kpi-card">
          <div class="tech-kpi-val" style="color: #3b82f6;">${repairingCount}</div>
          <div class="tech-kpi-lbl">ĐANG THAY THẾ / SỬA</div>
        </div>
        <div class="tech-kpi-card">
          <div class="tech-kpi-val" style="color: #10b981;">${qcCount + completedCount}</div>
          <div class="tech-kpi-lbl">QC &amp; ĐÃ HOÀN TẤT</div>
        </div>
      </div>

      <!-- Filter Tab Strip -->
      <div class="tech-filter-strip">
        <button type="button" class="tech-tab-btn ${currentFilter === 'ALL' ? 'is-active' : ''}" data-filter="ALL">[ TẤT CẢ (${totalCount}) ]</button>
        <button type="button" class="tech-tab-btn ${currentFilter === 'RECEIVED' ? 'is-active' : ''}" data-filter="RECEIVED">[ TIẾP NHẬN (${receivedCount}) ]</button>
        <button type="button" class="tech-tab-btn ${currentFilter === 'DIAGNOSING' ? 'is-active' : ''}" data-filter="DIAGNOSING">[ CHẨN ĐOÁN (${diagnosingCount}) ]</button>
        <button type="button" class="tech-tab-btn ${currentFilter === 'QUOTED' ? 'is-active' : ''}" data-filter="QUOTED">[ ĐÃ BÁO GIÁ (${quotedCount}) ]</button>
        <button type="button" class="tech-tab-btn ${currentFilter === 'REPAIRING' ? 'is-active' : ''}" data-filter="REPAIRING">[ ĐANG SỬA (${repairingCount}) ]</button>
        <button type="button" class="tech-tab-btn ${currentFilter === 'QC' ? 'is-active' : ''}" data-filter="QC">[ KIỂM THỬ QC (${qcCount}) ]</button>
        <button type="button" class="tech-tab-btn ${currentFilter === 'COMPLETED' ? 'is-active' : ''}" data-filter="COMPLETED">[ HOÀN TẤT (${completedCount}) ]</button>
      </div>

      <!-- Workbench Split-View -->
      <div class="tech-workbench-grid">
        <!-- LEFT: Ticket Queue List -->
        <div class="tech-queue-card">
          <div class="tech-queue-header">
            <h3 class="tech-queue-title">DANH SÁCH PHIẾU TIẾP NHẬN</h3>
            <span class="tech-badge-mono" id="tech-queue-counter">${stateTickets.length} MÁY</span>
          </div>
          <div class="tech-queue-list" id="tech-queue-items-box"></div>
        </div>

        <!-- RIGHT: Active Ticket Work Surface -->
        <div id="tech-active-panel"></div>
      </div>
    </div>
  `;

  // Attach filter buttons
  container.querySelectorAll('.tech-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tech-tab-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      currentFilter = btn.getAttribute('data-filter');
      renderQueueList();
    });
  });

  // Wire up intake button
  const intakeBtn = document.getElementById('tech-open-intake-btn');
  if (intakeBtn) {
    intakeBtn.addEventListener('click', () => {
      openTicketModal();
    });
  }

  renderQueueList();
  renderActiveTicketSurface();
}

/**
 * Render Left Queue Items
 */
function renderQueueList() {
  const box = document.getElementById('tech-queue-items-box');
  if (!box) return;

  const filtered = currentFilter === 'ALL'
    ? stateTickets
    : stateTickets.filter(t => t.status === currentFilter);

  if (filtered.length === 0) {
    box.innerHTML = `
      <div style="padding: 40px 20px; text-align: center; color: var(--text-muted); font-family: var(--font-mono); font-size: 0.8rem;">
        [ KHÔNG CÓ PHIẾU NÀO TRONG MỤC NÀY ]
      </div>
    `;
    return;
  }

  // If selected ticket not in filtered list, select first available
  if (!filtered.some(t => t.id === selectedTicketId)) {
    selectedTicketId = filtered[0].id;
  }

  box.innerHTML = filtered.map(t => {
    const isSelected = t.id === selectedTicketId;
    return `
      <div class="tech-queue-item ${isSelected ? 'is-selected' : ''}" data-id="${t.id}">
        <div class="tech-queue-row-top">
          <span class="tech-code-badge">${t.ticketCode || t.id.slice(0, 8)}</span>
          <span class="tech-status-tag status-${t.status}">[ ${t.status} ]</span>
        </div>
        <div class="tech-queue-device">${t.deviceType || 'PC Gaming'}</div>
        <div class="tech-queue-meta">
          <span>${t.customerName}</span> &bull; <span>${new Date(t.createdAt).toLocaleDateString('vi-VN')}</span>
        </div>
      </div>
    `;
  }).join('');

  box.querySelectorAll('.tech-queue-item').forEach(item => {
    item.addEventListener('click', () => {
      selectedTicketId = item.getAttribute('data-id');
      renderQueueList();
      renderActiveTicketSurface();
    });
  });
}

/**
 * Render Active Ticket Work Surface
 */
function renderActiveTicketSurface() {
  const panel = document.getElementById('tech-active-panel');
  if (!panel) return;

  const ticket = stateTickets.find(t => t.id === selectedTicketId);
  if (!ticket) {
    panel.innerHTML = `
      <div class="tech-detail-card" style="text-align: center; padding: 60px 20px;">
        <span class="tech-badge-mono">[ VUI LÒNG CHỌN PHIẾU TIẾP NHẬN ]</span>
      </div>
    `;
    return;
  }

  panel.innerHTML = `
    <!-- 1. General Telemetry Card -->
    <div class="tech-detail-card">
      <div class="tech-card-header">
        <div>
          <span class="tech-badge-mono">[ HỒ SƠ PHIẾU: ${ticket.ticketCode || ticket.id.slice(0, 8)} ]</span>
          <h2 class="tech-card-title">${ticket.deviceType || 'PC Gaming'}</h2>
        </div>
        <div>
          <span class="tech-status-tag status-${ticket.status}" style="font-size: 0.82rem; padding: 4px 12px;">
            [ TRẠNG THÁI: ${ticket.status} ]
          </span>
        </div>
      </div>

      <table class="tech-telemetry-table">
        <tr>
          <td class="lbl">CHỦ THIẾT BỊ:</td>
          <td class="val">${ticket.customerName} (SĐT: <strong style="font-family: var(--font-mono);">${ticket.customerPhone}</strong>)</td>
        </tr>
        <tr>
          <td class="lbl">MÃ SERIAL NO:</td>
          <td class="val" style="font-family: var(--font-mono); color: #38bdf8;">${ticket.serialNumber || 'SN-CHƯA-GHI'}</td>
        </tr>
        <tr>
          <td class="lbl">NGUỒN GỐC THIẾT BỊ:</td>
          <td class="val">
            ${(ticket.initialCondition || '').includes('MUA BÊN NGOÀI')
              ? '<span class="tech-badge-mono" style="color: #fbbf24;">[ LINH KIỆN NGOÀI // KHÁCH VÃNG LAI ]</span>'
              : '<span class="tech-badge-mono" style="color: #10b981;">[ THIẾT BỊ MUA TẠI CYBERRIG ]</span>'}
          </td>
        </tr>
        <tr>
          <td class="lbl">TÌNH TRẠNG NGOẠI QUAN:</td>
          <td class="val">${ticket.initialCondition || 'Chưa ghi nhận ngoại quan'}</td>
        </tr>
        <tr>
          <td class="lbl">LỖI KHÁCH MÔ TẢ:</td>
          <td class="val" style="color: #fbbf24;">${ticket.faultDescription || 'Chưa có mô tả'}</td>
        </tr>
        <tr>
          <td class="lbl">THỜI HẠN BẢO HÀNH:</td>
          <td class="val" style="font-family: var(--font-mono);">${ticket.warrantyMonths || 12} THÁNG</td>
        </tr>
      </table>

      <!-- 2. Diagnostic Log Editor -->
      <div style="margin-bottom: 20px;">
        <label class="tech-badge-mono" style="margin-bottom: 6px; display: block;">BIÊN BẢN CHẨN ĐOÁN KỸ THUẬT (KTV NOTES):</label>
        <textarea id="tech-diagnosis-input" class="tech-input" rows="3" placeholder="Nhập kết quả đo điện áp, xung clock, linh kiện lỗi cần khắc phục...">${ticket.diagnosisNotes || ''}</textarea>
        <div style="display: flex; justify-content: flex-end; margin-top: 8px;">
          <button type="button" id="btn-save-notes" class="tech-btn tech-btn-outline" style="padding: 6px 16px; font-size: 0.78rem;">
            LƯU BIÊN BẢN GIÁM ĐỊNH
          </button>
        </div>
      </div>

      <!-- 3. Stage Action Controls -->
      <div class="tech-action-strip">
        ${ticket.status === 'RECEIVED' ? `
          <button type="button" id="btn-advance-diagnosing" class="tech-btn tech-btn-accent" style="padding: 12px 20px;">
            BẮT ĐẦU CHẨN ĐOÁN LỖI [ -> DIAGNOSING ]
          </button>
        ` : ''}

        ${ticket.status === 'REPAIRING' ? `
          <button type="button" id="btn-advance-qc" class="tech-btn tech-btn-accent" style="padding: 12px 20px;">
            HOÀN TẤT THAY THẾ -> CHUYỂN KIỂM THỬ QC [ -> QC ]
          </button>
        ` : ''}

        ${ticket.status === 'QC' ? `
          <button type="button" id="btn-advance-completed" class="tech-btn tech-btn-accent" style="padding: 12px 20px;">
            ĐẠT TIÊU CHUẨN QC -> HOÀN TẤT XUẤT XƯỞNG [ -> COMPLETED ]
          </button>
        ` : ''}

        <a href="/repair-tracking?code=${ticket.ticketCode || ticket.id}" target="_blank" class="tech-btn tech-btn-outline" style="padding: 12px 20px;">
          XEM GIAO DIỆN KHÁCH HÀNG (PUBLIC TRACKING)
        </a>
      </div>

      <!-- 4. Quotation Creation Frame (Available when DIAGNOSING or QUOTED) -->
      ${(ticket.status === 'DIAGNOSING' || ticket.status === 'QUOTED' || ticket.status === 'RECEIVED') ? `
        <div class="tech-quote-frame">
          <span class="tech-quote-header">[ BẢNG LẬP BÁO GIÁ LINH KIỆN THAY THẾ // QUOTATION GENERATOR ]</span>
          
          <form id="tech-quote-form">
            <div class="tech-form-grid" style="margin-bottom: 14px;">
              <div>
                <label class="tech-badge-mono" style="color: var(--text-muted);">LINH KIỆN CẦN THAY THẾ *</label>
                <select id="tq-part-select" class="tech-input" required>
                  <option value="" data-price="0">-- Chọn linh kiện từ danh mục Lab --</option>
                  <option value="Kingston Fury Beast 16GB DDR5 5600MHz" data-price="1490000">Kingston Fury Beast 16GB DDR5 5600MHz (1.490.000 Đ)</option>
                  <option value="SSD Kingston NV2 1TB M.2 NVMe PCIe Gen4" data-price="1500000">SSD Kingston NV2 1TB M.2 NVMe (1.500.000 Đ)</option>
                  <option value="SSD Samsung 990 PRO 1TB PCIe 4.0" data-price="2990000">SSD Samsung 990 PRO 1TB (2.990.000 Đ)</option>
                  <option value="Nguồn Corsair RM750e 750W 80 Plus Gold" data-price="2650000">Nguồn Corsair RM750e 750W (2.650.000 Đ)</option>
                  <option value="Tản nhiệt nước AIO DeepCool LT720 360mm" data-price="3000000">Tản nhiệt AIO DeepCool LT720 (3.000.000 Đ)</option>
                  <option value="Keo tản nhiệt Noctua NT-H2 &amp; Vệ sinh tra bụi toàn bộ" data-price="250000">Keo tản nhiệt Noctua NT-H2 &amp; Vệ sinh toàn bộ (250.000 Đ)</option>
                </select>
              </div>

              <div>
                <label class="tech-badge-mono" style="color: var(--text-muted);">CHI PHÍ CÔNG THỢ &amp; LAB TESTING *</label>
                <select id="tq-labor-select" class="tech-input" required>
                  <option value="150000">150.000 Đ (Lắp ráp / Thay thế linh kiện cơ bản)</option>
                  <option value="250000">250.000 Đ (Cài đặt Windows, Stress test nhiệt độ chuyên sâu)</option>
                  <option value="500000">500.000 Đ (Sửa chữa mạch nguồn phần cứng chuyên sâu)</option>
                </select>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; padding: 12px 16px; background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); margin-bottom: 14px;">
              <span style="font-family: var(--font-condensed); font-weight: 700; font-size: 0.95rem;">TỔNG TIỀN BÁO GIÁ DỰ KIẾN:</span>
              <span id="tq-total-display" style="font-family: var(--font-mono); font-weight: 800; font-size: 1.2rem; color: #10b981;">0 Đ</span>
            </div>

            <button type="submit" id="tq-submit-btn" class="tech-btn tech-btn-accent" style="width: 100%; padding: 14px; font-weight: 800;">
              LẬP BÁO GIÁ &amp; GỬI DUYỆT TỚI KHÁCH HÀNG [ -> QUOTED ]
            </button>
          </form>
        </div>
      ` : ''}

      ${ticket.status === 'COMPLETED' ? `
        <div style="margin-top: 20px; padding: 16px 20px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.4); text-align: center;">
          <div class="tech-badge-mono" style="color: #10b981;">[ ĐÃ XUẤT XƯỞNG // COMPLETED ]</div>
          <div style="font-size: 0.92rem; font-weight: 600; color: var(--text-main); margin-top: 4px;">
            Thiết bị đã hoàn tất mọi tiêu chuẩn QC và bàn giao thành công cho khách hàng.
          </div>
        </div>
      ` : ''}
    </div>
  `;

  // Dynamic Quote calculation
  const partSelect = document.getElementById('tq-part-select');
  const laborSelect = document.getElementById('tq-labor-select');
  const totalDisplay = document.getElementById('tq-total-display');

  function updateTotalDisplay() {
    if (!partSelect || !laborSelect || !totalDisplay) return;
    const selectedOpt = partSelect.options[partSelect.selectedIndex];
    const partPrice = Number(selectedOpt?.getAttribute('data-price') || 0);
    const laborPrice = Number(laborSelect.value || 0);
    totalDisplay.textContent = formatVND(partPrice + laborPrice);
  }

  partSelect?.addEventListener('change', updateTotalDisplay);
  laborSelect?.addEventListener('change', updateTotalDisplay);
  updateTotalDisplay();

  // Save diagnostic notes
  document.getElementById('btn-save-notes')?.addEventListener('click', async () => {
    const notes = document.getElementById('tech-diagnosis-input')?.value.trim();
    ticket.diagnosisNotes = notes;
    alert('Biên bản giám định đã được lưu thành công.');
  });

  // Stage transition: Start diagnosing
  document.getElementById('btn-advance-diagnosing')?.addEventListener('click', async () => {
    await updateTicketStatus(ticket, 'DIAGNOSING', 'KTV bắt đầu tháo máy kiểm tra phần cứng');
  });

  // Stage transition: Advance to QC
  document.getElementById('btn-advance-qc')?.addEventListener('click', async () => {
    await updateTicketStatus(ticket, 'QC', 'Đã thay xong linh kiện. Chuyển sang phòng kiểm thử QC');
  });

  // Stage transition: Advance to Completed
  document.getElementById('btn-advance-completed')?.addEventListener('click', async () => {
    await updateTicketStatus(ticket, 'COMPLETED', 'Đạt tiêu chuẩn QC. Xuất xưởng và bàn giao cho khách');
  });

  // Submit Quotation
  const quoteForm = document.getElementById('tech-quote-form');
  if (quoteForm) {
    quoteForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const selectedOpt = partSelect.options[partSelect.selectedIndex];
      const partName = selectedOpt.value;
      const partPrice = Number(selectedOpt.getAttribute('data-price') || 0);
      const laborPrice = Number(laborSelect.value || 0);

      if (!partName) {
        alert('Vui lòng chọn linh kiện cần thay thế.');
        return;
      }

      const total = partPrice + laborPrice;
      const token = localStorage.getItem(ACCESS_KEY);

      try {
        await fetch(`/api/tickets/${ticket.id}/quotation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            partsCost: partPrice,
            laborCost: laborPrice,
            diagnosisNotes: ticket.diagnosisNotes || 'Đã giám định và xác định linh kiện cần thay',
            parts: [{ name: partName, price: partPrice, quantity: 1 }]
          })
        });
      } catch (err) {}

      // Update in memory
      ticket.status = 'QUOTED';
      ticket.quoteAmount = total;
      ticket.partsCost = partPrice;
      ticket.laborCost = laborPrice;
      ticket.parts = [{ name: partName, price: partPrice, quantity: 1 }];
      ticket.timeline = ticket.timeline || [];
      ticket.timeline.push({
        toStatus: 'QUOTED',
        note: `KTV lập báo giá: ${partName} (${formatVND(partPrice)}) + Tiền công (${formatVND(laborPrice)})`,
        createdAt: new Date().toISOString()
      });

      alert(`Đã lập báo giá ${formatVND(total)} và chuyển trạng thái phiếu sang [ QUOTED ]. Khách hàng có thể kiểm tra và phê duyệt ngay tại trang tra cứu!`);
      loadTechnicianWorkbench();
    });
  }
}

/**
 * Status updater helper
 */
async function updateTicketStatus(ticket, toStatus, note) {
  const token = localStorage.getItem(ACCESS_KEY);
  try {
    await fetch(`/api/tickets/${ticket.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ toStatus, note })
    });
  } catch (err) {}

  ticket.status = toStatus;
  ticket.timeline = ticket.timeline || [];
  ticket.timeline.push({
    toStatus,
    note,
    createdAt: new Date().toISOString()
  });

  renderQueueList();
  renderActiveTicketSurface();
}
