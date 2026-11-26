/**
 * Unified SPA Router
 * Handles routing between Landing Page (/), PC Builder (/builder),
 * Hardware Catalog (/hardware), Customer Dashboard (#dashboard), and Admin Center (#admin).
 */
import { ACCESS_KEY, USER_KEY } from './config.js';
import { requireLoginModal } from './ui-feedback.js';
import { loadCustomerDashboard } from './components/dashboard.js';
import { loadAdminDashboard } from './components/admin.js';
import { renderBuilder, loadPreset } from './components/builder.js';
import { renderHardware } from './components/hardware.js';
import { renderEquipments } from './components/equipments.js';
import { renderCheckout } from './components/checkout.js';
import { renderTracking } from './components/tracking.js';
import { loadTechnicianWorkbench } from './components/technician.js';

function getElements() {
  return {
    heroView: document.getElementById('hero-view'),
    builderView: document.getElementById('builder-view'),
    hardwareView: document.getElementById('hardware-view'),
    equipmentsView: document.getElementById('equipments-view'),
    checkoutView: document.getElementById('checkout-view'),
    trackingView: document.getElementById('tracking-view'),
    technicianView: document.getElementById('technician-view'),
    customerDashboardView: document.getElementById('customer-dashboard-view'),
    adminControlCenterView: document.getElementById('admin-control-center-view'),
    adminDeniedBox: document.getElementById('admin-denied-box'),
    adminContentRoot: document.getElementById('admin-content-root'),
  };
}

export function navigateTo(url, replace = false) {
  if (replace) {
    window.history.replaceState(null, '', url);
  } else {
    window.history.pushState(null, '', url);
  }
  checkRoute();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function checkRoute() {
  const {
    heroView,
    builderView,
    hardwareView,
    equipmentsView,
    checkoutView,
    trackingView,
    technicianView,
    customerDashboardView,
    adminControlCenterView,
    adminDeniedBox,
    adminContentRoot
  } = getElements();

  const pathname = window.location.pathname;
  const hash = window.location.hash;
  const search = window.location.search;

  function hideAllViews() {
    if (heroView) heroView.style.display = 'none';
    if (builderView) builderView.style.display = 'none';
    if (hardwareView) hardwareView.style.display = 'none';
    if (equipmentsView) equipmentsView.style.display = 'none';
    if (checkoutView) checkoutView.style.display = 'none';
    if (trackingView) trackingView.style.display = 'none';
    if (technicianView) technicianView.style.display = 'none';
    if (customerDashboardView) customerDashboardView.style.display = 'none';
    if (adminControlCenterView) adminControlCenterView.style.display = 'none';
  }

  // 1. Technician Diagnostic Workbench (#technician)
  if (hash === '#technician') {
    hideAllViews();
    if (technicianView) {
      technicianView.style.display = 'block';
      loadTechnicianWorkbench();
    }
    return;
  }

  // 2. Admin Control Center (#admin)
  if (hash === '#admin') {
    hideAllViews();
    if (adminControlCenterView) adminControlCenterView.style.display = 'block';

    const token = localStorage.getItem(ACCESS_KEY);
    const rawUser = localStorage.getItem(USER_KEY);
    let user = null;
    try { if (rawUser) user = JSON.parse(rawUser); } catch (e) {}

    if (!token || !user) {
      if (adminDeniedBox) adminDeniedBox.style.display = 'none';
      if (adminContentRoot) adminContentRoot.style.display = 'none';
      requireLoginModal({
        reason: 'Vui lòng đăng nhập tài khoản Quản trị viên (ADMIN) để truy cập trung tâm Quản trị kho.',
        redirectUrl: '#admin',
      });
      return;
    }

    if (user.role !== 'ADMIN') {
      if (adminDeniedBox) adminDeniedBox.style.display = 'block';
      if (adminContentRoot) adminContentRoot.style.display = 'none';
      return;
    }

    if (adminDeniedBox) adminDeniedBox.style.display = 'none';
    if (adminContentRoot) adminContentRoot.style.display = 'block';
    loadAdminDashboard();
    return;
  }

  // 3. Customer Dashboard (#dashboard)
  if (hash === '#dashboard') {
    hideAllViews();
    if (customerDashboardView) customerDashboardView.style.display = 'block';
    loadCustomerDashboard();
    return;
  }

  // 4. PC Builder View (/builder)
  if (pathname === '/builder') {
    hideAllViews();
    if (builderView) {
      builderView.style.display = 'block';
      // If a preset query exists, load it into store
      const params = new URLSearchParams(search);
      const presetId = params.get('preset');
      if (presetId) {
        loadPreset(presetId);
      }
      renderBuilder();
    }
    return;
  }

  // 5. Hardware Catalog View (/hardware)
  if (pathname === '/hardware') {
    hideAllViews();
    if (hardwareView) {
      hardwareView.style.display = 'block';
      renderHardware();
    }
    return;
  }

  // 5.5. PC Setup & Equipments View (/equipments)
  if (pathname === '/equipments') {
    hideAllViews();
    if (equipmentsView) {
      equipmentsView.style.display = 'block';
      renderEquipments();
    }
    return;
  }

  // 6. Checkout & VietQR Payment View (/checkout)
  if (pathname === '/checkout') {
    hideAllViews();
    if (checkoutView) {
      checkoutView.style.display = 'block';
      renderCheckout();
    }
    return;
  }

  // 7. Warranty & Repair Tracking View (/repair-tracking)
  if (pathname === '/repair-tracking') {
    hideAllViews();
    if (trackingView) {
      trackingView.style.display = 'block';
      renderTracking();
    }
    return;
  }

  // 8. Default: Landing Page (/)
  hideAllViews();
  if (heroView) {
    heroView.style.display = 'block';
    // Guarantee URL is strictly '/' when on landing page (Task requirement 1)
    if ((pathname !== '/' && !hash) || (pathname === '/' && search)) {
      window.history.replaceState(null, '', '/');
    }
  }
}

export function initRouter() {
  window.addEventListener('popstate', checkRoute);
  window.addEventListener('hashchange', checkRoute);
  window.addEventListener('auth:stateChanged', checkRoute);

  // Global link interception for SPA navigation
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href) return;

    // Handle internal app paths
    if (href.startsWith('/builder') || href.startsWith('/hardware') || href.startsWith('/equipments') || href.startsWith('/checkout') || href.startsWith('/repair-tracking') || href === '/') {
      e.preventDefault();
      navigateTo(href);
    } else if (href === '#dashboard' || href === '#technician' || href === '#admin') {
      e.preventDefault();
      window.history.pushState(null, '', '/' + href);
      checkRoute();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (href === '#b2b-quote') {
      e.preventDefault();
      const b2bModal = document.getElementById('b2b-modal');
      if (b2bModal) b2bModal.classList.add('is-active');
    } else if (href === '#assembly-service') {
      e.preventDefault();
      const assemblyModal = document.getElementById('assembly-modal');
      if (assemblyModal) assemblyModal.classList.add('is-active');
    }
  });
}
