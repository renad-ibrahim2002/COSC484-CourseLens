export class ApiError extends Error {
  constructor(status, message, data = {}) {
    super(message);
    this.status = status;
    this.details = data.details || [];
    this.code = data.code;
    this.data = data;
  }
  /** Field errors keyed by path, for forms. */
  fieldErrors() {
    return Object.fromEntries(this.details.filter((d) => d.path).map((d) => [d.path, d.message]));
  }
}

const BASE = import.meta.env.VITE_API_URL || '';
let refreshing = null;

async function refreshSession() {
  refreshing ??= fetch(`${BASE}/api/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then((r) => r.ok)
    .finally(() => {
      setTimeout(() => (refreshing = null), 0);
    });
  return refreshing;
}

function toQuery(params) {
  if (!params) return '';
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) continue;
    q.set(k, Array.isArray(v) ? v.join(',') : String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

export async function api(path, { method = 'GET', body, params, retry = true, signal } = {}) {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const res = await fetch(`${BASE}/api${path}${toQuery(params)}`, {
    method,
    credentials: 'include',
    signal,
    headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });
  // Access tokens are short-lived; refresh once and retry.
  if (res.status === 401 && retry && !path.startsWith('/auth/login') && !path.startsWith('/auth/refresh')) {
    if (await refreshSession()) return api(path, { method, body, params, signal, retry: false });
  }
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : await res.text();
  if (!res.ok) throw new ApiError(res.status, (isJson && data.error) || 'Something went wrong. Please try again.', isJson ? data : {});
  return data;
}

export const get = (path, params, opts) => api(path, { params, ...opts });
export const post = (path, body) => api(path, { method: 'POST', body });
export const patch = (path, body) => api(path, { method: 'PATCH', body });
export const del = (path, body) => api(path, { method: 'DELETE', body });
