/**
 * Admin Hardware Crawler & Real-time Price Alert Bell Module (#admin)
 * Isolated exclusively to ADMIN portal; streams live SSE crawler:alert events.
 */
import { ACCESS_KEY, USER_KEY, formatVND } from '../config.js';

let crawlerSse = null;
let onCatalogChangedCb = null;
let panelVisible = false;
let latestState = null;

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getAdminHeaders() {
  const token = localStorage.getItem(ACCESS_KEY);
  return token ? { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' } : null;
}

function updateBellBadges(state) {
  const badge = document.getElementById('admin-crawler-bell-badge');
  const pendingTag = document.getElementById('admin-crawler-pending-tag');
  const unread = state?.unreadAlertCount || 0;
  const pending = state?.pendingCount || 0;
  if (badge) {
    badge.textContent = String(unread);
    badge.style.background = unread > 0 ? '#ef4444' : 'var(--border-subtle)';
    badge.style.color = unread > 0 ? '#ffffff' : 'var(--text-muted)';
  }
  if (pendingTag) {
    pendingTag.textContent = pending > 0 ? `(${pending} chờ duyệt)` : '';
  }
}

function renderCrawlerPanel(state) {
  latestState = state;
  updateBellBadges(state);
  const root = document.getElementById('admin-crawler-panel');
  if (!root) return;

  const queue = state?.stagingQueue || [];
  const alerts = (state?.notifications || []).slice(0, 4);
  const autoChecked = state?.autoApplyEnabled ? 'checked' : '';

  const alertsHtml = alerts.length === 0
    ? '<div style="font-size:0.78rem;color:var(--text-muted);">Chưa có thông báo biến động giá mới. Hãy bấm [Chạy Cào Dữ Liệu] để quét nhà phân phối.</div>'
    : alerts.map((a) => `
      <div style="padding:8px 12px;border-left:3px solid ${a.read ? 'var(--border-subtle)' : '#f59e0b'};background:var(--bg-surface-elevated);font-size:0.78rem;display:flex;justify-content:space-between;gap:10px;">
        <div><strong>${esc(a.title)}</strong><div style="color:var(--text-muted);margin-top:2px;">${esc(a.message)}</div></div>
        <span style="font-family:var(--font-mono);font-size:0.7rem;color:var(--text-muted);white-space:nowrap;">${new Date(a.createdAt).toLocaleTimeString('vi-VN')}</span>
      </div>`).join('');

  const rowsHtml = queue.length === 0
    ? '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-muted);">Hàng đợi trống — chưa có đề xuất sản phẩm mới hoặc thay đổi giá.</td></tr>'
    : queue.slice(0, 12).map((item) => {
        const typeColor = item.diffType === 'NEW_PRODUCT' ? '#10b981' : item.diffType === 'PRICE_DROP' ? '#06b6d4' : '#f59e0b';
        const typeLabel = item.diffType === 'NEW_PRODUCT'
          ? 'SP MỚI'
          : `${item.diffType === 'PRICE_DROP' ? 'GIẢM' : 'TĂNG'} ${item.priceDeltaPercent > 0 ? '+' : ''}${item.priceDeltaPercent}%`;
        const priceHtml = item.oldPriceVnd
          ? `<span style="text-decoration:line-through;color:var(--text-muted);font-size:0.74rem;">${formatVND(item.oldPriceVnd)}</span> → <strong>${formatVND(item.newPriceVnd)}</strong>`
          : `<strong>${formatVND(item.newPriceVnd)}</strong> <span style="font-size:0.72rem;color:var(--text-muted);">(Tồn gợi ý: ${item.suggestedStock})</span>`;
        const actionHtml = item.status === 'PENDING_APPROVAL'
          ? `<div style="display:flex;gap:6px;justify-content:flex-end;">
               <button type="button" class="pill-btn pill-btn-accent" style="padding:4px 10px;font-size:0.72rem;" data-approve-id="${esc(item.id)}">Duyệt</button>
               <button type="button" class="pill-btn pill-btn-outline" style="padding:4px 10px;font-size:0.72rem;color:#ef4444;" data-reject-id="${esc(item.id)}">Từ chối</button>
             </div>`
          : `<span class="role-badge-pill" style="font-size:0.7rem;">${esc(item.status)}</span>`;

        return `<tr>
          <td><span class="role-badge-pill" style="color:${typeColor};border:1px solid ${typeColor};">${esc(typeLabel)}</span></td>
          <td><strong>${esc(item.name)}</strong><div style="font-size:0.72rem;color:var(--text-muted);font-family:var(--font-mono);">${esc(item.brand)} · ${esc(item.categoryId)} · ${esc(item.source)}</div></td>
          <td style="text-align:right;">${priceHtml}</td>
          <td style="text-align:center;font-family:var(--font-mono);font-size:0.76rem;">${Math.round((item.aiConfidenceScore || 0.96) * 100)}%</td>
          <td style="text-align:right;">${actionHtml}</td>
        </tr>`;
      }).join('');

  root.innerHTML = `
    <div style="background:var(--bg-card);border:1px solid var(--border-subtle);padding:18px;display:flex;flex-direction:column;gap:14px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <div>
          <div style="font-weight:800;font-size:0.95rem;letter-spacing:0.03em;">TRÌNH CÀO DỮ LIỆU LINH KIỆN &amp; CẢNH BÁO BIẾN ĐỘNG GIÁ (REAL-TIME SSE)</div>
          <div style="font-size:0.78rem;color:var(--text-muted);">Quét bảng giá nhà phân phối (ASUS / MSI / GearVN) hoặc URL JSON/JSON-LD bên ngoài</div>
        </div>
        <label style="display:flex;align-items:center;gap:8px;font-size:0.8rem;font-weight:600;cursor:pointer;">
          <input type="checkbox" id="crawler-auto-toggle" ${autoChecked} />
          Tự động áp dụng (Auto-Apply vào kho &amp; giá bán)
        </label>
      </div>

      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <select id="crawler-source-select" class="form-field-input" style="max-width:250px;padding:8px 12px;font-size:0.82rem;">
          <option value="ASUS_VN_B2B">ASUS Việt Nam B2B Feed</option>
          <option value="MSI_SEA_DISTRIBUTOR">MSI SEA Distributor Feed</option>
          <option value="GEARVN_RETAIL_PULSE">GearVN Retail Price Pulse</option>
          <option value="CUSTOM_URL">URL JSON / Trang web tùy chỉnh</option>
        </select>
        <input type="url" id="crawler-custom-url" class="form-field-input" placeholder="https://supplier.example.com/feed.json" style="display:none;max-width:300px;padding:8px 12px;font-size:0.82rem;" />
        <button type="button" id="crawler-run-btn" class="pill-btn pill-btn-accent" style="padding:8px 16px;font-size:0.8rem;">▶ Chạy Cào Dữ Liệu</button>
        <button type="button" id="crawler-approve-all-btn" class="pill-btn pill-btn-outline" style="padding:8px 14px;font-size:0.8rem;">✓ Duyệt Tất Cả (${state?.pendingCount || 0})</button>
        <button type="button" id="crawler-mark-read-btn" class="pill-btn pill-btn-ghost" style="padding:8px 12px;font-size:0.76rem;">Đã đọc thông báo (${state?.unreadAlertCount || 0})</button>
      </div>

      <div id="crawler-live-toast" style="display:none;padding:10px 14px;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.4);font-size:0.82rem;font-weight:600;"></div>
      <div style="display:flex;flex-direction:column;gap:6px;">${alertsHtml}</div>

      <div class="data-table-frame" style="margin-top:4px;">
        <table class="minimal-table">
          <thead><tr><th>BIẾN ĐỘNG</th><th>LINH KIỆN PHÁT HIỆN</th><th style="text-align:right;">ĐỐI CHIẾU GIÁ</th><th style="text-align:center;">AI SCORE</th><th style="text-align:right;">DUYỆT ÁP DỤNG</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    </div>`;

  const srcSel = document.getElementById('crawler-source-select');
  const urlInp = document.getElementById('crawler-custom-url');
  srcSel?.addEventListener('change', () => {
    if (urlInp) urlInp.style.display = srcSel.value === 'CUSTOM_URL' ? 'block' : 'none';
  });
  document.getElementById('crawler-auto-toggle')?.addEventListener('change', async (e) => {
    await fetch('/api/admin/crawler/settings', {
      method: 'PATCH',
      headers: getAdminHeaders(),
      body: JSON.stringify({ autoApplyEnabled: e.target.checked }),
    });
    await refreshAdminCrawlerState();
  });
  document.getElementById('crawler-run-btn')?.addEventListener('click', runCrawlerNow);
  document.getElementById('crawler-approve-all-btn')?.addEventListener('click', approveAllCrawlerItems);
  document.getElementById('crawler-mark-read-btn')?.addEventListener('click', async () => {
    await fetch('/api/admin/crawler/notifications/read', { method: 'POST', headers: getAdminHeaders() });
    await refreshAdminCrawlerState();
  });
  root.querySelectorAll('[data-approve-id]').forEach((btn) => {
    btn.addEventListener('click', () => handleCandidateDecision(btn.getAttribute('data-approve-id'), 'approve'));
  });
  root.querySelectorAll('[data-reject-id]').forEach((btn) => {
    btn.addEventListener('click', () => handleCandidateDecision(btn.getAttribute('data-reject-id'), 'reject'));
  });
}

async function runCrawlerNow() {
  const headers = getAdminHeaders();
  if (!headers) return;
  const source = document.getElementById('crawler-source-select')?.value || 'ASUS_VN_B2B';
  const customUrl = document.getElementById('crawler-custom-url')?.value?.trim() || undefined;
  const btn = document.getElementById('crawler-run-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Đang quét dữ liệu...'; }

  try {
    const res = await fetch('/api/admin/crawler/run', {
      method: 'POST',
      headers,
      body: JSON.stringify({ source, customUrl }),
    });
    const json = await res.json();
    await refreshAdminCrawlerState();
    if (json?.data?.autoApplied && onCatalogChangedCb) onCatalogChangedCb();
    const toast = document.getElementById('crawler-live-toast');
    if (toast) {
      toast.style.display = 'block';
      toast.textContent = json?.message || (json?.error?.message ?? 'Hoàn tất quét dữ liệu.');
    }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '▶ Chạy Cào Dữ Liệu'; }
  }
}

