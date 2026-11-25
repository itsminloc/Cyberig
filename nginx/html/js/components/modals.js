/**
 * Modals Controller (Auth, B2B Quote, Assembly Service)
 */

export const authModal = document.getElementById('auth-modal');
export const authOpenBtn = document.getElementById('auth-open-btn');
export const authCloseBtn = document.getElementById('auth-close-btn');
export const tabLogin = document.getElementById('tab-login');
export const tabRegister = document.getElementById('tab-register');
export const modalAlert = document.getElementById('modal-alert');
export const authForm = document.getElementById('auth-form');

export const inputFullName = document.getElementById('input-fullname');
export const inputEmail = document.getElementById('input-email');
export const inputPhone = document.getElementById('input-phone');
export const inputPassword = document.getElementById('input-password');
export const submitBtn = document.getElementById('modal-submit-btn');

export const groupFullName = document.getElementById('group-fullname');
export const groupPhone = document.getElementById('group-phone');

export let currentAuthMode = 'login';

export function setAuthMode(mode) {
  currentAuthMode = mode;
  modalAlert.className = 'alert-banner';
  modalAlert.textContent = '';

  const titleEl = document.getElementById('auth-modal-title');
  const subEl = document.getElementById('auth-modal-subtitle');

  if (mode === 'login') {
    tabLogin.className = 'pill-btn pill-btn-accent';
    tabRegister.className = 'pill-btn pill-btn-ghost';
    if (groupFullName) groupFullName.style.display = 'none';
    if (groupPhone) groupPhone.style.display = 'none';
    if (inputFullName) inputFullName.required = false;
    if (inputPassword) inputPassword.setAttribute('autocomplete', 'current-password');
    if (titleEl) titleEl.textContent = 'Đăng Nhập Tài Khoản';
    if (subEl) subEl.textContent = 'Quản lý cấu hình PC, theo dõi đơn hàng và bảo hành điện tử chính hãng';
    if (submitBtn) submitBtn.textContent = 'Đăng Nhập';
  } else {
    tabLogin.className = 'pill-btn pill-btn-ghost';
    tabRegister.className = 'pill-btn pill-btn-accent';
    if (groupFullName) groupFullName.style.display = 'block';
    if (groupPhone) groupPhone.style.display = 'block';
    if (inputFullName) inputFullName.required = true;
    if (inputPassword) inputPassword.setAttribute('autocomplete', 'new-password');
    if (titleEl) titleEl.textContent = 'Tạo Tài Khoản CyberRig';
    if (subEl) subEl.textContent = 'Đăng ký thành viên để lưu cấu hình PC và hưởng đặc quyền bảo hành điện tử';
    if (submitBtn) submitBtn.textContent = 'Tạo Tài Khoản';
  }
}

import { USER_KEY } from '../config.js';

