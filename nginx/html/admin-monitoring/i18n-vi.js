(function () {
  'use strict';

  const LANG_KEY = 'cyberrig_si_lang';

  const EXACT_TEXT_VI = {
    'Studio · SI Mesh': 'Studio · Lưới SI',
    'Order & AI POS': 'Đơn Đa Kênh & AI POS',
    'Search': 'Tìm',
    'Inventory': 'Kho hàng',
    'Storefront': 'Cửa hàng',
    'Sign out': 'Đăng xuất',
    '▶ Run E2E': '▶ Chạy E2E',
    'Zero-overhead RabbitMQ Exchange, Docker Containers & Redis Stock Lock Telemetry':
      'Giám sát thời gian thực RabbitMQ Exchange, 4 Container Docker & Khóa tồn kho nguyên tử Redis',
    'Simulate DLQ': 'Giả lập lỗi DLQ',
    'Events Published (Exchange)': 'Sự kiện đã phát (Exchange)',
    'Queue Ready / Processed': 'Hàng đợi sẵn sàng / Đã xử lý',
    'Dead Letter Queue (DLQ)': 'Hàng đợi thư chết (DLQ)',
    'Queue: cyberrig.orders.dlq (Max 3 retries)': 'Hàng đợi: cyberrig.orders.dlq (Tối đa 3 lần thử)',
    'Realtime Throughput': 'Thông lượng thời gian thực',
    'Container Infrastructure Mesh': 'Lưới Hạ Tầng Container',
    'PostgreSQL · Redis Atomic Lock · Node Integration Hub · Nginx Edge':
      'PostgreSQL · Khóa nguyên tử Redis · Trung tâm tích hợp Node · Cổng Nginx',
    'All services': 'Tất cả dịch vụ',
    'Healthy only': 'Chỉ dịch vụ khỏe',
    'Service Container': 'Container Dịch Vụ',
    'Port → Ping Latency → Heap Allocation': 'Cổng → Độ trễ Ping → Bộ nhớ Heap',
    'Status': 'Trạng thái',
    'DLQ & Incident Spotlight': 'Tâm Điểm Sự Cố & DLQ',
    'Poison Pill Quarantine': 'Cách Ly Thông Điệp Hỏng',
    'Failed integration payloads isolate in cyberrig.orders.dlq with 1-click Replay recovery.':
      'Các gói tin lỗi được cách ly an toàn vào cyberrig.orders.dlq kèm nút Phát lại (Replay) 1-click.',
    'Clear DLQ': 'Xóa sạch DLQ',
    'Inspect Scenarios': 'Xem Kịch Bản',
    'Live Telemetry & Event Stream Console (SSE)': 'Bảng Nhật Ký Sự Kiện Thời Gian Thực (SSE)',
    'ALL CHANNELS': 'TẤT CẢ KÊNH',
    'BROKER (RABBITMQ)': 'BROKER (RABBITMQ)',
    'DEAD LETTER (DLQ)': 'THƯ CHẾT (DLQ)',
    'SCENARIO TEST': 'KỊCH BẢN LAB',
    'CONTAINER HEALTH': 'SỨC KHỎE CONTAINER',
    'SECURITY / RATE LIMIT': 'BẢO MẬT / GIỚI HẠN TỐC ĐỘ',
    'AI DATA MAPPER': 'BỘ ÁNH XẠ AI',
    'Clear Console': 'Xóa Màn Hình',
    'Dead Letter Queue Inspector': 'Trình Kiểm Tra Hàng Đợi DLQ',
    'Queue': 'Hàng đợi',
    'ID / Exchange': 'Mã ID / Exchange',
    'Reason': 'Nguyên nhân',
    'Action': 'Thao tác',
    'Scenario Testing Lab': 'Phòng Lab Kiểm Thử Kịch Bản',
    'Interactive 6-scenario integration deck · executes non-destructive pipeline, Redis lock, AI & rate-limit tests':
      'Bộ 6 kịch bản tích hợp tương tác · kiểm thử luồng đơn hàng, khóa kho Redis, AI & giới hạn tốc độ an toàn',
    'Order & AI POS Simulator': 'Mô Phỏng Đơn Đa Kênh & AI POS',
    'Canonical Adapter · X-Correlation-ID Tracing · EventBus Outbox & Decree 13 PII Redaction Engine':
      'Chuẩn hóa Canonical Adapter · Truy vết X-Correlation-ID · EventBus Outbox & Che mờ PII Nghị định 13',
    'Reports · CEO Executive': 'Báo Cáo · Điều Hành CEO',
    'PC Builder GMV, Hardware Catalog Stock Alerts, Repair Ticket SLAs & Zero-Loss SI Protection':
      'Tổng doanh thu GMV PC Builder, Cảnh báo tồn kho, SLA Sửa chữa & Chốt chặn bảo vệ đơn hàng SI',
    '↓ Export CSV': '↓ Xuất CSV',
    'GMV Revenue': 'Doanh thu GMV',
    'Order Volume': 'Sản lượng đơn',
    'Fulfillment SLA': 'Tỷ lệ SLA',
    'DLQ Protection': 'Bảo vệ DLQ',
    '6 periods': '6 chu kỳ',
    '12 periods': '12 chu kỳ',
    'Total · CyberRig GMV': 'Tổng Doanh Thu · CyberRig GMV',
    'Confirmed + Pipeline': 'Đã thu + Đang xử lý',
    'PC Builder & Retail Orders': 'Đơn Hàng PC Builder & Bán Lẻ',
    'Fulfillment SLA & Stock': 'Tỷ Lệ SLA & Tồn Kho',
    'Repair Tickets & DLQ Guard': 'Phiếu Sửa Chữa & Chốt Chặn DLQ',
    'Executive Curve': 'Đường cong điều hành',
    'Period Velocity Breakdown': 'Phân Rã Tốc Độ Theo Chu Kỳ',
    'Hover column for metric': 'Rê chuột vào cột để xem chi tiết',
    'Revenue Mix (PC Builder · Upgrades · Repair Lab)': 'Cơ Cấu Doanh Thu (PC Builder · Nâng Cấp · Phòng Lab)',
    'Channels': 'Kênh thu',
    'Business Line': 'Mảng Kinh Doanh',
    'Volume': 'Sản Lượng',
    'Revenue (VND)': 'Doanh Thu (VNĐ)',
    'Share': 'Tỷ Trọng',
    'Low-Stock Alerts & Repair Pipeline': 'Cảnh Báo Sắp Hết Hàng & Tiến Độ Sửa Chữa',
    'Stock Watch': 'Theo dõi kho',
    'Hardware SKU · Brand': 'Mã Linh Kiện · Hãng',
    'Stock': 'Tồn Kho',
    'Alert': 'Cảnh Báo',
    'SECURITY CLEARANCE REQUIRED': 'YÊU CẦU QUYỀN TRUY CẬP QUẢN TRỊ',
    'Admin Operator Sign-In': 'Đăng Nhập Quản Trị Viên SOC',
    'Authenticate ADMIN': 'Xác Thực ADMIN',
  };

  const DYN_PHRASES = {
    role_pg: { en: 'Primary Relational Database', vi: 'Cơ sở dữ liệu quan hệ chính' },
    role_redis: { en: 'Cache & Atomic Concurrency Stock Lock', vi: 'Bộ đệm & Khóa tồn kho nguyên tử' },
    role_app: { en: 'Node.js Express API & Integration Hub', vi: 'Cổng Express API & Trung tâm tích hợp' },
    role_nginx: { en: 'Edge Gateway & Reverse Proxy', vi: 'Cổng biên & Reverse Proxy' },
    sse_live: { en: 'STREAM CONNECTED [SSE]', vi: 'ĐÃ KẾT NỐI LUỒNG [SSE]' },
    target_lbl: { en: 'Target', vi: 'Mục tiêu' },
    exec_scenario: { en: '▶ Execute Scenario', vi: '▶ Chạy Kịch Bản' },
    running_steps: { en: 'Running end-to-end steps...', vi: 'Đang thực thi các bước kiểm thử...' },
    dlq_nominal: { en: 'Broker nominal · Zero stuck messages', vi: 'Broker ổn định · Không có tin kẹt' },
    dlq_empty: { en: 'Dead Letter Queue empty', vi: 'Hàng đợi thư chết (DLQ) đang trống' },
    no_dlq: { en: 'No DLQ entries', vi: 'Không có mục lỗi DLQ' },
    replay_btn: { en: 'Replay', vi: 'Phát lại' },
    done_chip: { en: 'DONE', vi: 'XONG' },
    wait_sse: { en: 'Waiting for SSE events...', vi: 'Đang chờ luồng sự kiện SSE...' },
    chart_gmv: { en: 'CyberRig GMV Revenue Trend (Million VND)', vi: 'Xu Hướng Doanh Thu GMV CyberRig (Triệu VNĐ)' },
    chart_orders: { en: 'PC Builder & Retail Orders Velocity', vi: 'Tốc Độ Đơn Hàng PC Builder & Bán Lẻ' },
    chart_sla: { en: 'Fulfillment & Compatibility Check SLA (%)', vi: 'Tỷ Lệ Đạt Chuẩn SLA Xử Lý & Tương Thích (%)' },
    chart_dlq: { en: 'DLQ Zero-Loss Poison Pill Protection', vi: 'Chốt Chặn DLQ Bảo Vệ 0% Mất Đơn Hàng' },
    all_sku_ok: { en: 'All hardware SKUs healthy', vi: 'Toàn bộ mã linh kiện đều đủ tồn kho an toàn' },
    sim_card1: { en: '1 · Heterogeneous Order Adapter & EDA Dispatch', vi: '1 · Chuẩn Hóa Đơn Hàng Dị Thể & Phát Sự Kiện EDA' },
    sim_channel: { en: 'Source Channel', vi: 'Kênh nguồn đơn hàng' },
    sim_sku: { en: 'Hardware SKU', vi: 'Mã linh kiện SKU' },
    sim_cust: { en: 'Customer Name', vi: 'Tên khách hàng' },
    sim_phone_qty: { en: 'Phone + Qty', vi: 'SĐT + Số lượng' },
    sim_addr: { en: 'Delivery Address', vi: 'Địa chỉ giao hàng' },
    sim_fault: { en: 'Inject TMS Carrier Timeout Fault (Verify 3x Retry -> DLQ)', vi: 'Giả lập lỗi hãng vận chuyển TMS (Thử lại 3 lần -> DLQ)' },
    sim_btn_order: { en: '▶ Place Heterogeneous Order', vi: '▶ Đặt Đơn Đa Kênh' },
    sim_broker_off: { en: 'Set Broker Offline (503 Test)', vi: 'Ngắt Broker (Test lỗi 503)' },
    sim_broker_on: { en: 'Restore Broker Online', vi: 'Khôi Phục Broker Online' },
    sim_pause_tms: { en: 'Pause TMS Consumer', vi: 'Tạm Dừng TMS Consumer' },
    sim_resume_tms: { en: 'Resume TMS Consumer', vi: 'Tiếp Tục TMS Consumer' },
    sim_card2: { en: '2 · AI POS Ingestion & Decree 13 PII Redaction', vi: '2 · Tiếp Nhận Hóa Đơn AI POS & Che Mờ PII (Nghị định 13)' },
    sim_pos_lbl: { en: 'Unstructured POS / Chat Receipt (Raw PII is scrubbed before LLM/Matcher)', vi: 'Hóa đơn POS / Tin nhắn thô (Tự động che SĐT & Email trước khi qua AI)' },
    sim_auto_ord: { en: 'Auto-create real Order & Redis Lock after AI Mapping', vi: 'Tự động tạo Đơn hàng thật & Khóa kho Redis sau khi AI ánh xạ' },
    sim_btn_ai: { en: '✦ Mask PII & Map to Canonical Order', vi: '✦ Che PII & Ánh Xạ Đơn Chuẩn' },
    sim_btn_refresh: { en: '↻ Refresh Bus State', vi: '↻ Làm Mới Trạng Thái Bus' },
    sim_card_bus: { en: 'Event Bus, Outbox & Downstream Workers', vi: 'Event Bus, Outbox & Các Worker Hạ Nguồn' },
    sim_card_json: { en: 'Live Adapter / AI / Crawler Output & Trace', vi: 'Kết Quả Chuẩn Hóa / AI / Crawler & Vết Tương Quan' },
    sim_card3: { en: '3 · Hardware Price & New SKU Crawler (Multi-Source + Real-time SSE Bell)', vi: '3 · Trình Cào Giá & Linh Kiện Mới Đa Nguồn (Chuông SSE Thời Gian Thực)' },
    sim_crawl_auto: { en: 'Auto-Apply to Catalog', vi: 'Tự động áp dụng vào kho' },
    sim_crawl_run: { en: '▶ Crawl Feed Now', vi: '▶ Cào Dữ Liệu Ngay' },
    sim_crawl_app: { en: '✓ Approve All Pending', vi: '✓ Duyệt Tất Cả Chờ' },
    sim_crawl_open: { en: 'Open Inventory Queue →', vi: 'Mở Hàng Đợi Kho →' },
  };

  function getLang() {
    try {
      return localStorage.getItem(LANG_KEY) === 'vi' ? 'vi' : 'en';
    } catch (_e) {
      return 'en';
    }
  }

  function t(key) {
    const lang = getLang();
    return DYN_PHRASES[key]?.[lang] || DYN_PHRASES[key]?.en || key;
  }

  function translateRole(roleStr) {
    if (getLang() !== 'vi') return roleStr;
    if (roleStr === DYN_PHRASES.role_pg.en) return DYN_PHRASES.role_pg.vi;
    if (roleStr === DYN_PHRASES.role_redis.en) return DYN_PHRASES.role_redis.vi;
    if (roleStr === DYN_PHRASES.role_app.en) return DYN_PHRASES.role_app.vi;
    if (roleStr === DYN_PHRASES.role_nginx.en) return DYN_PHRASES.role_nginx.vi;
    return roleStr;
  }

  const trackedNodes = [];
  function collectTranslatableNodes() {
    if (trackedNodes.length > 0) return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const trimmed = node.nodeValue.trim();
      if (trimmed && EXACT_TEXT_VI[trimmed]) {
        trackedNodes.push({ node, en: node.nodeValue, trimmed });
      }
    }
  }

  function applyLanguage(lang) {
    const isVi = lang === 'vi';
    try { localStorage.setItem(LANG_KEY, isVi ? 'vi' : 'en'); } catch (_e) {}
    document.documentElement.setAttribute('lang', isVi ? 'vi' : 'en');

    collectTranslatableNodes();
    trackedNodes.forEach((entry) => {
      entry.node.nodeValue = isVi
        ? entry.en.replace(entry.trimmed, EXACT_TEXT_VI[entry.trimmed])
        : entry.en;
    });

    const tabScen = document.getElementById('tabScenario');
    if (tabScen && tabScen.firstChild) {
      tabScen.firstChild.nodeValue = isVi ? 'Kịch Bản ' : 'Scenarios ';
    }
    const tabCeo = document.getElementById('tabCeo');
    if (tabCeo && tabCeo.firstChild) {
      tabCeo.firstChild.nodeValue = isVi ? 'Báo Cáo · CEO ' : 'Reports · CEO ';
    }
    const searchInp = document.getElementById('quickSearchInput');
    if (searchInp) searchInp.placeholder = isVi ? 'Mã SKU / kịch bản / nhật ký' : 'SKU / scenario / log';

    const sseInd = document.getElementById('sseIndicator');
    if (sseInd) sseInd.innerHTML = `<span class="live-dot"></span>${t('sse_live')}`;

    const langBtn = document.getElementById('btnLangToggle');
    if (langBtn) {
      langBtn.textContent = isVi ? 'VIE ✓' : 'VIE';
      langBtn.classList.toggle('is-lang-active', isVi);
      langBtn.title = isVi ? 'Đang dùng Tiếng Việt — Bấm để chuyển sang English' : 'Chuyển giao diện sang Tiếng Việt (VIE)';
    }

    const simRoot = document.getElementById('simulatorRoot');
    if (simRoot && simRoot.dataset.mounted === '1') {
      simRoot.dataset.mounted = '0';
      window.cyberigRefreshSimulator?.();
    }
    window.cyberigLab?.loadScenariosList?.();
    window.cyberigRefreshTelemetry?.();
    window.cyberigRefreshCeoDashboard?.();
  }

  function toggleLang() {
    const next = getLang() === 'vi' ? 'en' : 'vi';
    applyLanguage(next);
    window.cyberigUi?.showToast(next === 'vi' ? '✓ Đã chuyển giao diện sang Tiếng Việt (VIE)' : '✓ Switched interface to English (ENG)');
  }

  window.cyberigI18n = { getLang, t, translateRole, applyLanguage, toggleLang };

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btnLangToggle')?.addEventListener('click', toggleLang);
    if (getLang() === 'vi') applyLanguage('vi');
  });
})();
