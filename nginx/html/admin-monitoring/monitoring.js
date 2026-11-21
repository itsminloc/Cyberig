/**
 * SI Monitoring & Testing Dashboard Client Controller
 * Manages Dual-Mode Tab Switcher, Real-Time SSE Stream,
 * Container Diagnostics, DLQ Inspector, and 6 Integration Scenarios.
 */

(function () {
  'use strict';

  // --- Auth Verification ---
  const token = localStorage.getItem('cyberrig_access_token');
  const userStr = localStorage.getItem('cyberrig_user');
  let currentUser = null;

  try {
    currentUser = userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    currentUser = null;
  }

  const authGateModal = document.getElementById('authGateModal');
  const userDisplaySpan = document.getElementById('socUserDisplay');

  // Verify Admin Role (Non-blocking alert if running in unauthenticated test mode)
  if (!currentUser || currentUser.role !== 'ADMIN') {
    if (authGateModal) {
      authGateModal.classList.add('is-active');
    }
  } else {
    if (userDisplaySpan) {
      userDisplaySpan.textContent = `OPERATOR: ${currentUser.fullName || currentUser.email} [${currentUser.role}]`;
    }
  }

  // --- Global State ---
  let sseSource = null;
  let currentFilter = 'ALL';
  let logsStore = [];
  let scenariosStore = [];
  let activeMode = 'REALTIME_MONITORING';

  // --- DOM Elements ---
  const tabRealtime = document.getElementById('tabRealtime');
  const tabScenario = document.getElementById('tabScenario');
  const sectionRealtime = document.getElementById('sectionRealtime');
  const sectionScenario = document.getElementById('sectionScenario');
  const sseIndicator = document.getElementById('sseIndicator');

  const containerGrid = document.getElementById('containerGrid');
  const brokerTotal = document.getElementById('brokerTotal');
  const brokerReady = document.getElementById('brokerReady');
  const brokerUnacked = document.getElementById('brokerUnacked');
  const brokerThroughput = document.getElementById('brokerThroughput');
  const dlqCountBadge = document.getElementById('dlqCountBadge');
  const dlqTableBody = document.getElementById('dlqTableBody');
  const btnClearDlq = document.getElementById('btnClearDlq');

  const scenarioGrid = document.getElementById('scenarioGrid');
  const terminalLogs = document.getElementById('terminalLogs');
  const logFilterSelect = document.getElementById('logFilterSelect');
  const btnClearLogs = document.getElementById('btnClearLogs');

  // --- Tab Switcher (Dual-Mode) ---
  function switchMode(mode) {
    activeMode = mode;
    if (mode === 'REALTIME_MONITORING') {
      tabRealtime.classList.add('is-active');
      tabScenario.classList.remove('is-active');
      sectionRealtime.classList.add('is-visible');
      sectionScenario.classList.remove('is-visible');
    } else {
      tabRealtime.classList.remove('is-active');
      tabScenario.classList.add('is-active');
      sectionRealtime.classList.remove('is-visible');
      sectionScenario.classList.add('is-visible');
    }
  }

  tabRealtime.addEventListener('click', () => switchMode('REALTIME_MONITORING'));
  tabScenario.addEventListener('click', () => switchMode('SCENARIO_TESTING'));

  // --- Format Helpers ---
  function formatVND(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  }

  function formatTime(isoString) {
    const d = new Date(isoString);
    return d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3, '0');
  }

  function formatUptime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  }

  // --- Render Container Matrix ---
  function renderContainers(containers) {
    if (!containerGrid) return;
    containerGrid.innerHTML = containers
      .map((c) => {
        const isHealthy = c.status === 'HEALTHY';
        const badgeClass = isHealthy ? 'is-healthy' : 'is-unhealthy';
        return `
          <div class="cnt-card" id="${c.id}">
            <div class="cnt-top">
              <div>
                <div class="cnt-name">${c.name}</div>
                <div class="cnt-role">${c.role}</div>
              </div>
              <span class="cnt-status-badge ${badgeClass}">${c.status}</span>
            </div>
            <div class="cnt-metrics-table">
              <div class="cnt-metric-row">
                <span>PORT / PROTOCOL</span>
                <span>${c.port} [TCP]</span>
              </div>
              <div class="cnt-metric-row">
                <span>PING LATENCY</span>
                <span style="color: ${c.latencyMs > 50 ? 'var(--color-amber)' : 'var(--color-green)'};">${c.latencyMs}ms</span>
              </div>
              <div class="cnt-metric-row">
                <span>MEMORY HEAP</span>
                <span>${c.memoryUsageMb} MB</span>
              </div>
              <div class="cnt-metric-row">
                <span>UPTIME</span>
                <span>${formatUptime(c.uptimeSeconds)}</span>
              </div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  // --- Render Broker & DLQ ---
  function renderBrokerAndDlq(broker, dlq, traffic) {
    if (brokerTotal) brokerTotal.textContent = broker.totalMessagesPublished.toLocaleString();
    if (brokerReady) brokerReady.textContent = broker.readyMessages.toLocaleString();
    if (brokerUnacked) brokerUnacked.textContent = broker.unacknowledgedMessages.toLocaleString();
    if (brokerThroughput) brokerThroughput.textContent = `${broker.currentThroughputRps} rps`;

    if (dlqCountBadge) {
      dlqCountBadge.textContent = `${dlq.totalDeadLetters} msgs [${dlq.pendingInspection} pending]`;
      dlqCountBadge.style.color = dlq.pendingInspection > 0 ? 'var(--color-amber)' : 'var(--color-green)';
    }

    if (dlqTableBody && dlq.recentMessages) {
      if (dlq.recentMessages.length === 0) {
        dlqTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 18px;">[ HÀNG ĐỢI DEAD LETTER QUEUE ĐANG RỖNG — HỆ THỐNG VẬN HÀNH BÌNH THƯỜNG ]</td></tr>`;
      } else {
        dlqTableBody.innerHTML = dlq.recentMessages
          .map((m) => {
            const isPending = m.status === 'PENDING_INSPECTION';
            const statusClass = isPending ? 'is-pending' : 'is-replayed';
            return `
              <tr>
                <td style="font-weight: 700; color: #fff;">${m.id}</td>
                <td>${m.originalExchange}</td>
                <td style="color: var(--color-amber);">${m.failureReason}</td>
                <td>${m.retryCount}/${m.maxRetries}</td>
                <td><span class="dlq-status-badge ${statusClass}">${m.status}</span></td>
                <td style="text-align: right;">
                  ${isPending ? `<button class="btn-replay" data-dlq-id="${m.id}">Replay</button>` : '<span style="color: var(--text-dim); font-size: 0.68rem;">RESOLVED</span>'}
                </td>
              </tr>
            `;
          })
          .join('');

        // Attach Replay Listeners
        dlqTableBody.querySelectorAll('.btn-replay').forEach((btn) => {
          btn.addEventListener('click', async (e) => {
            const dlqId = e.target.getAttribute('data-dlq-id');
            e.target.disabled = true;
            e.target.textContent = 'Replaying...';
            try {
              const res = await fetch(`/api/monitoring/dlq/${dlqId}/replay`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
              });
              const json = await res.json();
              if (json.success) {
                appendLogEntry({
                  timestamp: new Date().toISOString(),
                  channel: 'DLQ',
                  level: 'SUCCESS',
                  source: 'Operator',
                  message: `Replay sent for [${dlqId}]`,
                });
                refreshTelemetrySnapshot();
              }
            } catch (err) {
              alert('Lỗi replay DLQ message: ' + err.message);
            }
          });
        });
      }
    }
  }

  // --- Render 6 Scenarios ---
  function renderScenarios(scenarios) {
    if (!scenarioGrid) return;
    scenariosStore = scenarios;

    const catBadgeMap = {
      PIPELINE: 'cat-pipeline',
      CONCURRENCY: 'cat-concurrency',
      RESILIENCE: 'cat-resilience',
      AI_ENGINE: 'cat-ai',
      SECURITY: 'cat-security',
      DIAGNOSTIC: 'cat-diagnostic',
    };

    scenarioGrid.innerHTML = scenarios
      .map((s) => {
        const badgeClass = catBadgeMap[s.category] || 'cat-pipeline';
        return `
          <div class="scenario-card" id="card-${s.id}">
            <span class="scenario-card-badge ${badgeClass}">${s.category}</span>
            <div class="scenario-name">${s.name}</div>
            <div class="scenario-desc">${s.description}</div>
            <div class="scenario-outcome">MỤC TIÊU: ${s.expectedOutcome}</div>
            <button class="btn-run-scenario" data-scenario-id="${s.id}">
              <span>KÍCH HOẠT KỊCH BẢN</span>
            </button>
            <div class="scenario-trace-box" id="trace-${s.id}"></div>
          </div>
        `;
      })
      .join('');

    // Attach Scenario Run Handlers
    scenarioGrid.querySelectorAll('.btn-run-scenario').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const scenarioId = btn.getAttribute('data-scenario-id');
        await executeScenario(scenarioId, btn);
      });
    });
  }

  async function executeScenario(scenarioId, btn) {
    const traceBox = document.getElementById(`trace-${scenarioId}`);
    btn.disabled = true;
    btn.innerHTML = `<span style="display:inline-block; animation: spin 1s linear infinite;">⟳</span> ĐANG THỰC THI...`;

    if (traceBox) {
      traceBox.classList.add('is-open');
      traceBox.innerHTML = `<div style="color: var(--color-cyan); margin-bottom: 8px;">> [INIT] Dispatching payload to integration engine...</div>`;
    }

    try {
      const res = await fetch(`/api/monitoring/scenarios/${scenarioId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const json = await res.json();
      if (res.ok && json.success) {
        const data = json.data;
        btn.innerHTML = `<span>✓ HOÀN TẤT (${data.executionTimeMs}ms)</span>`;
        btn.style.background = 'var(--color-green)';
        btn.style.borderColor = 'var(--color-green)';

        // Render Step Traces
        if (traceBox) {
          const stepsHtml = data.steps
            .map((step) => {
              const badgeClass = step.status === 'SUCCESS' ? 'is-success' : step.status === 'WARN' ? 'is-warn' : 'is-error';
              return `
                <div class="trace-step">
                  <span class="trace-step-badge ${badgeClass}">${step.status}</span>
                  <div style="flex: 1;">
                    <div style="color: #fff; font-weight: 700;">Bước ${step.stepNumber}: ${step.stepName} (${step.durationMs}ms)</div>
                    <div style="color: var(--text-muted); font-size: 0.7rem;">${step.details}</div>
                  </div>
                </div>
              `;
            })
            .join('');

          traceBox.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px solid var(--border-strong); padding-bottom: 6px;">
              <span style="color: var(--color-green); font-weight: 800;">STATUS: ${data.status}</span>
              <span style="color: var(--text-dim);">EXECUTION: ${data.executionTimeMs}ms</span>
            </div>
            <div style="margin-bottom: 10px;">${stepsHtml}</div>
            <div style="background: #070a11; padding: 8px; border: 1px solid var(--border-subtle); color: var(--color-cyan);">
              <div style="font-weight: 700; margin-bottom: 4px; color: var(--text-dim);">OUTPUT PAYLOAD INSPECTOR:</div>
              <pre style="margin: 0; font-size: 0.68rem; max-height: 120px; overflow-y: auto;">${JSON.stringify(data.outputPayload || {}, null, 2)}</pre>
            </div>
          `;
        }

        setTimeout(() => {
          btn.disabled = false;
          btn.innerHTML = `<span>KÍCH HOẠT KỊCH BẢN</span>`;
          btn.style.background = '';
          btn.style.borderColor = '';
        }, 4000);
      } else {
        throw new Error(json.error?.message || 'Execution error');
      }
    } catch (err) {
      btn.disabled = false;
      btn.innerHTML = `<span>✕ THẤT BẠI</span>`;
      btn.style.background = 'var(--color-red)';
      btn.style.borderColor = 'var(--color-red)';
      if (traceBox) {
        traceBox.innerHTML = `<div style="color: var(--color-red);">> [ERROR] ${err.message}</div>`;
      }
    }
  }

  // --- XSS-safe HTML Escape Helper ---
  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function authHeaders() {
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  // --- Terminal Log Console ---
  function appendLogEntry(log) {
    logsStore.unshift(log);
    if (logsStore.length > 250) logsStore.pop();

    if (currentFilter !== 'ALL' && log.channel !== currentFilter) {
      return;
    }

    if (!terminalLogs) return;

    const div = document.createElement('div');
    div.className = `log-entry level-${escapeHtml(log.level)}`;
    div.innerHTML = `
      <span class="log-time">[${escapeHtml(formatTime(log.timestamp))}]</span>
      <span class="log-channel">[${escapeHtml(log.channel)}]</span>
      <span class="log-source">&lt;${escapeHtml(log.source)}&gt;</span>
      <span class="log-msg">${escapeHtml(log.message)}</span>
    `;

    terminalLogs.appendChild(div);
    terminalLogs.scrollTop = terminalLogs.scrollHeight;
  }

  function renderFilteredLogs() {
    if (!terminalLogs) return;
    terminalLogs.innerHTML = '';
    const filtered = currentFilter === 'ALL' ? logsStore : logsStore.filter((l) => l.channel === currentFilter);
    filtered.slice().reverse().forEach((log) => {
      const div = document.createElement('div');
      div.className = `log-entry level-${escapeHtml(log.level)}`;
      div.innerHTML = `
        <span class="log-time">[${escapeHtml(formatTime(log.timestamp))}]</span>
        <span class="log-channel">[${escapeHtml(log.channel)}]</span>
        <span class="log-source">&lt;${escapeHtml(log.source)}&gt;</span>
        <span class="log-msg">${escapeHtml(log.message)}</span>
      `;
      terminalLogs.appendChild(div);
    });
    terminalLogs.scrollTop = terminalLogs.scrollHeight;
  }

  if (logFilterSelect) {
    logFilterSelect.addEventListener('change', (e) => {
      currentFilter = e.target.value;
      renderFilteredLogs();
    });
  }

  if (btnClearLogs) {
    btnClearLogs.addEventListener('click', () => {
      logsStore = [];
      if (terminalLogs) terminalLogs.innerHTML = '';
    });
  }

  if (btnClearDlq) {
    btnClearDlq.addEventListener('click', async () => {
      if (!confirm('Xác nhận xóa rỗng toàn bộ Dead Letter Queue?')) return;
      try {
        await fetch('/api/monitoring/dlq/clear', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        refreshTelemetrySnapshot();
      } catch (e) {
        alert('Lỗi clear DLQ: ' + e.message);
      }
    });
  }

  // --- Fetch Initial Snapshot (RBAC ADMIN Protected) ---
  async function refreshTelemetrySnapshot() {
    if (!token) return;
    try {
      const res = await fetch('/api/monitoring/telemetry', {
        headers: authHeaders(),
      });
      if (res.status === 401 || res.status === 403) {
        if (authGateModal) authGateModal.classList.add('is-active');
        return;
      }
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          renderContainers(d.containers);
          renderBrokerAndDlq(d.broker, d.dlq, d.traffic);
          if (logsStore.length === 0 && d.recentLogs) {
            logsStore = d.recentLogs;
            renderFilteredLogs();
          }
        }
      }
    } catch (e) {
      console.warn('Polling snapshot error:', e);
    }
  }

  async function loadScenariosList() {
    if (!token) return;
    try {
      const res = await fetch('/api/monitoring/scenarios', {
        headers: authHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          renderScenarios(json.data);
        }
      }
    } catch (e) {
      console.warn('Error loading scenarios list:', e);
    }
  }

  // --- Real-Time Server-Sent Events (SSE) Stream via Short-Lived Single-Use Ticket ---
  async function connectSse() {
    if (!token) return;
    if (sseSource) {
      sseSource.close();
    }

    let sseUrl = '';
    try {
      const ticketRes = await fetch('/api/monitoring/stream-ticket', {
        method: 'POST',
        headers: authHeaders(),
      });
      if (!ticketRes.ok) {
        if ((ticketRes.status === 401 || ticketRes.status === 403) && authGateModal) {
          authGateModal.classList.add('is-active');
        }
        return;
      }
      const ticketJson = await ticketRes.json();
      sseUrl = `/api/monitoring/stream?ticket=${encodeURIComponent(ticketJson.data.ticket)}`;
    } catch (err) {
      setTimeout(connectSse, 4000);
      return;
    }

    sseSource = new EventSource(sseUrl);

    sseSource.onopen = () => {
      if (sseIndicator) {
        sseIndicator.style.borderColor = 'var(--color-green)';
        sseIndicator.style.color = 'var(--color-green)';
        sseIndicator.innerHTML = '<span class="pulse-dot"></span> STREAM CONNECTED [SSE]';
      }
    };

    sseSource.addEventListener('telemetry:init', (e) => {
      try {
        const snapshot = JSON.parse(e.data);
        renderContainers(snapshot.containers);
        renderBrokerAndDlq(snapshot.broker, snapshot.dlq, snapshot.traffic);
      } catch (err) {}
    });

    sseSource.addEventListener('telemetry:tick', (e) => {
      try {
        const snapshot = JSON.parse(e.data);
        renderContainers(snapshot.containers);
        renderBrokerAndDlq(snapshot.broker, snapshot.dlq, snapshot.traffic);
      } catch (err) {}
    });

    sseSource.addEventListener('log:new', (e) => {
      try {
        const log = JSON.parse(e.data);
        appendLogEntry(log);
      } catch (err) {}
    });

    sseSource.addEventListener('dlq:new', (e) => {
      refreshTelemetrySnapshot();
    });

    sseSource.addEventListener('dlq:updated', (e) => {
      refreshTelemetrySnapshot();
    });

    sseSource.addEventListener('dlq:cleared', (e) => {
      refreshTelemetrySnapshot();
    });

    sseSource.onerror = () => {
      if (sseIndicator) {
        sseIndicator.style.borderColor = 'var(--color-amber)';
        sseIndicator.style.color = 'var(--color-amber)';
        sseIndicator.innerHTML = 'STREAM RECONNECTING...';
      }
      // Reconnect after 4s
      setTimeout(connectSse, 4000);
    };
  }

  // --- Initialization ---
  refreshTelemetrySnapshot();
  loadScenariosList();
  connectSse();

  // Polling safety fallback (every 8s)
  setInterval(refreshTelemetrySnapshot, 8000);
})();
