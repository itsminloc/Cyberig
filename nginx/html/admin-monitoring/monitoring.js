(function () {
  'use strict';

  let token = localStorage.getItem('cyberrig_access_token');
  let sseSource = null;
  let currentFilter = 'ALL';
  let meshFilter = 'ALL';
  let searchQuery = '';
  let logsStore = [];
  const sparkHistory = [1380, 1392, 1400, 1405, 1411, 1418, 1420];

  function esc(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function authHeaders() {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function checkOperatorIdentity() {
    token = localStorage.getItem('cyberrig_access_token');
    let user = null;
    try {
      const raw = localStorage.getItem('cyberrig_user');
      user = raw ? JSON.parse(raw) : null;
    } catch (_e) {
      user = null;
    }
    const modal = document.getElementById('authGateModal');
    const display = document.getElementById('socUserDisplay');
    if (!token || !user || user.role !== 'ADMIN') {
      modal?.classList.add('is-active');
      return false;
    }
    modal?.classList.remove('is-active');
    if (display) display.textContent = `OPERATOR: ${user.fullName || user.email} [ADMIN]`;
    return true;
  }

  function switchTab(target) {
    const map = {
      REALTIME: ['tabRealtime', 'sectionRealtime'],
      SCENARIO: ['tabScenario', 'sectionScenario'],
      SIMULATOR: ['tabSimulator', 'sectionSimulator'],
      CEO: ['tabCeo', 'sectionCeo'],
    };
    Object.values(map).forEach(([tabId, secId]) => {
      document.getElementById(tabId)?.classList.remove('is-active');
      document.getElementById(secId)?.classList.remove('is-visible');
    });
    const [activeTab, activeSec] = map[target] || map.REALTIME;
    document.getElementById(activeTab)?.classList.add('is-active');
    document.getElementById(activeSec)?.classList.add('is-visible');
    if (target === 'CEO') window.cyberigRefreshCeoDashboard?.();
    if (target === 'SIMULATOR') window.cyberigRefreshSimulator?.();
  }

  function renderContainers(containers) {
    const grid = document.getElementById('containerGrid');
    if (!grid) return;
    const filtered = (containers || []).filter((c) => {
      const byMesh = meshFilter === 'ALL' || c.status === 'HEALTHY';
      const bySearch = !searchQuery || c.name.toLowerCase().includes(searchQuery) || c.role.toLowerCase().includes(searchQuery);
      return byMesh && bySearch;
    });
    grid.innerHTML = filtered
      .map((c) => {
        const upMin = Math.floor((c.uptimeSeconds || 0) / 60);
        const pillClass = c.status === 'HEALTHY' ? 'is-booked' : 'is-pending';
        return `<div class="mesh-row">
          <div class="mesh-who">
            <div class="mesh-avatar">${esc(c.name.replace('cyberrig_', '').slice(0, 2).toUpperCase())}</div>
            <div style="min-width:0;">
              <div class="mesh-name">${esc(c.name)}</div>
              <div class="mesh-meta">${esc(window.cyberigI18n ? window.cyberigI18n.translateRole(c.role) : c.role)}</div>
            </div>
          </div>
          <div class="mesh-track">
            <span class="flow-pill is-pending">TCP :${c.port}</span>
            <span class="flow-connector"></span>
            <span class="flow-pill is-done">${c.latencyMs}ms ping · ${c.memoryUsageMb}MB</span>
            <span class="flow-connector"></span>
            <span class="flow-pill is-done">${upMin}m up</span>
            <span class="flow-pill ${pillClass}" style="margin-left:auto;">${esc(c.status)}</span>
          </div>
        </div>`;
      })
      .join('');
  }

  function renderBrokerAndDlq(broker, dlq, traffic) {
    if (!broker || !dlq) return;
    window.cyberigUi.animateCountUp(document.getElementById('brokerTotal'), broker.totalMessagesPublished);
    window.cyberigUi.animateCountUp(document.getElementById('brokerReady'), broker.readyMessages);
    document.getElementById('brokerUnacked').textContent = `${broker.unacknowledgedMessages} unacked`;
    document.getElementById('brokerProcessedSub').textContent = `${broker.totalMessagesProcessed.toLocaleString()} ACK processed · ${broker.consumersConnected} consumers`;
    document.getElementById('brokerTypeBadge').textContent = broker.brokerType || 'RabbitMQ';
    document.getElementById('brokerThroughput').textContent = `${broker.currentThroughputRps} rps`;
    document.getElementById('trafficLatencySub').textContent = `P95 Latency: ${traffic?.p95LatencyMs ?? 16.4}ms · Err: ${traffic?.errorRatePercentage ?? 0}%`;

    sparkHistory.push(broker.totalMessagesPublished);
    if (sparkHistory.length > 10) sparkHistory.shift();
    window.cyberigUi.renderSparkline('sparklineHero', sparkHistory);
    window.cyberigLab?.renderDlqSection(dlq);
  }

  function renderLogs() {
    const box = document.getElementById('terminalLogs');
    if (!box) return;
    const filtered = logsStore.filter((l) => {
      const chMatch = currentFilter === 'ALL' || l.channel === currentFilter;
      const qMatch = !searchQuery || l.message.toLowerCase().includes(searchQuery) || l.source.toLowerCase().includes(searchQuery);
      return chMatch && qMatch;
    });
    box.innerHTML = filtered.slice(0, 60)
      .map((l) => `<div class="log-entry level-${esc(l.level)}">
        <span class="log-time">[${new Date(l.timestamp).toLocaleTimeString('vi-VN')}]</span>
        <span class="log-channel">[${esc(l.channel)}]</span>
        <span>${esc(l.source)}: ${esc(l.message)}</span>
      </div>`)
      .join('') || `<div class="log-entry"><span class="log-time">[--:--:--]</span><span>${window.cyberigI18n ? window.cyberigI18n.t('wait_sse') : 'Waiting for SSE events...'}</span></div>`;
  }

  async function refreshTelemetrySnapshot() {
    if (!token) return;
    const res = await fetch('/api/monitoring/telemetry', { headers: authHeaders() }).catch(() => null);
    if (!res) return;
    if (res.status === 401 || res.status === 403) {
      document.getElementById('authGateModal')?.classList.add('is-active');
      return;
    }
    const json = await res.json().catch(() => null);
    if (!json?.success || !json.data) return;
    renderContainers(json.data.containers);
    renderBrokerAndDlq(json.data.broker, json.data.dlq, json.data.traffic);
    if (Array.isArray(json.data.recentLogs)) {
      logsStore = json.data.recentLogs;
      renderLogs();
    }
  }

  async function connectSse() {
    if (!token) return;
    if (sseSource) sseSource.close();
    const ticketRes = await fetch('/api/monitoring/stream-ticket', { method: 'POST', headers: authHeaders() }).catch(() => null);
    if (!ticketRes?.ok) return;
    const ticketJson = await ticketRes.json().catch(() => null);
    if (!ticketJson?.data?.ticket) return;

    sseSource = new EventSource(`/api/monitoring/stream?ticket=${encodeURIComponent(ticketJson.data.ticket)}`);
    const indicator = document.getElementById('sseIndicator');
    sseSource.onopen = () => {
      if (indicator) indicator.innerHTML = `<span class="live-dot"></span>${window.cyberigI18n ? window.cyberigI18n.t('sse_live') : 'STREAM CONNECTED [SSE]'}`;
    };
    const handleTick = (e) => {
      const snap = JSON.parse(e.data);
      renderContainers(snap.containers);
      renderBrokerAndDlq(snap.broker, snap.dlq, snap.traffic);
    };
    sseSource.addEventListener('telemetry:init', handleTick);
    sseSource.addEventListener('telemetry:tick', handleTick);
    sseSource.addEventListener('log:new', (e) => {
      logsStore.unshift(JSON.parse(e.data));
      if (logsStore.length > 150) logsStore.pop();
      renderLogs();
    });
    sseSource.addEventListener('dlq:new', refreshTelemetrySnapshot);
    sseSource.addEventListener('dlq:updated', refreshTelemetrySnapshot);
    sseSource.addEventListener('dlq:cleared', refreshTelemetrySnapshot);
    sseSource.addEventListener('crawler:alert', (e) => {
      const payload = JSON.parse(e.data);
      const bell = document.getElementById('bellDlqCount');
      if (bell && payload?.unreadAlertCount !== undefined) {
        bell.textContent = String(payload.unreadAlertCount);
      }
      if (payload?.alert?.title) {
        window.cyberigUi?.showToast(`🔔 ${payload.alert.title}`);
      }
      window.cyberigRefreshSimulator?.();
    });
    sseSource.addEventListener('crawler:updated', () => window.cyberigRefreshSimulator?.());
  }

  document.getElementById('tabRealtime')?.addEventListener('click', () => switchTab('REALTIME'));
  document.getElementById('tabScenario')?.addEventListener('click', () => switchTab('SCENARIO'));
  document.getElementById('tabSimulator')?.addEventListener('click', () => switchTab('SIMULATOR'));
  document.getElementById('tabCeo')?.addEventListener('click', () => switchTab('CEO'));
  document.getElementById('btnGoScenario3')?.addEventListener('click', () => switchTab('SCENARIO'));
  document.getElementById('btnThemeToggle')?.addEventListener('click', (e) => window.cyberigUi.toggleTheme(e));
  document.getElementById('btnSocLogout')?.addEventListener('click', async () => {
    const isVi = window.cyberigI18n?.getLang() === 'vi';
    const veil = document.getElementById('socLogoutVeil');
    const txt = document.getElementById('socLogoutText');
    if (txt) txt.textContent = isVi ? 'Đang đăng xuất phiên quản trị an toàn...' : 'Signing out of Admin session...';
    document.body.classList.add('is-signing-out');
    veil?.classList.add('is-active');
    if (sseSource) { sseSource.close(); sseSource = null; }
    await Promise.all([
      token ? fetch('/api/auth/logout', { method: 'POST', headers: authHeaders() }).catch(() => null) : Promise.resolve(),
      new Promise((r) => setTimeout(r, 420)),
    ]);
    localStorage.removeItem('cyberrig_access_token');
    localStorage.removeItem('cyberrig_refresh_token');
    localStorage.removeItem('cyberrig_user');
    token = null;
    window.cyberigUi?.showToast(isVi ? '✓ Đã đăng xuất an toàn · Đang chuyển về Cửa hàng' : '✓ Signed out safely · Returning to Storefront');
    setTimeout(() => { window.location.href = '/'; }, 380);
  });
  document.getElementById('btnRefreshAll')?.addEventListener('click', () => {
    refreshTelemetrySnapshot();
    window.cyberigRefreshCeoDashboard?.();
  });
  document.getElementById('btnClearLogs')?.addEventListener('click', () => { logsStore = []; renderLogs(); });
  document.getElementById('logFilterSelect')?.addEventListener('change', (e) => { currentFilter = e.target.value; renderLogs(); });
  document.getElementById('quickSearchInput')?.addEventListener('input', (e) => {
    searchQuery = (e.target.value || '').trim().toLowerCase();
    renderLogs();
  });
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      document.getElementById('quickSearchInput')?.focus();
    }
  });
  document.querySelectorAll('[data-filter-mesh]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter-mesh]').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      meshFilter = btn.getAttribute('data-filter-mesh') || 'ALL';
      refreshTelemetrySnapshot();
    });
  });

  document.getElementById('socLoginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('socLoginError');
    const email = document.getElementById('socLoginEmail').value.trim();
    const password = document.getElementById('socLoginPassword').value;
    errEl.style.display = 'none';
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).catch(() => null);
    const json = await res?.json().catch(() => null);
    if (!res?.ok || !json?.data?.accessToken || json?.data?.user?.role !== 'ADMIN') {
      errEl.textContent = json?.error?.message || 'Valid ADMIN credentials required.';
      errEl.style.display = 'block';
      return;
    }
    localStorage.setItem('cyberrig_access_token', json.data.accessToken);
    localStorage.setItem('cyberrig_user', JSON.stringify(json.data.user));
    if (checkOperatorIdentity()) {
      refreshTelemetrySnapshot();
      window.cyberigLab?.loadScenariosList();
      connectSse();
      window.cyberigUi.showToast(`✓ Signed in as ${json.data.user.email}`);
    }
  });

  window.cyberigRefreshTelemetry = refreshTelemetrySnapshot;
  if (checkOperatorIdentity()) {
    refreshTelemetrySnapshot();
    window.cyberigLab?.loadScenariosList();
    connectSse();
  }
  setInterval(refreshTelemetrySnapshot, 8000);
})();
