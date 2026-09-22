export const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : '—';

export const formatLongDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : '—';

/// For <input type="date">, which needs YYYY-MM-DD.
export const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

export const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
