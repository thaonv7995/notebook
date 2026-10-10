/**
 * Frontend API Client
 * 
 * Handles all HTTP requests to the backend API.
 * Automatically redirects to login when receiving 401.
 */

const API_BASE = '/api';

function parseRetryAfterSeconds(response, data = {}) {
  const bodyValue = Number(data.retryAfterSeconds);
  if (Number.isFinite(bodyValue) && bodyValue > 0) {
    return Math.ceil(bodyValue);
  }

  const retryAfter = response.headers.get('retry-after');
  if (!retryAfter) return null;

  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.ceil(seconds);
  }

  const retryDate = Date.parse(retryAfter);
  if (Number.isFinite(retryDate)) {
    return Math.max(1, Math.ceil((retryDate - Date.now()) / 1000));
  }

  return null;
}

export class ApiError extends Error {
  constructor(message, {
    status = 0,
    code = '',
    retryAfterSeconds = null,
    data = {}
  } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
    this.data = data;
  }
}

async function request(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin'
  };
  if (body !== null) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, opts);
  const contentType = res.headers.get('content-type') || '';
  let data = {};

  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => ({}));
  } else {
    const text = await res.text().catch(() => '');
    if (text) {
      data = { error: text.slice(0, 500) };
    }
  }

  if (res.status === 401) {
    // Trigger login screen
    window.dispatchEvent(new CustomEvent('auth:required'));
    throw new ApiError(data.error || 'Phiên đăng nhập đã hết hạn', {
      status: res.status,
      code: data.code || 'AUTH_REQUIRED',
      data
    });
  }

  if (res.status === 429) {
    const retryAfterSeconds = parseRetryAfterSeconds(res, data);
    const fallbackMessage = retryAfterSeconds
      ? `Bạn đang thao tác quá nhanh. Vui lòng thử lại sau ${retryAfterSeconds} giây.`
      : 'Bạn đang thao tác quá nhanh. Vui lòng thử lại sau.';
    const error = new ApiError(data.error || fallbackMessage, {
      status: res.status,
      code: data.code || 'RATE_LIMITED',
      retryAfterSeconds,
      data
    });

    window.dispatchEvent(new CustomEvent('api:rate-limited', {
      detail: {
        path,
        method,
        retryAfterSeconds,
        message: error.message
      }
    }));
    throw error;
  }

  if (!res.ok) {
    throw new ApiError(
      data.error
      || `Yêu cầu thất bại với mã HTTP ${res.status}`,
      {
        status: res.status,
        code: data.code || '',
        data
      }
    );
  }

  return data;
}

// ─── Auth ───

export async function login(username, password) {
  return request('POST', '/auth/login', { username, password });
}

export async function logout() {
  return request('POST', '/auth/logout');
}

export async function checkSession() {
  try {
    return await request('GET', '/auth/me');
  } catch {
    return null;
  }
}

export async function changePassword(oldPassword, newPassword) {
  return request('POST', '/auth/change-password', { oldPassword, newPassword });
}

// ─── Notebooks ───

export async function fetchNotebooks() {
  return request('GET', '/notebooks');
}

export async function syncNotebooks(notebooks, lastSyncedAt = null, deletedNotebookIds = []) {
  return request('PUT', '/notebooks/sync', { notebooks, lastSyncedAt, deletedNotebookIds });
}

export async function deleteNotebookRemote(notebookId) {
  return request('DELETE', `/notebooks/${notebookId}`);
}