async function handleCandidateDecision(id, action) {
  const headers = getAdminHeaders();
  if (!headers || !id) return;
  const res = await fetch(`/api/admin/crawler/candidates/${encodeURIComponent(id)}/${action}`, { method: 'POST', headers });
  if (res.ok) {
    await refreshAdminCrawlerState();
    if (action === 'approve' && onCatalogChangedCb) onCatalogChangedCb();
  }
}

async function approveAllCrawlerItems() {
  const headers = getAdminHeaders();
  if (!headers) return;
  const res = await fetch('/api/admin/crawler/approve-all', { method: 'POST', headers });
  if (res.ok) {
    await refreshAdminCrawlerState();
    if (onCatalogChangedCb) onCatalogChangedCb();
  }
}

export async function refreshAdminCrawlerState() {
  const headers = getAdminHeaders();
  if (!headers) return;
  const res = await fetch('/api/admin/crawler/state', { headers }).catch(() => null);
  const json = await res?.json().catch(() => null);
  if (json?.success && json.data) renderCrawlerPanel(json.data);
}

async function connectAdminCrawlerSse() {
  const headers = getAdminHeaders();
  if (!headers || crawlerSse) return;
  const ticketRes = await fetch('/api/monitoring/stream-ticket', { method: 'POST', headers }).catch(() => null);
  const ticketJson = await ticketRes?.json().catch(() => null);
  if (!ticketJson?.data?.ticket) return;

  crawlerSse = new EventSource(`/api/monitoring/stream?ticket=${encodeURIComponent(ticketJson.data.ticket)}`);
  crawlerSse.addEventListener('crawler:alert', () => refreshAdminCrawlerState());
  crawlerSse.addEventListener('crawler:updated', (e) => {
    const data = JSON.parse(e.data);
    renderCrawlerPanel(data);
    if (data?.autoApplyEnabled && onCatalogChangedCb) onCatalogChangedCb();
  });
  crawlerSse.onerror = () => { crawlerSse?.close(); crawlerSse = null; };
}

export function initAdminCrawler(onCatalogChanged) {
  onCatalogChangedCb = onCatalogChanged;
  const toggleBtn = document.getElementById('admin-toggle-crawler-btn');
  const bellBtn = document.getElementById('admin-crawler-bell-btn');
  const togglePanel = () => {
    const root = document.getElementById('admin-crawler-panel');
    if (!root) return;
    panelVisible = !panelVisible;
    root.style.display = panelVisible ? 'block' : 'none';
    if (panelVisible) refreshAdminCrawlerState();
  };
  toggleBtn?.addEventListener('click', togglePanel);
  bellBtn?.addEventListener('click', togglePanel);

  const rawUser = localStorage.getItem(USER_KEY);
  try {
    if (rawUser && JSON.parse(rawUser)?.role === 'ADMIN') connectAdminCrawlerSse();
  } catch (_e) {}
}
