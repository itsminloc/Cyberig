/**
 * Authentication State Engine & User Session Controller
 */
import { ACCESS_KEY, REFRESH_KEY, USER_KEY } from './config.js';
import {
  authModal,
  authOpenBtn,
  modalAlert,
  authForm,
  inputEmail,
  inputPassword,
  inputFullName,
  inputPhone,
  submitBtn,
  currentAuthMode
} from './components/modals.js';

const userProfileWidget = document.getElementById('user-profile-widget');
const userMenuBtn = document.getElementById('user-menu-btn');
const userDropdown = document.getElementById('user-dropdown');
const headerUserName = document.getElementById('header-user-name');
const headerUserRole = document.getElementById('header-user-role');
const ddFullName = document.getElementById('dd-fullname');
const ddEmail = document.getElementById('dd-email');
const ddAdminItem = document.getElementById('dd-admin-item');
const adminNavLink = document.getElementById('admin-nav-link');
const ddMonitoringItem = document.getElementById('dd-monitoring-item');
const siMonitoringNavLink = document.getElementById('si-monitoring-nav-link');
const ddTechItem = document.getElementById('dd-tech-item');
const techNavLink = document.getElementById('tech-nav-link');
const logoutBtn = document.getElementById('logout-btn');
const dashNavLink = document.getElementById('dash-nav-link');

export function syncAuthState() {
  const token = localStorage.getItem(ACCESS_KEY);
  const rawUser = localStorage.getItem(USER_KEY);
  let user = null;
  try {
    if (rawUser) user = JSON.parse(rawUser);
  } catch (e) {}

  if (token && user) {
    if (authOpenBtn) authOpenBtn.style.display = 'none';
    if (userProfileWidget) userProfileWidget.style.display = 'block';
    if (headerUserName) headerUserName.textContent = user.fullName || user.email;
    if (headerUserRole) {
      headerUserRole.textContent = user.role;
      headerUserRole.className = 'role-badge-pill is-' + user.role.toLowerCase();
    }

    if (ddFullName) ddFullName.textContent = user.fullName;
    if (ddEmail) ddEmail.textContent = user.email;

    if (dashNavLink) dashNavLink.style.display = 'inline-flex';

    // Role-based visibility
    const isTechOrAdmin = user.role === 'TECHNICIAN' || user.role === 'ADMIN';
    if (techNavLink) techNavLink.style.display = isTechOrAdmin ? 'inline-flex' : 'none';
    if (ddTechItem) ddTechItem.style.display = isTechOrAdmin ? 'block' : 'none';

    if (user.role === 'ADMIN') {
      if (adminNavLink) adminNavLink.style.display = 'inline-flex';
      if (ddAdminItem) ddAdminItem.style.display = 'block';
      if (siMonitoringNavLink) siMonitoringNavLink.style.display = 'inline-flex';
      if (ddMonitoringItem) ddMonitoringItem.style.display = 'block';
    } else {
      if (adminNavLink) adminNavLink.style.display = 'none';
      if (ddAdminItem) ddAdminItem.style.display = 'none';
      if (siMonitoringNavLink) siMonitoringNavLink.style.display = 'none';
      if (ddMonitoringItem) ddMonitoringItem.style.display = 'none';
    }
  } else {
    if (authOpenBtn) authOpenBtn.style.display = 'inline-flex';
    if (userProfileWidget) userProfileWidget.style.display = 'none';
    if (dashNavLink) dashNavLink.style.display = 'none';
    if (techNavLink) techNavLink.style.display = 'none';
    if (ddTechItem) ddTechItem.style.display = 'none';
    if (adminNavLink) adminNavLink.style.display = 'none';
    if (ddAdminItem) ddAdminItem.style.display = 'none';
    if (siMonitoringNavLink) siMonitoringNavLink.style.display = 'none';
    if (ddMonitoringItem) ddMonitoringItem.style.display = 'none';
  }

  // Dispatch custom event for routing sync
  window.dispatchEvent(new CustomEvent('auth:stateChanged', { detail: { user, token } }));
}

export function initAuth() {
  // User menu dropdown toggle
  if (userMenuBtn && userDropdown) {
    userMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('is-open');
    });

    document.addEventListener('click', () => {
      userDropdown.classList.remove('is-open');
    });
  }

  // 1-Click Demo Accounts
  document.getElementById('demo-customer')?.addEventListener('click', () => {
    document.getElementById('tab-login')?.click();
    if (inputEmail) inputEmail.value = 'customer@cyberig.vn';
    if (inputPassword) inputPassword.value = 'Customer@Password123';
  });

  document.getElementById('demo-tech')?.addEventListener('click', () => {
    document.getElementById('tab-login')?.click();
    if (inputEmail) inputEmail.value = 'tech@cyberig.vn';
    if (inputPassword) inputPassword.value = 'Tech@Password123';
  });

  document.getElementById('demo-admin')?.addEventListener('click', () => {
    document.getElementById('tab-login')?.click();
    if (inputEmail) inputEmail.value = 'admin@cyberig.vn';
    if (inputPassword) inputPassword.value = 'Admin@Password123';
  });

  // Auth Form Submit (Login / Register)
  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      modalAlert.className = 'alert-banner';

      const email = inputEmail.value.trim();
      const password = inputPassword.value;
      const fullName = inputFullName ? inputFullName.value.trim() : '';
      const phone = inputPhone ? inputPhone.value.trim() : '';

      submitBtn.disabled = true;
      submitBtn.textContent = 'Đang xử lý...';

      try {
        const endpoint = currentAuthMode === 'login' ? '/api/auth/login' : '/api/auth/register';
        const body = currentAuthMode === 'login'
          ? { email, password }
          : { email, password, fullName, phone: phone || undefined };

        const res = await fetch(endpoint, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const json = await res.json();

        if (res.ok && json.success && json.data) {
          localStorage.setItem(ACCESS_KEY, json.data.accessToken);
          localStorage.setItem(REFRESH_KEY, json.data.refreshToken);
          localStorage.setItem(USER_KEY, JSON.stringify(json.data.user));

          modalAlert.className = 'alert-banner is-success';
          modalAlert.textContent = 'Xác thực thành công. Chào mừng ' + (json.data.user.fullName || json.data.user.email);

          setTimeout(() => {
            authModal.classList.remove('is-active');
            syncAuthState();
            if (json.data.user.role === 'ADMIN') {
              window.location.href = '/admin-monitoring/';
            } else if (json.data.user.role === 'TECHNICIAN') {
              window.location.hash = '#technician';
            } else {
              window.location.hash = '#dashboard';
            }
          }, 500);
        } else {
          modalAlert.className = 'alert-banner is-error';
          modalAlert.textContent = json.error?.message || 'Đăng nhập không thành công.';
        }
      } catch (err) {
        modalAlert.className = 'alert-banner is-error';
        modalAlert.textContent = 'Không thể kết nối tới máy chủ.';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = currentAuthMode === 'login' ? 'Xác Nhận Đăng Nhập' : 'Khởi Tạo Tài Khoản';
      }
    });
  }

  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      const token = localStorage.getItem(ACCESS_KEY);
      try {
        if (token) {
          await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Authorization': 'Bearer ' + token },
          });
        }
      } catch (e) {}

      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(USER_KEY);
      if (userDropdown) userDropdown.classList.remove('is-open');
      if (window.location.hash === '#dashboard' || window.location.hash === '#admin' || window.location.hash === '#technician') {
        window.location.hash = '';
      }
      syncAuthState();
    });
  }
}
