/**
 * CyberRig Main Frontend Application Bootstrap
 * High-Tech Architecture (GSAP & Osmo Hybrid) - Task FE-POLISH-DAYNIGHT-V3
 */
import { initTheme } from './theme.js';
import { initAuth, syncAuthState } from './auth.js';
import { initModals, openSimTestModal, closeSimTestModal } from './components/modals.js';
import { initDashboard } from './components/dashboard.js';
import { initAdmin } from './components/admin.js';
import { initRouter, checkRoute, navigateTo } from './router.js';
import { loadPreset, clearBuild, setStoredBuild, getStoredBuild, renderBuilder } from './components/builder.js';

/**
 * High-Tech Interactive %Bar Compatibility Scanner Engine & Quick Test Wiring
 */
function initCompatibilityScanner() {
  const scannerHud = document.getElementById('compatibility-scanner-hud');
  const percentVal = document.getElementById('scanner-percent-val');
  const fillBar = document.getElementById('scanner-fill-bar');
  const statusMsg = document.getElementById('scanner-status-msg');
  const ctaBtn = document.getElementById('scanner-cta-btn');

  const simForm = document.getElementById('sim-test-form');
  const simCpuSelect = document.getElementById('sim-test-cpu-select');
  const simMbSelect = document.getElementById('sim-test-mb-select');

  const metricTiles = document.querySelectorAll('.scanner-metric-tile');

  if (!scannerHud || !percentVal || !fillBar || !statusMsg || !ctaBtn) return;

  let currentPercent = 0;
  let targetPercent = 0;
  let animFrameId = null;
  let isRunning = false;
  let activeTestedBuild = null;

  const telemetrySteps = [
    { threshold: 25, text: '[ SCANNING ] Đang kiểm tra Socket CPU (LGA1700 / AM5) & Bo mạch chủ...' },
    { threshold: 50, text: '[ ANALYZING ] Tính toán công suất tiêu thụ TDP & Biên dự phòng +25%...' },
    { threshold: 75, text: '[ VERIFYING ] Băng thông PCIe 5.0 & Khe cắm bộ nhớ DDR5...' },
    { threshold: 99, text: '[ OPTIMIZING ] Kích thước khoang vỏ Case & Tản nhiệt nước 360mm...' },
    { threshold: 100, text: '[ 100% COMPATIBLE ] TOÀN BỘ LINH KIỆN ĐỒNG BỘ TUYỆT ĐỐI!' }
  ];

  function getStepText(pct) {
    for (const step of telemetrySteps) {
      if (pct <= step.threshold) return step.text;
    }
    return telemetrySteps[telemetrySteps.length - 1].text;
  }

  function updateScannerUI(pct) {
    percentVal.textContent = Math.floor(pct);
    fillBar.style.width = pct + '%';
    statusMsg.textContent = getStepText(pct);

    if (pct >= 100) {
      ctaBtn.classList.add('is-ready');
      ctaBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>TƯƠNG THÍCH HOÀN HẢO 100% — XEM TRONG PC BUILDER NGAY</span>
      `;
    } else {
      ctaBtn.classList.remove('is-ready');
      ctaBtn.textContent = 'KIỂM TRA TƯƠNG THÍCH LINH KIỆN';
    }
  }

  let lastTimestamp = null;

  function step(timestamp) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.05); // seconds (capped at 50ms)
    lastTimestamp = timestamp;

    if (currentPercent < targetPercent) {
      // 55% per second = ~1.8s for 0% to 100%
      currentPercent = Math.min(targetPercent, currentPercent + (dt * 55));
      updateScannerUI(currentPercent);
      if (currentPercent < targetPercent) {
        animFrameId = requestAnimationFrame(step);
      } else {
        isRunning = false;
        lastTimestamp = null;
        if (activeTestedBuild) {
          applyTestResults(activeTestedBuild);
        }
      }
    } else if (currentPercent > targetPercent) {
      // 125% per second = ~0.8s for 100% to 0%
      currentPercent = Math.max(targetPercent, currentPercent - (dt * 125));
      updateScannerUI(currentPercent);
      if (currentPercent > targetPercent) {
        animFrameId = requestAnimationFrame(step);
      } else {
        isRunning = false;
        lastTimestamp = null;
        scannerHud.classList.remove('is-rumbling');
      }
    } else {
      isRunning = false;
      lastTimestamp = null;
      scannerHud.classList.remove('is-rumbling');
    }
  }

  function startScan(target = 100) {
    targetPercent = target;
    scannerHud.classList.add('is-rumbling');
    if (!isRunning) {
      isRunning = true;
      lastTimestamp = null;
      if (animFrameId) cancelAnimationFrame(animFrameId);
      animFrameId = requestAnimationFrame(step);
    }
  }

  function resetScan() {
    targetPercent = 0;
    if (!isRunning) {
      isRunning = true;
      lastTimestamp = null;
      if (animFrameId) cancelAnimationFrame(animFrameId);
      animFrameId = requestAnimationFrame(step);
    }
  }

  function applyTestResults(testData) {
    const { cpu, mb } = testData;
    const isSocketMatch = cpu.socket === mb.socket;

    if (metricTiles.length >= 4) {
      const tile1Val = metricTiles[0].querySelector('.metric-tile-val');
      const tile2Val = metricTiles[1].querySelector('.metric-tile-val');
      const tile3Val = metricTiles[2].querySelector('.metric-tile-val');
      const tile4Val = metricTiles[3].querySelector('.metric-tile-val');

      if (tile1Val) {
        tile1Val.textContent = isSocketMatch
          ? `${cpu.socket} • 100% Khớp Chân Cắm`
          : `XUNG ĐỘT (${cpu.socket} vs ${mb.socket})`;
        tile1Val.style.color = isSocketMatch ? '#10b981' : '#ef4444';
      }
      if (tile2Val) {
        tile2Val.textContent = `${cpu.tdp}W TDP • Biên +25% An Toàn`;
      }
      if (tile3Val) {
        tile3Val.textContent = 'PCIe Gen 5.0 • Băng Thông Tối Đa';
      }
      if (tile4Val) {
        tile4Val.textContent = 'Kích Thước ATX • Chuẩn Vỏ Case';
      }
    }

    if (isSocketMatch) {
      statusMsg.innerHTML = `<strong>[ 100% TƯƠNG THÍCH ]</strong> ${cpu.name} và ${mb.name} đồng bộ Socket ${cpu.socket} hoàn hảo!`;
      statusMsg.style.color = '#10b981';
      ctaBtn.classList.add('is-ready');
      ctaBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>TƯƠNG THÍCH 100% — MỞ BUILDER VỚI CẶP LINH KIỆN NÀY</span>
      `;
    } else {
      statusMsg.innerHTML = `<strong>[ XUNG ĐỘT SOCKET ]</strong> ${cpu.name} (${cpu.socket}) KHÔNG cắm vừa ${mb.name} (${mb.socket})!`;
      statusMsg.style.color = '#ef4444';
      ctaBtn.classList.remove('is-ready');
      ctaBtn.textContent = 'XUNG ĐỘT PHẦN CỨNG — CHỌN LẠI LINH KIỆN';
    }
  }

  // Hover animations for HUD
  scannerHud.addEventListener('mouseenter', () => {
    startScan(100);
  });
  scannerHud.addEventListener('mouseleave', () => {
    resetScan();
  });

  // Click on CTA Button or HUD
  ctaBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (activeTestedBuild && ctaBtn.classList.contains('is-ready')) {
      // Load tested pair into builder store and navigate
      const { cpu, mb } = activeTestedBuild;
      const current = getStoredBuild().filter(i => i.category !== 'CPU' && i.category !== 'MOTHERBOARD');
      current.push(
        { category: 'CPU', name: cpu.name, socket: cpu.socket, tdp: cpu.tdp, price: 7690000, specs: `${cpu.socket} • ${cpu.tdp}W TDP` },
        { category: 'MOTHERBOARD', name: mb.name, socket: mb.socket, price: 4490000, specs: `${mb.socket} • ATX • DDR5` }
      );
      setStoredBuild(current);
      navigateTo('/builder');
    } else {
      openSimTestModal();
    }
  });

  scannerHud.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    openSimTestModal();
  });

  // Handle Quick Test Form Submission
  if (simForm) {
    simForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const cpuOpt = simCpuSelect?.selectedOptions[0];
      const mbOpt = simMbSelect?.selectedOptions[0];
      if (!cpuOpt || !mbOpt) return;

      activeTestedBuild = {
        cpu: {
          name: cpuOpt.dataset.name || cpuOpt.text,
          socket: cpuOpt.dataset.socket || 'LGA1700',
          tdp: parseInt(cpuOpt.dataset.tdp || '125', 10)
        },
        mb: {
          name: mbOpt.dataset.name || mbOpt.text,
          socket: mbOpt.dataset.socket || 'LGA1700'
        }
      };

      closeSimTestModal();

      if (window.location.pathname === '/builder') {
        const current = getStoredBuild().filter(i => i.category !== 'CPU' && i.category !== 'MOTHERBOARD');
        current.push(
          { category: 'CPU', name: activeTestedBuild.cpu.name, socket: activeTestedBuild.cpu.socket, tdp: activeTestedBuild.cpu.tdp, price: 7690000, specs: `${activeTestedBuild.cpu.socket} • ${activeTestedBuild.cpu.tdp}W TDP` },
          { category: 'MOTHERBOARD', name: activeTestedBuild.mb.name, socket: activeTestedBuild.mb.socket, price: 4490000, specs: `${activeTestedBuild.mb.socket} • ATX • DDR5` }
        );
        setStoredBuild(current);
        renderBuilder();
        const builderCard = document.getElementById('builder-compat-engine-card');
        if (builderCard) {
          builderCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const fill = document.getElementById('builder-compat-bar-fill');
          if (fill) fill.style.width = '0%';
          const pct = document.getElementById('builder-compat-percent-val');
          if (pct) pct.textContent = '0';
          setTimeout(() => {
            builderCard.dispatchEvent(new MouseEvent('mouseenter'));
          }, 100);
        }
      } else {
        // Scroll to Simulator HUD smoothly if needed
        scannerHud.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Run dynamic scan from current to 100%
        currentPercent = 0;
        startScan(100);
      }
    });
  }
}

