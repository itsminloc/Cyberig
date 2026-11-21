/**
 * CyberRig Public Warranty & Repair Tracking Component
 * Sprint 8 / 100% Icon-Free, Pure Typographic & Sharp Industrial Design Engine
 */

import { navigateTo } from '../router.js';
import { openTicketModal } from './dashboard.js';

function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

const STAGES = [
  { code: 'RECEIVED', label: '01: TIẾP NHẬN' },
  { code: 'DIAGNOSING', label: '02: CHẨN ĐOÁN LỖI' },
  { code: 'QUOTED', label: '03: ĐÃ BÁO GIÁ' },
  { code: 'REPAIRING', label: '04: ĐANG SỬA CHỮA' },
  { code: 'QC', label: '05: KIỂM THỬ QC' },
  { code: 'COMPLETED', label: '06: HOÀN TẤT' }
];

// Fallback seed tickets for instant guaranteed offline demonstration
const DEMO_TICKETS = {
  'TK-20260905-001': {
    id: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    ticketCode: 'TK-20260905-001',
    customerName: 'Nguyễn Văn An',
    customerPhone: '090***4567',
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
      {
        toStatus: 'RECEIVED',
        note: 'Tiếp nhận thiết bị tại quầy kỹ thuật CyberRig Lab',
        createdAt: '2026-09-05T08:00:00Z'
      }
    ]
  },
  'TK-1001': {
    id: 'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e',
    ticketCode: 'TK-1001',
    customerName: 'Trần Minh Hoàng',
    customerPhone: '098***4321',
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
      {
        toStatus: 'RECEIVED',
        note: 'Tiếp nhận thiết bị và lập biên bản bàn giao máy',
        createdAt: '2026-09-08T08:00:00Z'
      },
      {
        toStatus: 'DIAGNOSING',
        note: 'Bắt đầu quá trình tháo máy, đo xung nhịp RAM và test tải',
        createdAt: '2026-09-08T08:30:00Z'
      },
      {
        toStatus: 'QUOTED',
        note: 'Hoàn tất biên bản giám định, gửi bảng báo giá linh kiện thay thế cho khách duyệt',
        createdAt: '2026-09-08T10:15:00Z'
      }
    ]
  }
};

export async function renderTracking(forcedCode) {
  const container = document.getElementById('tracking-view');
  if (!container) return;

  const urlParams = new URLSearchParams(window.location.search);
  const searchCode = forcedCode || urlParams.get('code') || '';

  container.innerHTML = `
    <div class="tracking-shell">
      <div class="tracking-header-bar">
        <span class="tracking-badge-mono">[ CYBERRIG LAB // PUBLIC REPAIR TRACKING ]</span>
        <h1 class="tracking-main-title">TRA CỨU TIẾN ĐỘ BẢO HÀNH &amp; SỬA CHỮA</h1>
        <p class="tracking-main-subtext">Hệ thống giám sát quy trình xử lý phần cứng công khai, minh bạch theo mã phiếu tiếp nhận</p>
      </div>

      <!-- Search Card -->
      <div class="tracking-search-card">
        <form id="tracking-search-form" class="tracking-search-row">
          <input
            type="text"
            id="tracking-input-code"
            class="tracking-search-input"
            placeholder="NHẬP MÃ PHIẾU TIẾP NHẬN (VÍ DỤ: TK-1001, TK-20260905-001)..."
            value="${searchCode}"
            required
          />
          <button type="submit" class="tech-btn tech-btn-accent" style="padding: 14px 28px; font-weight: 800;">
            TRA CỨU TIẾN ĐỘ
          </button>
        </form>

        <div style="margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div class="tracking-quick-tags-row">
            <span class="tracking-quick-label">MÃ THỬ NGHIỆM:</span>
            <button type="button" class="tracking-quick-tag" data-code="TK-1001">[ TK-1001 ]</button>
            <button type="button" class="tracking-quick-tag" data-code="TK-20260905-001">[ TK-20260905-001 ]</button>
          </div>
          <button type="button" class="tech-btn tech-btn-outline" id="tracking-open-ticket-btn" style="padding: 8px 18px; font-size: 0.78rem;">
            [ + TẠO PHIẾU TIẾP NHẬN MỚI ]
          </button>
        </div>
      </div>

      <!-- Results Root Container -->
      <div id="tracking-results-root"></div>
    </div>
  `;

  // Attach search listeners
  const form = document.getElementById('tracking-search-form');
  const input = document.getElementById('tracking-input-code');

  container.querySelectorAll('.tracking-quick-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const code = tag.getAttribute('data-code');
      if (input) input.value = code;
      executeSearch(code);
    });
  });

  const openTicketBtn = document.getElementById('tracking-open-ticket-btn');
  if (openTicketBtn) {
    openTicketBtn.addEventListener('click', () => {
      openTicketModal();
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = input?.value.trim();
      if (code) {
        window.history.replaceState(null, '', `/repair-tracking?code=${encodeURIComponent(code)}`);
        executeSearch(code);
      }
    });
  }

  // Auto execute if code present in URL
  if (searchCode) {
    executeSearch(searchCode);
  }
}

