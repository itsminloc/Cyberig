/**
 * Authentication State Engine & Production Customer Session Controller
 * Synchronized with CyberRig Studio Bento & Pill UI + Animated Logout Flow
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
  currentAuthMode,
  setAuthMode
} from './components/modals.js';
import { navigateTo } from './router.js';
import { showStorefrontToast, playLogoutEffect } from './ui-feedback.js';

const userProfileWidget = document.getElementById('user-profile-widget');
const userMenuBtn = document.getElementById('user-menu-btn');
const userDropdown = document.getElementById('user-dropdown');
const headerUserInitial = document.getElementById('header-user-initial');
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
const togglePasswordBtn = document.getElementById('toggle-password-visibility');

function computeInitials(user) {
  const source = (user?.fullName || user?.email || 'CR').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function syncAuthState() {
  const token = localStorage.getItem(ACCESS_KEY);
  const rawUser = localStorage.getItem(USER_KEY);
  let user = null;
  try {
    if (rawUser) user = JSON.parse(rawUser);
  } catch (_e) {}

  if (token && user) {
    if (authOpenBtn) authOpenBtn.style.display = 'none';
    if (userProfileWidget) userProfileWidget.style.display = 'block';
    if (headerUserInitial) headerUserInitial.textContent = computeInitials(user);
    if (headerUserName) headerUserName.textContent = user.fullName || user.email;
    if (headerUserRole) {
      const roleLabels = { CUSTOMER: 'Thành viên', TECHNICIAN: 'Kỹ thuật', ADMIN: 'Quản trị' };
      headerUserRole.textContent = roleLabels[user.role] || user.role;
      headerUserRole.className = 'role-badge-pill is-' + user.role.toLowerCase();
    }

    if (ddFullName) ddFullName.textContent = user.fullName || user.email;
    if (ddEmail) ddEmail.textContent = user.email;
    if (dashNavLink) dashNavLink.style.display = 'inline-flex';

    const isTechOrAdmin = user.role === 'TECHNICIAN' || user.role === 'ADMIN';
    if (techNavLink) techNavLink.style.display = isTechOrAdmin ? 'inline-flex' : 'none';
    if (ddTechItem) ddTechItem.style.display = isTechOrAdmin ? 'block' : 'none';

    const isAdmin = user.role === 'ADMIN';
    if (adminNavLink) adminNavLink.style.display = isAdmin ? 'inline-flex' : 'none';
    if (ddAdminItem) ddAdminItem.style.display = isAdmin ? 'block' : 'none';
    if (siMonitoringNavLink) siMonitoringNavLink.style.display = isAdmin ? 'inline-flex' : 'none';
    if (ddMonitoringItem) ddMonitoringItem.style.display = isAdmin ? 'block' : 'none';
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

  window.dispatchEvent(new CustomEvent('auth:stateChanged', { detail: { user, token } }));
}

export function initAuth() {
  if (userMenuBtn && userDropdown) {
    userMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('is-open');
    });

    document.addEventListener('click', (e) => {
      if (!userDropdown.contains(e.target)) {
        userDropdown.classList.remove('is-open');
      }
    });
  }

  if (togglePasswordBtn && inputPassword) {
    togglePasswordBtn.addEventListener('click', () => {
      const nextShow = inputPassword.type === 'password';
      inputPassword.type = nextShow ? 'text' : 'password';
      togglePasswordBtn.textContent = nextShow ? 'Ẩn mật khẩu' : 'Hiện mật khẩu';
    });
  }

  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      modalAlert.className = 'alert-banner';

      const email = inputEmail.value.trim();
      const password = inputPassword.value;
      const fullName = inputFullName ? inputFullName.value.trim() : '';
      const phone = inputPhone ? inputPhone.value.trim() : '';

      submitBtn.disabled = true;
      submitBtn.textContent = 'Đang xác thực...';

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

          const displayName = json.data.user.fullName || json.data.user.email;
          modalAlert.className = 'alert-banner is-success';
          modalAlert.textContent = 'Xác thực thành công. Xin chào ' + displayName;

          setTimeout(() => {
            authModal.classList.remove('is-active');
            authForm.reset();
            if (inputPassword) inputPassword.type = 'password';
            if (togglePasswordBtn) togglePasswordBtn.textContent = 'Hiện mật khẩu';
            syncAuthState();

            if (json.data.user.role === 'ADMIN') {
              window.location.href = '/admin-monitoring/';
            } else if (json.data.user.role === 'TECHNICIAN') {
              window.location.hash = '#technician';
              showStorefrontToast(`✓ Chào mừng ${displayName} trở lại Bàn Kỹ Thuật`);
            } else {
              window.location.hash = '#dashboard';
              showStorefrontToast(`✓ Đăng nhập thành công · Xin chào ${displayName}`);
            }
          }, 420);
        } else {
          modalAlert.className = 'alert-banner is-error';
          modalAlert.textContent = json.error?.message || 'Thông tin đăng nhập chưa chính xác.';
        }
      } catch (_err) {
        modalAlert.className = 'alert-banner is-error';
        modalAlert.textContent = 'Không thể kết nối tới máy chủ. Vui lòng thử lại.';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = currentAuthMode === 'login' ? 'Đăng Nhập' : 'Tạo Tài Khoản';
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const token = localStorage.getItem(ACCESS_KEY);
      let userName = '';
      try {
        const raw = localStorage.getItem(USER_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          userName = parsed?.fullName || parsed?.email || '';
        }
      } catch (_err) {}

      if (userDropdown) userDropdown.classList.remove('is-open');

      await playLogoutEffect({
        userName,
        revokeSession: async () => {
          if (!token) return;
          await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { Authorization: 'Bearer ' + token },
          });
        },
        finalizeState: () => {
          localStorage.removeItem(ACCESS_KEY);
          localStorage.removeItem(REFRESH_KEY);
          localStorage.removeItem(USER_KEY);
          const protectedHashes = ['#dashboard', '#admin', '#technician'];
          if (protectedHashes.includes(window.location.hash)) {
            navigateTo('/');
          }
          syncAuthState();
        },
        onReopenLogin: () => {
          setAuthMode('login');
          authModal?.classList.add('is-active');
          setTimeout(() => inputEmail?.focus(), 60);
        },
      });
    });
  }
}
