/**
 * Reusable Date Formatting Utility for GoOnStay Admin
 * Handles:
 * - ISO string dates (e.g. "2026-11-05T07:22:48.000Z")
 * - YYYY-MM-DD strings (e.g. "2026-11-05") without UTC timezone shifts
 * - JavaScript Date objects & numeric timestamps
 * - Null, undefined, empty, or invalid date values without throwing errors
 */

export const formatDisplayDate = (dateVal, fallback = 'N/A') => {
  if (!dateVal && dateVal !== 0) return fallback;
  try {
    if (typeof dateVal === 'string') {
      const trimmed = dateVal.trim();
      if (!trimmed) return fallback;
      // Handle YYYY-MM-DD explicitly to prevent UTC timezone day shift
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const [y, m, d] = trimmed.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        if (isNaN(dt.getTime())) return fallback;
        return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    }
    const dt = new Date(dateVal);
    if (isNaN(dt.getTime())) return fallback;
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return fallback;
  }
};

export const formatDate = formatDisplayDate;

export const formatDateTime = (dateVal, fallback = 'N/A') => {
  if (!dateVal && dateVal !== 0) return fallback;
  try {
    const dt = new Date(dateVal);
    if (isNaN(dt.getTime())) return fallback;
    return dt.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch (e) {
    return fallback;
  }
};

export default formatDisplayDate;