/**
 * Presets Grid Wiring ("NẠP BUILDER" buttons)
 */
function initPresets() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.preset-load-btn, [data-preset]');
    if (!btn) return;
    e.preventDefault();
    const presetId = btn.dataset.preset;
    if (presetId) {
      loadPreset(presetId);
      navigateTo('/builder');
    }
  });
}

/**
 * CTA Ending Actions Wiring
 */
function initCtaActions() {
  const initBuilderBtn = document.getElementById('cta-init-builder-btn');
  if (initBuilderBtn) {
    initBuilderBtn.addEventListener('click', (e) => {
      e.preventDefault();
      clearBuild();
      navigateTo('/builder');
    });
  }

  const b2bBtn = document.getElementById('cta-b2b-btn');
  if (b2bBtn) {
    b2bBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.openB2BQuote();
    });
  }

  const b2bQuickTag = document.getElementById('b2b-quick-tag');
  if (b2bQuickTag) {
    b2bQuickTag.addEventListener('click', (e) => {
      e.preventDefault();
      window.openB2BQuote();
    });
  }
}

/**
 * High-Tech Command Search Console & Quick Category Chips Wiring
 */
function initSearchConsole() {
  const searchInput = document.getElementById('tech-search-input');
  const searchBtn = document.getElementById('tech-search-btn');

  function performSearch() {
    if (!searchInput) return;
    const query = searchInput.value.trim();
    if (query) {
      navigateTo(`/hardware?search=${encodeURIComponent(query)}`);
    } else {
      navigateTo('/hardware');
    }
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', performSearch);
  }

  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        performSearch();
      }
    });
  }

  // Quick Chips Delegation
  document.addEventListener('click', (e) => {
    const chip = e.target.closest('.tech-chip[data-category]');
    if (!chip) return;
    e.preventDefault();
    const category = chip.dataset.category;
    if (category) {
      navigateTo(`/hardware?category=${encodeURIComponent(category)}`);
    }
  });
}

