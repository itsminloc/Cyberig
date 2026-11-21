/**
 * CyberRig Configuration & Utility Formatters
 */

export const ACCESS_KEY = 'cyberrig_access_token';
export const REFRESH_KEY = 'cyberrig_refresh_token';
export const USER_KEY = 'cyberrig_user';
export const THEME_STORAGE_KEY = 'cyberrig_theme';

export function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount || 0);
}

export function formatDate(dateString) {
  if (!dateString) return 'Vừa xong';
  const d = new Date(dateString);
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
