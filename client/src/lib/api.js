// Base URL is empty in development: Vite proxies /api to the backend.
// In production set VITE_API_URL only if the API lives on another domain.
const BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

const TOKEN_KEY = 'abbas_admin_token';

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private browsing: the session simply won't persist */
  }
};

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/// Every call funnels through here so error handling is uniform: a failed
/// request always throws an ApiError carrying a message safe to show the admin.
async function request(path, { method = 'GET', body, signal, raw = false } = {}) {
  const token = getToken();

  let response;
  try {
    response = await fetch(`${BASE_URL}/api${path}`, {
      method,
      signal,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('Cannot reach the server. Check your connection.', 0);
  }

  // A 401 from the login endpoint means the credentials were wrong, not that a
  // session lapsed. Treating them alike hid the real reason behind a misleading
  // "session expired", on a screen where nobody was signed in to begin with.
  if (response.status === 401 && path !== '/auth/login') {
    setToken(null);
    // Let the auth layer react rather than hard-reloading mid-edit.
    window.dispatchEvent(new CustomEvent('auth:expired'));
    throw new ApiError('Your session expired. Please sign in again.', 401);
  }

  if (raw) {
    if (!response.ok) throw new ApiError('Export failed.', response.status);
    return response.blob();
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(data.error ?? 'Something went wrong.', response.status, data.details);
  }
  return data;
}

export const api = {
  // auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: credentials }),
  me: () => request('/auth/me'),
  changePassword: (body) => request('/auth/change-password', { method: 'POST', body }),

  // dashboard
  stats: (signal) => request('/stats', { signal }),
  health: () => request('/health'),

  // guests
  listGuests: (params, signal) =>
    request(`/guests?${new URLSearchParams(params)}`, { signal }),
  getGuest: (id) => request(`/guests/${id}`),
  createGuest: (body) => request('/guests', { method: 'POST', body }),
  updateGuest: (id, body) => request(`/guests/${id}`, { method: 'PUT', body }),
  deleteGuest: (id) => request(`/guests/${id}`, { method: 'DELETE' }),
  setRsvp: (id, body) => request(`/guests/${id}/rsvp`, { method: 'POST', body }),
  getMessage: (id, template) => request(`/guests/${id}/message?template=${template}`),
  logInvitation: (id, body) => request(`/guests/${id}/invitation-log`, { method: 'POST', body }),

  // bulk
  bulkMarkInvited: (guestIds) =>
    request('/guests/bulk/mark-invited', { method: 'POST', body: { guestIds } }),
  bulkDelete: (guestIds) =>
    request('/guests/bulk/delete', { method: 'POST', body: { guestIds } }),
  exportCsv: ({ ids, functionKey } = {}) => {
    const params = new URLSearchParams();
    if (ids?.length) params.set('ids', ids.join(','));
    if (functionKey && functionKey !== 'ALL') params.set('function', functionKey);
    const query = params.toString();
    return request(`/guests/export/csv${query ? `?${query}` : ''}`, { raw: true });
  },

  // event + templates
  getEvent: () => request('/event'),
  updateEvent: (body) => request('/event', { method: 'PUT', body }),
  updateFunction: (key, body) => request(`/event/functions/${key}`, { method: 'PUT', body }),
  listTemplates: () => request('/event/templates'),
  updateTemplate: (key, body) => request(`/event/templates/${key}`, { method: 'PUT', body }),
};
