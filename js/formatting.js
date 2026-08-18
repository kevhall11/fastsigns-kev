const today = new Date();
today.setHours(0, 0, 0, 0);

export function parseDate(raw) {
  if (!raw) return null;
  if (typeof raw === 'object' && raw.DateText) raw = raw.DateText;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function fmtDate(date) {
  if (!date) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function fmtAmt(amount) {
  if (!amount || amount === 0) return '';
  return '$' + Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtAmtOrDash(amount) {
  return fmtAmt(amount) || '—';
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function initials(name) {
  return (name || '?').split(' ').map(word => word[0] || '').join('').slice(0, 2).toUpperCase();
}

export function daysSince(date) {
  if (!date) return 999;
  return Math.floor((today - date) / 86400000);
}

export function daysUntil(date) {
  if (!date) return null;
  return Math.floor((date - today) / 86400000);
}

export function dueLbl(date, isBuilt) {
  if (!date) return { txt: 'No date', cls: '' };
  const difference = daysUntil(date);
  if (difference < 0 && !isBuilt) return { txt: `${Math.abs(difference)}d overdue`, cls: 'overdue' };
  if (difference === 0) return { txt: 'Due today', cls: 'soon' };
  if (difference <= 3) return { txt: `Due in ${difference}d`, cls: 'soon' };
  return { txt: fmtDate(date), cls: '' };
}

export { today };
