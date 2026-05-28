/* ============================================================
   PrintFlow 3D — Formatting Utilities
   ============================================================
   Currency: USD ($)   |   Locale: es (Spanish)
   ============================================================ */

/**
 * Format a number as USD currency: $1,234.56
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a date string as DD/MM/YYYY
 * @param {string|Date} dateStr
 * @returns {string}
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '—';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format a date string as DD/MM/YYYY HH:mm
 * @param {string|Date} dateStr
 * @returns {string}
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '—';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Format a date as a relative Spanish string.
 * @param {string|Date} dateStr
 * @returns {string} 'Hoy', 'Ayer', 'Hace 3 días', 'Hace 2 semanas', etc.
 */
export function formatRelativeDate(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '—';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffTime = today.getTime() - target.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 14) return 'Hace 1 semana';
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
  if (diffDays < 60) return 'Hace 1 mes';
  if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} meses`;
  return formatDate(dateStr);
}

/**
 * Convert a month string like '2024-01' to 'Enero 2024'
 * @param {string} monthStr - Format: 'YYYY-MM'
 * @returns {string}
 */
export function getMonthName(monthStr) {
  if (!monthStr) return '—';

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  const parts = monthStr.split('-');
  if (parts.length < 2) return monthStr;

  const year = parts[0];
  const monthIndex = parseInt(parts[1], 10) - 1;

  if (monthIndex < 0 || monthIndex > 11) return monthStr;

  return `${months[monthIndex]} ${year}`;
}
