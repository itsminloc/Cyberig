/**
 * CyberRig Studio UI Feedback Engine
 * Provides synchronized Floating Pill Toast & Animated Session Logout Transition
 * matching the CyberRig Studio SI Monitor experience.
 */

let toastTimer = null;
let isSigningOut = false;

export function showStorefrontToast(text, options = {}) {
  const toast = document.getElementById('storefrontToast');
  const txtEl = document.getElementById('storefrontToastText');
  const btnEl = document.getElementById('storefrontToastBtn');
  const dotEl = document.getElementById('storefrontToastDot');
  if (!toast || !txtEl || !btnEl) return;

  txtEl.textContent = text;
  btnEl.textContent = options.actionLabel || 'Đóng';

  if (dotEl) {
    dotEl.style.background = options.tone === 'warn' ? '#f59e0b' : 'var(--accent-primary)';
    dotEl.style.boxShadow = options.tone === 'warn' ? '0 0 8px #f59e0b' : '0 0 8px var(--accent-primary)';
  }

  btnEl.onclick = () => {
    toast.classList.remove('is-visible');
    if (typeof options.onAction === 'function') options.onAction();
  };

  toast.classList.add('is-visible');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('is-visible');
  }, options.durationMs || 4200);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function playLogoutEffect({ userName, revokeSession, finalizeState, onReopenLogin }) {
  if (isSigningOut) return;
  isSigningOut = true;

  const veil = document.getElementById('logoutTransitionVeil');
  const bar = document.getElementById('logoutProgressBar');
  const titleEl = document.getElementById('logoutTransitionTitle');
  const subEl = document.getElementById('logoutTransitionSub');
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  if (titleEl) titleEl.textContent = 'Đang kết thúc phiên làm việc...';
  if (subEl) subEl.textContent = 'Thu hồi khóa xác thực và bảo vệ dữ liệu tài khoản của bạn';
  if (bar) bar.style.width = '0%';

  document.body.classList.add('is-signing-out');
  if (veil) {
    veil.classList.add('is-active');
    veil.setAttribute('aria-hidden', 'false');
  }

  requestAnimationFrame(() => {
    if (bar) bar.style.width = '78%';
  });

  const minAnimPromise = wait(reducedMotion ? 80 : 380);
  try {
    await Promise.all([
      Promise.resolve(revokeSession?.()).catch(() => {}),
      minAnimPromise,
    ]);
  } finally {
    if (bar) bar.style.width = '100%';
    if (titleEl) titleEl.textContent = 'Đã đăng xuất an toàn';

    if (document.startViewTransition && !reducedMotion) {
      try {
        await document.startViewTransition(() => {
          finalizeState?.();
        }).finished;
      } catch (_e) {
        finalizeState?.();
      }
    } else {
      finalizeState?.();
    }

    await wait(reducedMotion ? 40 : 160);
    document.body.classList.remove('is-signing-out');
    if (veil) {
      veil.classList.remove('is-active');
      veil.setAttribute('aria-hidden', 'true');
    }
    if (bar) bar.style.width = '0%';

    const labelName = userName ? ` (${userName})` : '';
    showStorefrontToast(`✓ Đã đăng xuất phiên làm việc an toàn${labelName}`, {
      actionLabel: onReopenLogin ? 'Đăng nhập lại' : 'Đóng',
      onAction: onReopenLogin,
      durationMs: 4600,
    });
    isSigningOut = false;
  }
}