// Attach Modal Event Listeners
export function initModals() {
  if (authOpenBtn) {
    authOpenBtn.addEventListener('click', () => {
      authModal.classList.add('is-active');
      modalAlert.className = 'alert-banner';
      modalAlert.textContent = '';
      setTimeout(() => inputEmail?.focus(), 50);
    });
  }

  if (authCloseBtn) {
    authCloseBtn.addEventListener('click', () => {
      authModal.classList.remove('is-active');
      authOpenBtn?.focus();
    });
  }

  if (authModal) {
    authModal.addEventListener('click', (e) => {
      if (e.target === authModal) {
        authModal.classList.remove('is-active');
        authOpenBtn?.focus();
      }
    });
  }

  // Keyboard Escape Support across all overlays (better-accessibility)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (authModal?.classList.contains('is-active')) {
        authModal.classList.remove('is-active');
        authOpenBtn?.focus();
      }
      const b2bModal = document.getElementById('b2b-modal');
      if (b2bModal?.classList.contains('is-active')) {
        b2bModal.classList.remove('is-active');
      }
      const assemblyModal = document.getElementById('assembly-modal');
      if (assemblyModal?.classList.contains('is-active')) {
        assemblyModal.classList.remove('is-active');
      }
      const simModal = document.getElementById('simulator-test-modal');
      if (simModal?.classList.contains('is-active')) {
        simModal.classList.remove('is-active');
      }
    }
  });

  const b2bModal = document.getElementById('b2b-modal');
  if (b2bModal) {
    b2bModal.addEventListener('click', (e) => {
      if (e.target === b2bModal) b2bModal.classList.remove('is-active');
    });
  }

  const assemblyModal = document.getElementById('assembly-modal');
  if (assemblyModal) {
    assemblyModal.addEventListener('click', (e) => {
      if (e.target === assemblyModal) assemblyModal.classList.remove('is-active');
    });
  }

  const simModal = document.getElementById('simulator-test-modal');
  if (simModal) {
    simModal.addEventListener('click', (e) => {
      if (e.target === simModal) simModal.classList.remove('is-active');
    });
  }

  const simCloseBtn = document.getElementById('sim-test-close-btn');
  if (simCloseBtn && simModal) {
    simCloseBtn.addEventListener('click', () => {
      simModal.classList.remove('is-active');
    });
  }

  if (tabLogin) tabLogin.addEventListener('click', () => setAuthMode('login'));
  if (tabRegister) tabRegister.addEventListener('click', () => setAuthMode('register'));

  // B2B Quote Form Submission
  const b2bForm = document.getElementById('b2b-quote-form');
  if (b2bForm) {
    b2bForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const alertBox = document.getElementById('b2b-alert');
      const submitBtn = b2bForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      if (alertBox) {
        alertBox.style.display = 'block';
        alertBox.className = 'alert-banner is-success';
        alertBox.innerHTML = '<strong>[ TIẾP NHẬN THÀNH CÔNG ]</strong> Yêu cầu báo giá B2B &amp; Dự án đã được ghi nhận. Chuyên viên giải pháp CyberRig sẽ liên hệ tư vấn trong 30 phút.';
      }
      setTimeout(() => {
        b2bForm.reset();
        if (alertBox) alertBox.style.display = 'none';
        if (submitBtn) submitBtn.disabled = false;
        window.closeB2BQuote();
      }, 2200);
    });
  }

  // Assembly Service Form Submission
  const assemblyForm = document.getElementById('assembly-form');
  if (assemblyForm) {
    assemblyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const alertBox = document.getElementById('assembly-alert');
      const submitBtn = assemblyForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;
      if (alertBox) {
        alertBox.style.display = 'block';
        alertBox.className = 'alert-banner is-success';
        alertBox.innerHTML = '<strong>[ ĐÃ GHI NHẬN LỊCH HẸN ]</strong> Yêu cầu lắp ráp tận nơi đã được tiếp nhận. Kỹ thuật viên CyberRig Lab sẽ gọi điện xác nhận khung giờ hẹn với bạn trong 15 phút.';
      }
      setTimeout(() => {
        assemblyForm.reset();
        if (alertBox) alertBox.style.display = 'none';
        if (submitBtn) submitBtn.disabled = false;
        window.closeAssemblyService();
      }, 2200);
    });
  }
}

// B2B Quote Handlers
window.openB2BQuote = function() {
  const modal = document.getElementById('b2b-modal');
  if (!modal) return;
  const alertBox = document.getElementById('b2b-alert');
  if (alertBox) alertBox.style.display = 'none';

  // Auto-prefill if logged in
  const rawUser = localStorage.getItem(USER_KEY);
  if (rawUser) {
    try {
      const user = JSON.parse(rawUser);
      const nameInput = document.getElementById('b2b-name');
      const emailInput = document.getElementById('b2b-email');
      const phoneInput = document.getElementById('b2b-phone');
      if (nameInput && !nameInput.value) nameInput.value = user.fullName || '';
      if (emailInput && !emailInput.value) emailInput.value = user.email || '';
      if (phoneInput && !phoneInput.value && user.phone) phoneInput.value = user.phone;
    } catch (e) {}
  }
  modal.classList.add('is-active');
};

window.closeB2BQuote = function() {
  const modal = document.getElementById('b2b-modal');
  if (modal) modal.classList.remove('is-active');
};

// Simulator Test Modal Handlers
export function openSimTestModal() {
  const modal = document.getElementById('simulator-test-modal');
  if (modal) modal.classList.add('is-active');
}
window.openSimTestModal = openSimTestModal;

export function closeSimTestModal() {
  const modal = document.getElementById('simulator-test-modal');
  if (modal) modal.classList.remove('is-active');
}
window.closeSimTestModal = closeSimTestModal;

// Assembly Service Modal Handlers
window.openAssemblyService = function() {
  const modal = document.getElementById('assembly-modal');
  if (!modal) return;
  const alertBox = document.getElementById('assembly-alert');
  if (alertBox) alertBox.style.display = 'none';

  // Auto-prefill if logged in
  const rawUser = localStorage.getItem(USER_KEY);
  if (rawUser) {
    try {
      const user = JSON.parse(rawUser);
      const nameInput = document.getElementById('assembly-name');
      const phoneInput = document.getElementById('assembly-phone');
      if (nameInput && !nameInput.value) nameInput.value = user.fullName || '';
      if (phoneInput && !phoneInput.value && user.phone) phoneInput.value = user.phone;
    } catch (e) {}
  }
  modal.classList.add('is-active');
};

window.closeAssemblyService = function() {
  const modal = document.getElementById('assembly-modal');
  if (modal) modal.classList.remove('is-active');
};
