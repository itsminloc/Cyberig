/**
 * CyberRig Studio Dual-Theme Engine (Performance Night / Showroom Day)
 * Synchronized Circular View Transition Reveal & Toast with SI Monitor.
 */
import { THEME_STORAGE_KEY } from './config.js';
import { showStorefrontToast } from './ui-feedback.js';

const themeToggleBtn = document.getElementById('theme-toggle-btn');

const SUN_ICON = `
<svg class="theme-icon-svg" viewBox="0 0 24 24" aria-hidden="true">
  <circle cx="12" cy="12" r="4"></circle>
  <path d="M12 2v2"></path>
  <path d="M12 20v2"></path>
  <path d="M4.93 4.93l1.41 1.41"></path>
  <path d="M17.66 17.66l1.41 1.41"></path>
  <path d="M2 12h2"></path>
  <path d="M20 12h2"></path>
  <path d="M6.34 17.66l-1.41 1.41"></path>
  <path d="M19.07 4.93l-1.41 1.41"></path>
</svg>
`;

const MOON_ICON = `
<svg class="theme-icon-svg" viewBox="0 0 24 24" aria-hidden="true">
  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
  <path d="M19 3v4"></path>
  <path d="M21 5h-4"></path>
</svg>
`;

export function applyTheme(theme) {
  const isDay = theme === 'day';
  document.documentElement.setAttribute('data-theme', isDay ? 'light' : 'dark');
  document.body.classList.toggle('theme-day', isDay);

  if (themeToggleBtn) {
    themeToggleBtn.innerHTML = isDay ? SUN_ICON : MOON_ICON;
    themeToggleBtn.setAttribute(
      'title',
      isDay ? 'Chuyển sang giao diện Tối (Performance Night)' : 'Chuyển sang giao diện Sáng (Showroom Day)'
    );
    themeToggleBtn.setAttribute(
      'aria-label',
      isDay ? 'Chuyển sang giao diện Tối' : 'Chuyển sang giao diện Sáng'
    );
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, isDay ? 'day' : 'night');
  } catch (_e) {}
}

function toggleThemeWithReveal(event) {
  const isDay = document.body.classList.contains('theme-day');
  const nextMode = isDay ? 'night' : 'day';
  const rect = themeToggleBtn?.getBoundingClientRect();
  const x = event?.clientX || (rect ? rect.left + rect.width / 2 : window.innerWidth - 90);
  const y = event?.clientY || (rect ? rect.top + rect.height / 2 : 34);
  const maxRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  if (!document.startViewTransition || reducedMotion) {
    applyTheme(nextMode);
    showStorefrontToast(nextMode === 'day' ? '☀ Giao diện Sáng · Showroom Day' : '☾ Giao diện Tối · Performance Night');
    return;
  }

  const transition = document.startViewTransition(() => applyTheme(nextMode));
  transition.ready
    .then(() => {
      document.documentElement.animate(
        {
          clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${maxRadius}px at ${x}px ${y}px)`],
        },
        { duration: 480, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    })
    .catch(() => {});

  showStorefrontToast(nextMode === 'day' ? '☀ Giao diện Sáng · Showroom Day' : '☾ Giao diện Tối · Performance Night');
}

export function initTheme() {
  let saved = 'night';
  try {
    saved = localStorage.getItem(THEME_STORAGE_KEY) || 'night';
  } catch (_e) {}
  applyTheme(saved === 'day' ? 'day' : 'night');

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleThemeWithReveal);
  }
}
