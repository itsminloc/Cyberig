(function () {
  'use strict';

  function esc(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function authHeaders() {
    const token = localStorage.getItem('cyberrig_access_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function executeScenario(scenarioId) {
    const t = (k) => (window.cyberigI18n ? window.cyberigI18n.t(k) : k);
    const traceEl = document.getElementById(`trace-${scenarioId}`);
    if (traceEl) traceEl.textContent = t('running_steps');
    const res = await fetch(`/api/monitoring/scenarios/${scenarioId}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
    }).catch(() => null);
    const json = await res?.json().catch(() => null);
    if (!res?.ok || !json?.success) {
      if (traceEl) traceEl.textContent = `Failed: ${json?.error?.message || 'Unauthorized'}`;
      return;
    }
    const r = json.data;
    if (traceEl) {
      traceEl.innerHTML = `<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border-hairline);font-family:var(--font-mono);font-size:10.5px;">
        <div style="color:var(--accent-primary);font-weight:700;margin-bottom:4px;">${esc(r.status)} · ${r.executionTimeMs}ms</div>
        ${(r.steps || []).map((st) => `<div>#${st.stepNumber} ${esc(st.stepName)} (${st.durationMs}ms) — ${esc(st.status)}</div>`).join('')}
      </div>`;
    }
    window.cyberigUi.showToast(`✓ ${r.scenarioName}: ${r.status} (${r.executionTimeMs}ms)`);
    window.cyberigRefreshTelemetry?.();
  }

  function renderScenarios(list) {
    const t = (k) => (window.cyberigI18n ? window.cyberigI18n.t(k) : k);
    const grid = document.getElementById('scenarioGrid');
    if (!grid) return;
    grid.innerHTML = (list || [])
      .map((sc) => `<div class="bento-card">
        <div class="card-label"><span>${esc(sc.category)}</span><span class="operator-chip">${esc(sc.id.slice(0, 10))}</span></div>
        <h3 style="font-size:15px;font-weight:700;margin-bottom:6px;">${esc(sc.name)}</h3>
        <p style="font-size:11.5px;color:var(--ink-secondary);margin-bottom:10px;">${esc(sc.description)}</p>
        <div style="font-size:11px;color:var(--accent-primary);margin-bottom:12px;">${esc(t('target_lbl'))}: ${esc(sc.expectedOutcome)}</div>
        <button type="button" class="btn-pill-primary" data-run-scenario="${esc(sc.id)}">${esc(t('exec_scenario'))}</button>
        <div id="trace-${esc(sc.id)}"></div>
      </div>`)
      .join('');
    grid.querySelectorAll('[data-run-scenario]').forEach((btn) => {
      btn.addEventListener('click', () => executeScenario(btn.getAttribute('data-run-scenario')));
    });
  }

  async function loadScenariosList() {
    const token = localStorage.getItem('cyberrig_access_token');
    if (!token) return;
    const res = await fetch('/api/monitoring/scenarios', { headers: authHeaders() }).catch(() => null);
    const json = await res?.json().catch(() => null);
    if (json?.success && Array.isArray(json.data)) renderScenarios(json.data);
  }

  function renderDlqSection(dlq) {
    const isVi = window.cyberigI18n?.getLang() === 'vi';
    const t = (k) => (window.cyberigI18n ? window.cyberigI18n.t(k) : k);
    const pendingCount = dlq.pendingInspection || 0;
    document.getElementById('dlqCountBadge').textContent = isVi
      ? `${dlq.totalDeadLetters} tin (${pendingCount} chờ xử lý)`
      : `${dlq.totalDeadLetters} msgs (${pendingCount} pending)`;
    document.getElementById('bellDlqCount').textContent = String(pendingCount);
    document.getElementById('dlqNavBadge').textContent = String(pendingCount);
    document.getElementById('spotlightStatus').textContent = pendingCount > 0
      ? (isVi ? `Cảnh báo · ${pendingCount} gói tin lỗi đã cách ly` : `Alert · ${pendingCount} poison pill quarantined`)
      : t('dlq_nominal');

    const msgs = dlq.recentMessages || [];
    document.getElementById('dlqCompactList').innerHTML = msgs.slice(0, 3)
      .map((m) => `<div class="agenda-item">
        <div>
          <strong style="color:#fff;">${esc(m.id)}</strong>
          <div style="font-size:10.5px;color:#8e9299;">${esc(m.failureReason)} · retry ${m.retryCount}/${m.maxRetries}</div>
        </div>
        <span class="trend-pill">${esc(m.status)}</span>
      </div>`).join('') || `<div class="agenda-item"><span>${esc(t('no_dlq'))}</span><span>SAFE</span></div>`;

    const tbody = document.getElementById('dlqTableBody');
    if (!tbody) return;
    tbody.innerHTML = msgs.length === 0
      ? `<tr><td colspan="3" style="color:var(--ink-secondary);text-align:center;">${esc(t('dlq_empty'))}</td></tr>`
      : msgs.map((m) => {
          const pending = m.status === 'PENDING_INSPECTION';
          return `<tr>
            <td><strong style="font-family:var(--font-mono);">${esc(m.id)}</strong><div style="font-size:10.5px;color:var(--ink-secondary);">${esc(m.originalExchange)}</div></td>
            <td><span style="color:var(--accent-amber);font-size:11px;font-weight:600;">${esc(m.failureReason)}</span></td>
            <td style="text-align:right;">${pending ? `<button type="button" class="btn-pill-primary" data-dlq-id="${esc(m.id)}" style="padding:3px 10px;font-size:10.5px;">${esc(t('replay_btn'))}</button>` : `<span class="operator-chip">${esc(t('done_chip'))}</span>`}</td>
          </tr>`;
        }).join('');

    tbody.querySelectorAll('[data-dlq-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const dlqId = btn.getAttribute('data-dlq-id');
        btn.disabled = true;
        const res = await fetch(`/api/monitoring/dlq/${dlqId}/replay`, { method: 'POST', headers: authHeaders() }).catch(() => null);
        if (res?.ok) {
          window.cyberigUi.showToast(`✓ Replayed DLQ [${dlqId}]`);
          window.cyberigRefreshTelemetry?.();
        } else {
          btn.disabled = false;
        }
      });
    });
  }

  document.getElementById('btnQuickScenarioRun')?.addEventListener('click', () => executeScenario('scenario-1-order-placement'));
  document.getElementById('btnQuickDlq')?.addEventListener('click', () => executeScenario('scenario-3-trigger-dlq'));
  document.getElementById('btnClearDlq')?.addEventListener('click', async () => {
    const res = await fetch('/api/monitoring/dlq/clear', { method: 'POST', headers: authHeaders() }).catch(() => null);
    if (res?.ok) {
      window.cyberigUi.showToast('✓ Cleared Dead Letter Queue');
      window.cyberigRefreshTelemetry?.();
    }
  });

  window.cyberigLab = { loadScenariosList, renderDlqSection, executeScenario };
})();
