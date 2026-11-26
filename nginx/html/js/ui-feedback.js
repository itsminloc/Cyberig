/**
 * CyberRig Studio UI Feedback & Auth Gate Helper
 * Provides non-blocking Floating Pill Toast, Login-Required Prompt Modal,
 * and Instant Zero-Wait Session Logout.
 */
import { authModal, setAuthMode, inputEmail } from './components/modals.js';

let toastTimer = null;
let pendingPostLoginRedirect = null;
let authReqInitialized = false;

export function showStorefrontToast(text, options = {}) {
  const toast = document.getElementById('storefrontToast');
  const txtEl = document.getElementById('storefrontToastText');
  const btnEl = document.getElementById('storefrontToastBtn');
  const dotEl = document.getElementById('storefrontToastDot');
  if (!toast || !txtEl || !btnEl) return;

  txtEl.textContent = text;
  btnEl.textContent = options.actionLabel || 'Đóng';

  if (dotEl) {
    const color = options.tone === 'warn' ? '#f59e0b' : options.tone === 'error' ? '#ef4444' : 'var(--accent-primary)';
    dotEl.style.background = color;
    dotEl.style.boxShadow = `0 0 8px ${color}`;
  }

  btnEl.onclick = () => {
    toast.classList.remove('is-visible');
    if (typeof options.onAction === 'function') options.onAction();
  };

  toast.classList.add('is-visible');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('is-visible');
  }, options.durationMs || 3800);
}

function ensureAuthRequiredListeners() {
  if (authReqInitialized) return;
  authReqInitialized = true;

  const modal = document.getElementById('auth-required-modal');
  const closeBtn = document.getElementById('auth-req-close-btn');
  const cancelBtn = document.getElementById('auth-req-cancel-btn');
  const loginBtn = document.getElementById('auth-req-login-btn');
  const registerBtn = document.getElementById('auth-req-register-btn');

  const closePrompt = () => modal?.classList.remove('is-active');

  closeBtn?.addEventListener('click', closePrompt);
  cancelBtn?.addEventListener('click', closePrompt);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closePrompt();
  });

  loginBtn?.addEventListener('click', () => {
    closePrompt();
    setAuthMode('login');
    authModal?.classList.add('is-active');
    setTimeout(() => {
      inputEmail?.removeAttribute('readonly');
      inputEmail?.focus();
    }, 40);
  });

  registerBtn?.addEventListener('click', () => {
    closePrompt();
    setAuthMode('register');
    authModal?.classList.add('is-active');
    setTimeout(() => {
      document.getElementById('input-fullname')?.focus();
    }, 40);
  });
}

export function requireLoginModal({ reason, redirectUrl } = {}) {
  ensureAuthRequiredListeners();
  pendingPostLoginRedirect = redirectUrl || null;

  const modal = document.getElementById('auth-required-modal');
  const msgEl = document.getElementById('auth-req-message');
  if (msgEl) {
    msgEl.textContent =
      reason ||
      'Bạn cần đăng nhập tài khoản thành viên CyberRig để tiếp tục thực hiện chức năng này và lưu quyền lợi bảo hành điện tử.';
  }
  if (modal) {
    modal.classList.add('is-active');
  } else {
    setAuthMode('login');
    authModal?.classList.add('is-active');
  }
}

export function consumePostLoginRedirect() {
  const next = pendingPostLoginRedirect;
  pendingPostLoginRedirect = null;
  return next;
}

export function instantLogout({ token, finalizeState }) {
  if (token) {
    fetch('/api/auth/logout', {
      method: 'POST',
      keepalive: true,
      credentials: 'same-origin',
      headers: { Authorization: 'Bearer ' + token },
    }).catch(() => {});
  }
  finalizeState?.();
  showStorefrontToast('✓ Đã đăng xuất tài khoản', { durationMs: 2600 });
}
