(function () {
  'use strict';

  function esc(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function authHeaders() {
    const token = localStorage.getItem('cyberrig_access_token');
    return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {};
  }

  function ensureLayout() {
    const root = document.getElementById('simulatorRoot');
    if (!root || root.dataset.mounted === '1') return;
    root.dataset.mounted = '1';
    root.innerHTML = `
      <div class="grid-2" style="margin-bottom:16px;">
        <div class="bento-card">
          <div class="card-label"><span>1 · Heterogeneous Order Adapter &amp; EDA Dispatch</span><span>⇄</span></div>
          <form id="simOrderForm" class="sim-form">
            <div class="sim-row-2">
              <label>Source Channel
                <select id="simChannel" class="auth-gate-input">
                  <option value="PARTNER_B2B_API">PARTNER_B2B_API (Heterogeneous JSON)</option>
                  <option value="WEB_STOREFRONT">WEB_STOREFRONT (Canonical DTO)</option>
                  <option value="MOBILE_APP">MOBILE_APP</option>
                </select>
              </label>
              <label>Hardware SKU
                <select id="simSku" class="auth-gate-input">
                  <option value="RTX-4080">RTX-4080 -> gpu-rtx4080-strix</option>
                  <option value="RTX-4090">RTX-4090 -> gpu-rtx4090-strix</option>
                  <option value="I5-13600K">I5-13600K -> cpu-i5-13600k</option>
                  <option value="DDR5-32GB">DDR5-32GB -> ram-corsair-ddr5-32</option>
                </select>
              </label>
            </div>
            <div class="sim-row-2">
              <label>Customer Name <input type="text" id="simName" class="auth-gate-input" value="Le Minh Loc (Partner B2B)" /></label>
              <label>Phone + Qty
                <div style="display:flex;gap:6px;">
                  <input type="text" id="simPhone" class="auth-gate-input" value="0909123456" style="flex:2;" />
                  <input type="number" id="simQty" class="auth-gate-input" value="1" min="1" max="5" style="flex:1;" />
                </div>
              </label>
            </div>
            <label>Delivery Address <input type="text" id="simAddr" class="auth-gate-input" value="Q1, TP. Ho Chi Minh" /></label>
            <label style="display:flex;align-items:center;gap:8px;font-size:12px;margin-top:4px;cursor:pointer;">
              <input type="checkbox" id="simTmsFault" /> Inject TMS Carrier Timeout Fault (Verify 3x Retry -> DLQ)
            </label>
            <div class="sim-actions">
              <button type="submit" class="btn-pill-primary" id="btnSimOrder">▶ Place Heterogeneous Order</button>
              <button type="button" class="btn-pill-ghost" id="btnToggleBroker">Toggle Broker Offline</button>
              <button type="button" class="btn-pill-ghost" id="btnToggleQueue">Pause / Resume TMS</button>
            </div>
          </form>
        </div>

        <div class="bento-card">
          <div class="card-label"><span>2 · AI POS Ingestion &amp; Decree 13 PII Redaction</span><span>AI</span></div>
          <form id="simAiForm" class="sim-form">
            <label>Unstructured POS / Chat Receipt (Raw PII is scrubbed before LLM/Matcher)
              <textarea id="simAiText" class="auth-gate-input" rows="4">Khach: Nguyen Van A - SDT 0901234567 - Email: guest.pos@gmail.com
Can build gap: 1x RTX 4080 va 2x DDR5 32GB, giao nhanh Q7.</textarea>
            </label>
            <label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;">
              <input type="checkbox" id="simAiAutoOrder" /> Auto-create real Order &amp; Redis Lock after AI Mapping
            </label>
            <div class="sim-actions">
              <button type="submit" class="btn-pill-primary" id="btnSimAi">✦ Mask PII &amp; Map to Canonical Order</button>
              <button type="button" class="btn-pill-ghost" id="btnSimRefreshState">↻ Refresh Bus State</button>
            </div>
          </form>
        </div>
      </div>

      <div class="grid-2">
        <div class="bento-card is-obsidian">
          <div class="card-label"><span>Event Bus, Outbox &amp; Downstream Workers</span><span>AMQP</span></div>
          <div id="simStateCards" class="sim-state-grid">Loading integration state...</div>
        </div>
        <div class="bento-card">
          <div class="card-label"><span>Live Adapter / AI / Crawler Output &amp; Trace</span><span>JSON</span></div>
          <pre id="simOutputPre" class="sim-json-pre">Submit an Omnichannel Order, AI POS Receipt, or Hardware Crawl to inspect X-Correlation-ID and payload...</pre>
        </div>
      </div>

      <div class="bento-card" style="margin-top:16px;">
        <div class="card-label"><span>3 · Hardware Price &amp; New SKU Crawler (Multi-Source + Real-time SSE Bell)</span><span>CRAWLER</span></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <select id="simCrawlSource" class="auth-gate-input" style="max-width:220px;margin-top:0;">
            <option value="ASUS_VN_B2B">ASUS VN B2B Feed</option>
            <option value="MSI_SEA_DISTRIBUTOR">MSI SEA Distributor</option>
            <option value="GEARVN_RETAIL_PULSE">GearVN Price Pulse</option>
          </select>
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;">
            <input type="checkbox" id="simCrawlAuto" /> Auto-Apply to Catalog
          </label>
          <button type="button" class="btn-pill-primary" id="btnSimCrawlRun">▶ Crawl Feed Now</button>
          <button type="button" class="btn-pill-ghost" id="btnSimCrawlApproveAll">✓ Approve All Pending</button>
          <a href="/#admin" class="btn-pill-ghost">Open Inventory Queue →</a>
          <span id="simCrawlSummary" class="operator-chip" style="margin-left:auto;">Pending: 0 · Alerts: 0</span>
        </div>
      </div>`;

    document.getElementById('simOrderForm')?.addEventListener('submit', submitOrderSim);
    document.getElementById('simAiForm')?.addEventListener('submit', submitAiIngest);
    document.getElementById('btnToggleBroker')?.addEventListener('click', toggleBroker);
    document.getElementById('btnToggleQueue')?.addEventListener('click', toggleQueue);
    document.getElementById('btnSimRefreshState')?.addEventListener('click', refreshSimulatorState);
    document.getElementById('btnSimCrawlRun')?.addEventListener('click', runSimCrawl);
    document.getElementById('btnSimCrawlApproveAll')?.addEventListener('click', approveAllSimCrawl);
  }

  let brokerOnline = true;
  let queuePaused = false;

  function renderStateCards(state) {
    const box = document.getElementById('simStateCards');
    if (!box || !state?.eventBus) return;
    const bus = state.eventBus;
    const ds = state.downstream || {};
    const ai = state.aiStats || {};
    brokerOnline = Boolean(bus.online);
    const tmsQueue = (bus.queues || []).find((q) => q.queueName === 'order.fulfillment-tms');
    queuePaused = Boolean(tmsQueue?.paused);

    const bBtn = document.getElementById('btnToggleBroker');
    const qBtn = document.getElementById('btnToggleQueue');
    if (bBtn) bBtn.textContent = brokerOnline ? 'Set Broker Offline (503 Test)' : 'Restore Broker Online';
    if (qBtn) qBtn.textContent = queuePaused ? 'Resume TMS Consumer' : 'Pause TMS Consumer';

    box.innerHTML = `
      <div class="agenda-item"><span>Broker Mode / Health</span><strong>${esc(bus.mode)} · ${brokerOnline ? 'ONLINE' : 'OFFLINE (503)'}</strong></div>
      <div class="agenda-item"><span>Published / Processed / Retries</span><strong>${bus.metrics?.published ?? 0} / ${bus.metrics?.processed ?? 0} / ${bus.metrics?.retries ?? 0}</strong></div>
      <div class="agenda-item"><span>Inventory Sync / CRM / TMS</span><strong>${ds.inventorySyncedCount ?? 0} sync · ${ds.crmAccountsRewarded ?? 0} crm · ${ds.fulfillmentShipmentsCount ?? 0} tms</strong></div>
      <div class="agenda-item"><span>Outbox Records / Pending DLQ</span><strong>${bus.outboxCount ?? 0} outbox · ${bus.pendingDlqCount ?? 0} DLQ</strong></div>
      <div class="agenda-item"><span>AI POS Redactions / Cache Hits</span><strong>${ai.piiRedactedCount ?? 0} PII scrubbed · ${ai.cacheHits ?? 0} cache hits</strong></div>`;
  }

  async function refreshSimulatorState() {
    ensureLayout();
    const [intRes, crwRes] = await Promise.all([
      fetch('/api/monitoring/integration-state', { headers: authHeaders() }).catch(() => null),
      fetch('/api/admin/crawler/state', { headers: authHeaders() }).catch(() => null),
    ]);
    const intJson = await intRes?.json().catch(() => null);
    if (intJson?.success) renderStateCards(intJson.data);
    const crwJson = await crwRes?.json().catch(() => null);
    if (crwJson?.success && crwJson.data) {
      const chip = document.getElementById('simCrawlSummary');
      if (chip) chip.textContent = `Pending: ${crwJson.data.pendingCount} · Alerts: ${crwJson.data.unreadAlertCount}`;
    }
  }

  async function submitOrderSim(e) {
    e.preventDefault();
    const corrId = `corr-sim-${Date.now().toString(36)}`;
    const payload = {
      channel: document.getElementById('simChannel').value,
      user: { name: document.getElementById('simName').value, phone: document.getElementById('simPhone').value },
      products: [{ product_code: document.getElementById('simSku').value, qty: Number(document.getElementById('simQty').value) || 1 }],
      delivery_addr: document.getElementById('simAddr').value,
      simulateFulfillmentFailure: document.getElementById('simTmsFault').checked,
    };
    const res = await fetch('/api/monitoring/orders/simulate', {
      method: 'POST',
      headers: { ...authHeaders(), 'X-Correlation-ID': corrId },
      body: JSON.stringify(payload),
    }).catch(() => null);
    const json = await res?.json().catch(() => null);
    const pre = document.getElementById('simOutputPre');
    if (pre) pre.textContent = JSON.stringify(json || { error: 'Network error' }, null, 2);
    window.cyberigUi?.showToast(res?.ok ? `✓ Order Simulated [${res.headers.get('X-Correlation-ID') || corrId}]` : `⚠ HTTP ${res?.status || 500} handled`);
    refreshSimulatorState();
    window.cyberigRefreshTelemetry?.();
  }

  async function submitAiIngest(e) {
    e.preventDefault();
    const payload = {
      rawText: document.getElementById('simAiText').value,
      sourceLabel: 'SI_DASHBOARD_POS_TEST',
      autoCreateOrder: document.getElementById('simAiAutoOrder').checked,
    };
    const res = await fetch('/api/monitoring/ai-pos/ingest', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }).catch(() => null);
    const json = await res?.json().catch(() => null);
    const pre = document.getElementById('simOutputPre');
    if (pre) pre.textContent = JSON.stringify(json || { error: 'Network error' }, null, 2);
    window.cyberigUi?.showToast(res?.ok ? `✓ AI Mapped (PII Redacted: ${json?.data?.mapped?.piiFieldsRedacted ?? 0})` : '⚠ AI Map failed');
    refreshSimulatorState();
    window.cyberigRefreshTelemetry?.();
  }

  async function runSimCrawl() {
    const source = document.getElementById('simCrawlSource')?.value || 'ASUS_VN_B2B';
    const autoApply = Boolean(document.getElementById('simCrawlAuto')?.checked);
    const res = await fetch('/api/admin/crawler/run', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ source, autoApply }),
    }).catch(() => null);
    const json = await res?.json().catch(() => null);
    const pre = document.getElementById('simOutputPre');
    if (pre) pre.textContent = JSON.stringify(json || { error: 'Crawl failed' }, null, 2);
    refreshSimulatorState();
    window.cyberigRefreshTelemetry?.();
  }

  async function approveAllSimCrawl() {
    const res = await fetch('/api/admin/crawler/approve-all', { method: 'POST', headers: authHeaders() }).catch(() => null);
    const json = await res?.json().catch(() => null);
    const pre = document.getElementById('simOutputPre');
    if (pre) pre.textContent = JSON.stringify(json || { error: 'Approve failed' }, null, 2);
    window.cyberigUi?.showToast(`✓ Approved ${json?.data?.approvedCount ?? 0} crawled items`);
    refreshSimulatorState();
    window.cyberigRefreshCeoDashboard?.();
  }

  async function toggleBroker() {
    await fetch('/api/monitoring/integration-broker', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ action: brokerOnline ? 'OFFLINE' : 'ONLINE' }),
    }).catch(() => null);
    refreshSimulatorState();
    window.cyberigRefreshTelemetry?.();
  }

  async function toggleQueue() {
    await fetch('/api/monitoring/integration-broker', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ action: queuePaused ? 'RESUME_QUEUE' : 'PAUSE_QUEUE', queueName: 'order.fulfillment-tms' }),
    }).catch(() => null);
    refreshSimulatorState();
    window.cyberigRefreshTelemetry?.();
  }

  window.cyberigRefreshSimulator = refreshSimulatorState;
})();