/**
 * Scroll Pop-out Reveal Engine
 */
function initScrollReveal() {
  const revealElements = document.querySelectorAll('.reveal-hero, .reveal-tier2, .reveal-tier3, .reveal-tier4, .reveal-on-scroll');
  if (!revealElements.length) return;

  if (!('IntersectionObserver' in window)) {
    revealElements.forEach(el => el.classList.add('is-revealed'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
      } else {
        entry.target.classList.remove('is-revealed');
      }
    });
  }, {
    rootMargin: '0px 0px -40px 0px',
    threshold: 0.1
  });

  revealElements.forEach(el => observer.observe(el));
}

function bootstrap() {
  // 1. Initialize Theme (Day / Night CSS Variables & Sun/Moon Icons)
  initTheme();

  // 2. Initialize Modals (Auth, B2B, Assembly, Simulator Test)
  initModals();

  // 3. Initialize Interactive Components
  initDashboard();
  initAdmin();

  // 4. Initialize Unified Router
  initRouter();

  // 5. Initialize Auth State & Run Initial Route Check
  initAuth();
  syncAuthState();
  checkRoute();

  // 6. Initialize High-Tech Interactive Features (Scanner & Search)
  initCompatibilityScanner();
  initSearchConsole();
  initPresets();
  initCtaActions();

  // 7. Initialize Scroll Pop-out Reveal Engine
  initScrollReveal();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