/**
 * Fetch and render ticket timeline
 */
async function executeSearch(code) {
  const root = document.getElementById('tracking-results-root');
  if (!root) return;

  root.innerHTML = `
    <div style="padding: 40px; text-align: center; color: var(--text-muted); font-family: var(--font-mono);">
      [ ĐANG TRUY VẤN CƠ SỞ DỮ LIỆU CYBERRIG LAB // MÃ: ${code} ]
    </div>
  `;

  let ticket = null;

  try {
    const res = await fetch(`/api/tickets/${encodeURIComponent(code)}/timeline`);
    const data = await res.json();
    if (res.ok && data.success && data.data) {
      ticket = data.data;
    }
  } catch (e) {
    console.warn('API error, using in-memory demo ticket:', e);
  }

  // Fallback to demo tickets if API offline or not found
  if (!ticket && DEMO_TICKETS[code]) {
    ticket = DEMO_TICKETS[code];
  }

  if (!ticket) {
    root.innerHTML = `
      <div class="tracking-card" style="text-align: center; padding: 40px 20px; border-color: rgba(239, 68, 68, 0.4);">
        <div class="tracking-badge-mono" style="color: #ef4444;">[ KHÔNG TÌM THẤY BẢN GHI ]</div>
        <h2 class="tracking-card-title" style="margin: 8px 0 12px;">MÃ PHIẾU KHÔNG TỒN TẠI HOẶC CHƯA ĐƯỢC ĐỒNG BỘ</h2>
        <p style="color: var(--text-muted); font-size: 0.9rem; max-width: 520px; margin: 0 auto 20px;">
          Không tìm thấy phiếu sửa chữa nào với mã "${code}". Vui lòng kiểm tra lại biên lai bàn giao máy hoặc thử với các mã mẫu bên trên.
        </p>
      </div>
    `;
    return;
  }

  renderTicketDetails(root, ticket);
}

/**
 * Render Stage Stepper and Split Details
 */
