(function () {
  'use strict';

  let activeMetric = 'gmv';
  let activeRange = 12;
  let lastSummary = null;

  function esc(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatVnd(amount) {
    return Number(amount || 0).toLocaleString('vi-VN') + ' ₫';
  }

  function renderCharts(summary) {
    const trend = (summary.trendSeries || []).slice(12 - activeRange);
    const series = trend.map((pt) => {
      if (activeMetric === 'orders') {
        return { label: pt.label, val: pt.orders, display: `${pt.orders} orders` };
      }
      if (activeMetric === 'sla') {
        return { label: pt.label, val: pt.slaPercent, display: `${pt.slaPercent}% SLA` };
      }
      if (activeMetric === 'dlq') {
        return { label: pt.label, val: Math.max(1, pt.dlqGuarded), display: `${pt.dlqGuarded} guarded` };
      }
      return { label: pt.label, val: pt.gmvMillionsVnd, display: `${pt.gmvMillionsVnd}M VND` };
    });

    const titles = {
      gmv: 'CyberRig GMV Revenue Trend (Million VND)',
      orders: 'PC Builder & Retail Orders Velocity',
      sla: 'Fulfillment & Compatibility Check SLA (%)',
      dlq: 'DLQ Zero-Loss Poison Pill Protection',
    };
    const titleEl = document.getElementById('areaChartTitle');
    if (titleEl) titleEl.textContent = titles[activeMetric] || titles.gmv;
    window.cyberigUi.renderAreaChart('ceoAreaChartSvg', series);
    window.cyberigUi.renderBarChart('ceoBarChartWrap', 'barHoverHint', series);
  }

  async function refreshCeoDashboard() {
    const token = localStorage.getItem('cyberrig_access_token');
    if (!token) return;
    const res = await fetch('/api/monitoring/ceo-summary', {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null);
    if (!res || !res.ok) return;
    const json = await res.json().catch(() => null);
    if (!json?.success || !json.data) return;

    const d = json.data;
    lastSummary = d;

    const srcBadge = document.getElementById('ceoDataSourceBadge');
    if (srcBadge) srcBadge.textContent = `DATA: ${d.dataSource}`;

    window.cyberigUi.animateCountUp(document.getElementById('ceoTotalRevenue'), d.kpis.totalGmvVnd, formatVnd);
    window.cyberigUi.animateCountUp(document.getElementById('ceoTotalOrders'), d.kpis.totalOrders);
    window.cyberigUi.animateCountUp(document.getElementById('ceoCompletionRate'), d.kpis.fulfillmentSlaPercent, (v) => `${v}%`);

    document.getElementById('ceoConfirmedSub').textContent = `${formatVnd(d.kpis.confirmedRevenueVnd)} settled`;
    document.getElementById('ceoPendingOrders').textContent = String(d.kpis.pendingOrders);
    document.getElementById('ceoInventoryValue').textContent = `${d.kpis.activeHardwareSkus} SKUs · ${Math.round(d.kpis.totalInventoryValueVnd / 1_000_000)}M₫ stock`;
    document.getElementById('ceoRepairTotal').textContent = `${d.kpis.repairTicketsTotal} tickets (${d.kpis.repairCompletedCount} done)`;
    const slaNote = d.slaBenchmark?.eventDrivenVsPollingLatencyReduction ? ` · ${d.slaBenchmark.eventDrivenVsPollingLatencyReduction}` : '';
    document.getElementById('ceoDlqSaved').textContent = `${d.kpis.dlqProtectedCount} DLQ protected · P95 ${d.kpis.p95LatencyMs}ms${slaNote}`;

    document.getElementById('ceoChannelBody').innerHTML = (d.revenueChannels || [])
      .map((ch) => `<tr>
        <td>${esc(ch.channelName)}</td>
        <td>${ch.volumeCount}</td>
        <td><strong>${esc(formatVnd(ch.revenueVnd))}</strong></td>
        <td><span class="flow-pill is-pending" style="padding:2px 8px;font-size:10.5px;">${ch.sharePercent}%</span></td>
      </tr>`)
      .join('');

    document.getElementById('ceoRepairPipeline').innerHTML = (d.repairPipeline || [])
      .map((st) => `<span class="operator-chip">${esc(st.status)}: <strong style="color:var(--accent-primary);">${st.count}</strong></span>`)
      .join('');

    const lowAlerts = d.lowStockAlerts || [];
    document.getElementById('ceoLowStockTag').textContent = `${d.kpis.lowStockCount} Low / OOS`;
    document.getElementById('ceoLowStockBody').innerHTML = lowAlerts.length === 0
      ? '<tr><td colspan="3" style="color:var(--accent-green);">All hardware SKUs healthy</td></tr>'
      : lowAlerts.map((a) => `<tr>
          <td><strong>${esc(a.categoryId)}</strong> · ${esc(a.name.slice(0, 38))}</td>
          <td>${a.stockQuantity}</td>
          <td><span class="flow-pill ${a.severity === 'OUT_OF_STOCK' ? 'is-booked' : 'is-pending'}" style="padding:2px 8px;font-size:10px;">${esc(a.severity)}</span></td>
        </tr>`).join('');

    renderCharts(d);
  }

  document.querySelectorAll('#ceoMetricSwitch .seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#ceoMetricSwitch .seg-btn').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activeMetric = btn.getAttribute('data-metric') || 'gmv';
      if (lastSummary) renderCharts(lastSummary);
    });
  });

  document.querySelectorAll('#ceoRangeSwitch .seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#ceoRangeSwitch .seg-btn').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activeRange = Number(btn.getAttribute('data-range') || 12);
      if (lastSummary) renderCharts(lastSummary);
    });
  });

  document.getElementById('btnExportCsv')?.addEventListener('click', () => {
    if (!lastSummary) return;
    const rows = [
      ['Metric', 'Value'],
      ['TotalGmvVnd', String(lastSummary.kpis.totalGmvVnd)],
      ['ConfirmedRevenueVnd', String(lastSummary.kpis.confirmedRevenueVnd)],
      ['TotalOrders', String(lastSummary.kpis.totalOrders)],
      ['ActiveHardwareSkus', String(lastSummary.kpis.activeHardwareSkus)],
      ['LowStockCount', String(lastSummary.kpis.lowStockCount)],
      ['FulfillmentSlaPercent', String(lastSummary.kpis.fulfillmentSlaPercent)],
      ['DlqProtectedCount', String(lastSummary.kpis.dlqProtectedCount)],
    ];
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'cyberrig-ceo-report.csv';
    link.click();
    window.cyberigUi.showToast('✓ Exported cyberrig-ceo-report.csv');
  });

  window.cyberigRefreshCeoDashboard = refreshCeoDashboard;
})();
