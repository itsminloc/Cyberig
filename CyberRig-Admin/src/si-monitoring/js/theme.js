/**
 * Day / Night Theme Engine (GSAP & Osmo 60 FPS CSS-driven)
 * Enhanced with High-Tech Sun & Moon Vector Icons
 */
import { THEME_STORAGE_KEY } from './config.js';

const themeToggleBtn = document.getElementById('theme-toggle-btn');

// Sun Icon SVG (Used in Day Mode or to toggle to Day)
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

// Moon Icon SVG (Used in Night Mode)
const MOON_ICON = `
<svg class="theme-icon-svg" viewBox="0 0 24 24" aria-hidden="true">
  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
  <path d="M19 3v4"></path>
  <path d="M21 5h-4"></path>
</svg>
`;

export function applyTheme(theme) {
  // Suppress transitions across document during theme toggle, exempting hero backdrops for smooth crossfade
  const style = document.createElement('style');
  style.appendChild(document.createTextNode('*:not([class*="hero-atmosphere-backdrop"]), *:not([class*="hero-atmosphere-backdrop"])::before, *:not([class*="hero-atmosphere-backdrop"])::after { transition: none !important; }'));
  document.head.appendChild(style);

  if (theme === 'day') {
    document.body.classList.add('theme-day');
    if (themeToggleBtn) {
      themeToggleBtn.innerHTML = SUN_ICON;
      themeToggleBtn.setAttribute('title', 'Chuyển sang giao diện Tối (Night Mode)');
      themeToggleBtn.setAttribute('aria-label', 'Chuyển sang giao diện Tối');
    }
  } else {
    document.body.classList.remove('theme-day');
    if (themeToggleBtn) {
      themeToggleBtn.innerHTML = MOON_ICON;
      themeToggleBtn.setAttribute('title', 'Chuyển sang giao diện Sáng (Day Mode)');
      themeToggleBtn.setAttribute('aria-label', 'Chuyển sang giao diện Sáng');
    }
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (e) {}

  // Force reflow so new styles commit synchronously without transition smearing
  void document.body.offsetHeight;

  // Restore smooth transitions on the next animation frame
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      style.remove();
    });
  });
}

export function initTheme() {
  let saved = 'night';
  try {
    saved = localStorage.getItem(THEME_STORAGE_KEY) || 'night';
  } catch (e) {}
  applyTheme(saved);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const isDay = document.body.classList.contains('theme-day');
      applyTheme(isDay ? 'night' : 'day');
    });
  }
}