function renderTicketDetails(root, ticket) {
  const currentStageIndex = STAGES.findIndex(s => s.code === ticket.status);
  const activeIndex = currentStageIndex >= 0 ? currentStageIndex : 0;
  const progressPercent = Math.min(100, Math.round((activeIndex / (STAGES.length - 1)) * 100));

  const hasQuote = ticket.status === 'QUOTED' || ticket.status === 'REPAIRING' || ticket.status === 'QC' || ticket.status === 'COMPLETED' || ticket.quoteAmount;
  const totalQuote = ticket.quoteAmount || (Number(ticket.laborCost || 150000) + Number(ticket.partsCost || 1490000));

  root.innerHTML = `
    <!-- 1. State Machine Stepper Architecture -->
    <div class="tracking-stepper-card">
      <div class="tracking-stepper-header">
        <h2 class="stepper-header-title">VÒNG ĐỜI XỬ LÝ PHIẾU TIẾP NHẬN</h2>
        <span class="stepper-status-badge">[ TRẠNG THÁI HIỆN TẠI: ${ticket.status} ]</span>
      </div>

      <div class="stepper-nodes-row">
        <div class="stepper-track-line">
          <div class="stepper-track-fill" style="width: ${progressPercent}%;"></div>
        </div>

        ${STAGES.map((stage, idx) => {
          let stateClass = '';
          if (idx < activeIndex) stateClass = 'is-passed';
          else if (idx === activeIndex) stateClass = 'is-active';

          return `
            <div class="stepper-node-item ${stateClass}">
              <div class="stepper-circle">${idx + 1}</div>
              <div class="stepper-node-label">${stage.label}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- 2. Split-View Details -->
    <div class="tracking-detail-grid">
      <!-- Left: Device & Customer Telemetry -->
      <div class="tracking-card">
        <div class="tracking-card-header">
          <h3 class="tracking-card-title">HỒ SƠ THIẾT BỊ TIẾP NHẬN</h3>
          <span class="tracking-badge-mono">[ ${ticket.ticketCode || ticket.id?.slice(0, 8)} ]</span>
        </div>

        <table class="tracking-table">
          <tr>
            <td class="lbl">KHÁCH HÀNG:</td>
            <td class="val">${ticket.customerName || 'Khách hàng vãng lai'}</td>
          </tr>
          <tr>
            <td class="lbl">SỐ ĐIỆN THOẠI:</td>
            <td class="val" style="font-family: var(--font-mono);">${ticket.customerPhone || '090***'}</td>
          </tr>
          <tr>
            <td class="lbl">LOẠI THIẾT BỊ:</td>
            <td class="val">${ticket.deviceType || 'PC Gaming'}</td>
          </tr>
          <tr>
            <td class="lbl">MÃ SERIAL NO:</td>
            <td class="val" style="font-family: var(--font-mono); color: var(--accent-primary);">${ticket.serialNumber || 'SN-CHƯA-GHI'}</td>
          </tr>
          <tr>
            <td class="lbl">NGUỒN GỐC:</td>
            <td class="val">
              ${(ticket.initialCondition || '').includes('MUA BÊN NGOÀI')
                ? '<span class="origin-tag origin-external">[ LINH KIỆN NGOÀI // KHÁCH VÃNG LAI ]</span>'
                : '<span class="origin-tag origin-cyberrig">[ THIẾT BỊ MUA TẠI CYBERRIG ]</span>'}
            </td>
          </tr>
          <tr>
            <td class="lbl">HIỆN TRẠNG MÁY:</td>
            <td class="val">${ticket.initialCondition || 'Đang xác định'}</td>
          </tr>
          <tr>
            <td class="lbl">LỖI KHÁCH BÁO:</td>
            <td class="val" style="color: #fbbf24;">${ticket.faultDescription || 'Chưa có mô tả'}</td>
          </tr>
          <tr>
            <td class="lbl">THỜI HẠN BẢO HÀNH:</td>
            <td class="val" style="font-family: var(--font-mono);">${ticket.warrantyMonths || 12} THÁNG</td>
          </tr>
        </table>
      </div>

      <!-- Right: Diagnostics, Quotation & Action -->
      <div class="tracking-card">
        <div class="tracking-card-header">
          <h3 class="tracking-card-title">KẾT QUẢ CHẨN ĐOÁN &amp; BÁO GIÁ</h3>
          <span class="tracking-badge-mono">[ KTV: ${ticket.technicianId || 'KTV LAB 01'} ]</span>
        </div>

        ${ticket.diagnosisNotes ? `
          <div style="margin-bottom: 16px;">
            <span class="tracking-quick-label" style="display: block; margin-bottom: 4px;">BIÊN BẢN KỸ THUẬT:</span>
            <p style="font-size: 0.9rem; color: var(--text-main); margin: 0; line-height: 1.45; background: var(--bg-surface); padding: 12px; border: 1px solid var(--border-subtle);">
              ${ticket.diagnosisNotes}
            </p>
          </div>
        ` : `
          <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 16px;">
            Thiết bị đang được kỹ thuật viên tiến hành tháo máy, đo áp và kiểm tra linh kiện. Biên bản giám định sẽ cập nhật tại đây ngay khi hoàn thành.
          </p>
        `}

        ${hasQuote ? `
          <!-- Quotation Breakdown Box -->
          <div class="quotation-box">
            <span class="quotation-banner">[ BẢNG BÓC TÁCH CHI PHÍ LINH KIỆN THAY THẾ ]</span>

            <table class="tracking-table" style="font-size: 0.84rem;">
              ${(ticket.parts && ticket.parts.length > 0) ? ticket.parts.map(p => `
                <tr>
                  <td>${p.name} (x${p.quantity || 1})</td>
                  <td style="text-align: right; font-family: var(--font-mono); font-weight: 700;">${formatVND(p.price)}</td>
                </tr>
              `).join('') : `
                <tr>
                  <td>Linh kiện thay thế phần cứng (chính hãng)</td>
                  <td style="text-align: right; font-family: var(--font-mono); font-weight: 700;">${formatVND(ticket.partsCost || 1490000)}</td>
                </tr>
              `}
              <tr>
                <td>Tiền công thợ &amp; Kiểm thử QA</td>
                <td style="text-align: right; font-family: var(--font-mono); font-weight: 700;">${formatVND(ticket.laborCost || 150000)}</td>
              </tr>
            </table>

            <div class="quotation-total-row">
              <span style="font-family: var(--font-condensed); font-weight: 800; font-size: 1.05rem;">TỔNG CHI PHÍ BÁO GIÁ:</span>
              <span style="font-family: var(--font-mono); font-size: 1.25rem; font-weight: 800; color: #10b981;">${formatVND(totalQuote)}</span>
            </div>

            <!-- Customer Approval Action (2-Way Interaction) -->
            ${ticket.status === 'QUOTED' ? `
              <div style="margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--border-medium);">
                <span class="tracking-badge-mono" style="color: #fbbf24; margin-bottom: 8px;">[ CHỜ KHÁCH HÀNG PHÊ DUYỆT BÁO GIÁ ]</span>
                <p style="font-size: 0.82rem; color: var(--text-muted); margin: 0 0 12px;">
                  Bạn có đồng ý tiến hành thay thế linh kiện và thực hiện sửa chữa với mức chi phí trên không?
                </p>
                <div class="quotation-action-buttons">
                  <button type="button" id="btn-approve-quote" class="tech-btn tech-btn-accent" style="padding: 10px 20px; font-size: 0.85rem;">
                    ĐỒNG Ý SỬA CHỮA
                  </button>
                  <button type="button" id="btn-reject-quote" class="tech-btn tech-btn-outline" style="padding: 10px 20px; font-size: 0.85rem;">
                    TỪ CHỐI BÁO GIÁ
                  </button>
                </div>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- 3. Chronological Timeline Logs -->
        <div style="margin-top: 20px;">
          <span class="tracking-quick-label" style="display: block; margin-bottom: 8px;">NHẬT KÝ XỬ LÝ THEO THỜI GIAN:</span>
          <div class="timeline-logs-list">
            ${(ticket.timeline && ticket.timeline.length > 0) ? ticket.timeline.map(log => `
              <div class="timeline-log-item">
                <div class="timeline-log-time">${new Date(log.createdAt).toLocaleString('vi-VN')}</div>
                <div class="timeline-log-note">
                  [ ${log.toStatus} ] ${log.note || 'Cập nhật trạng thái xử lý'}
                </div>
              </div>
            `).join('') : `
              <div class="timeline-log-item">
                <div class="timeline-log-time">${new Date(ticket.createdAt).toLocaleString('vi-VN')}</div>
                <div class="timeline-log-note">[ RECEIVED ] Tiếp nhận thiết bị vào trung tâm CyberRig</div>
              </div>
            `}
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach Approval Events
  const approveBtn = document.getElementById('btn-approve-quote');
  if (approveBtn) {
    approveBtn.addEventListener('click', async () => {
      approveBtn.disabled = true;
      approveBtn.textContent = 'ĐANG XÁC NHẬN DUYỆT SỬA CHỮA...';

      try {
        await fetch(`/api/tickets/${ticket.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toStatus: 'REPAIRING',
            note: 'Khách hàng duyệt báo giá trực tuyến qua cổng tra cứu'
          })
        });
      } catch (e) {}

      // Update in-memory ticket
      ticket.status = 'REPAIRING';
      ticket.timeline = ticket.timeline || [];
      ticket.timeline.push({
        toStatus: 'REPAIRING',
        note: 'Khách hàng đã duyệt báo giá. Bắt đầu tiến hành thay thế linh kiện và sửa chữa.',
        createdAt: new Date().toISOString()
      });

      renderTicketDetails(root, ticket);
    });
  }

  const rejectBtn = document.getElementById('btn-reject-quote');
  if (rejectBtn) {
    rejectBtn.addEventListener('click', async () => {
      if (!confirm('Bạn có chắc chắn muốn từ chối báo giá và nhận lại máy không?')) return;
      rejectBtn.disabled = true;

      try {
        await fetch(`/api/tickets/${ticket.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toStatus: 'CANCELLED',
            note: 'Khách hàng từ chối báo giá sửa chữa'
          })
        });
      } catch (e) {}

      ticket.status = 'CANCELLED';
      renderTicketDetails(root, ticket);
    });
  }
}
