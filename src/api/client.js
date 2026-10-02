/**
 * Frontend API Client
 * 
 * Handles all HTTP requests to the backend API.
 * Automatically redirects to login when receiving 401.
 */

const API_BASE = '/api';

async function request(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin'
  };
  if (body !== null) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, opts);
  const data = await res.json();

  if (res.status === 401) {
    // Trigger login screen
    window.dispatchEvent(new CustomEvent('auth:required'));
    throw new Error(data.error || 'Unauthorized');
  }

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
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

export async function syncNotebooks(notebooks, lastSyncedAt = null) {
  return request('PUT', '/notebooks/sync', { notebooks, lastSyncedAt });
}

export async function deleteNotebookRemote(notebookId) {
  return request('DELETE', `/notebooks/${notebookId}`);
}
