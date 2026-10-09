/**
 * Notebook API Routes
 * 
 * All routes require authentication via requireAuth middleware.
 * 
 * GET  /api/notebooks              — Load full library
 * GET  /api/notebooks/sync-meta    — Get server sync timestamp
 * PUT  /api/notebooks/sync         — Smart merge sync (per-page conflict resolution)
 * POST /api/notebooks/sync-beacon  — Fire-and-forget sync via sendBeacon (tab close)
 * DELETE /api/notebooks/:id        — Delete a notebook
 */

import express from 'express';
import { requireAuth } from './auth.js';
import { loadFullState, saveFullState, deleteNotebookById, mergeAndSaveState, getLastSyncedAt, getDeletedNotebookIds, updateNotebookProgress } from './db.js';

const MAX_NOTEBOOKS_PER_SYNC = 1000;
const MAX_DELETED_IDS_PER_SYNC = 5000;
const MAX_PAGES_PER_NOTEBOOK = 5000;
const MAX_DELETED_PAGE_IDS = 5000;
const MAX_TEXT_FIELD_LENGTH = 500000;
const SYNC_BEACON_BODY_LIMIT = process.env.SYNC_BEACON_BODY_LIMIT || '10mb';

function isValidId(value) {
  return (typeof value === 'string' || typeof value === 'number')
    && String(value).length > 0
    && String(value).length <= 200;
}

function hasOversizedTextFields(value, seen = new WeakSet()) {
  if (typeof value === 'string') {
    return value.length > MAX_TEXT_FIELD_LENGTH;
  }
  if (!value || typeof value !== 'object') {
    return false;
  }
  if (seen.has(value)) {
    return false;
  }

  seen.add(value);
  const nestedValues = Array.isArray(value) ? value : Object.values(value);
  return nestedValues.some(item => hasOversizedTextFields(item, seen));
}

function validateSyncPayload(notebooks, deletedNotebookIds) {
  if (!Array.isArray(notebooks)) {
    return 'notebooks phải là một mảng';
  }
  if (notebooks.length > MAX_NOTEBOOKS_PER_SYNC) {
    return `Một lần đồng bộ không được vượt quá ${MAX_NOTEBOOKS_PER_SYNC} cuốn sổ`;
  }
  if (!Array.isArray(deletedNotebookIds)) {
    return 'deletedNotebookIds phải là một mảng';
  }
  if (deletedNotebookIds.length > MAX_DELETED_IDS_PER_SYNC) {
    return `Danh sách đã xóa không được vượt quá ${MAX_DELETED_IDS_PER_SYNC} phần tử`;
  }
  if (deletedNotebookIds.some(id => !isValidId(id))) {
    return 'deletedNotebookIds chứa ID không hợp lệ';
  }

  const notebookIds = new Set();
  for (const notebook of notebooks) {
    if (!notebook || typeof notebook !== 'object' || Array.isArray(notebook)) {
      return 'Dữ liệu cuốn sổ không hợp lệ';
    }
    if (!isValidId(notebook.id)) {
      return 'Cuốn sổ có ID không hợp lệ';
    }

    const normalizedNotebookId = String(notebook.id);
    if (notebookIds.has(normalizedNotebookId)) {
      return `Danh sách đồng bộ chứa ID cuốn sổ trùng lặp: ${normalizedNotebookId}`;
    }
    notebookIds.add(normalizedNotebookId);

    if (deletedNotebookIds.some(id => String(id) === normalizedNotebookId)) {
      return `Cuốn sổ ${normalizedNotebookId} vừa được cập nhật vừa được đánh dấu xóa`;
    }

    if (notebook.pages !== undefined && !Array.isArray(notebook.pages)) {
      return `Danh sách trang của cuốn sổ ${String(notebook.id)} không hợp lệ`;
    }
    if (
      Array.isArray(notebook.pages)
      && notebook.pages.length > MAX_PAGES_PER_NOTEBOOK
    ) {
      return `Cuốn sổ ${String(notebook.id)} vượt quá ${MAX_PAGES_PER_NOTEBOOK} trang`;
    }
    if (
      notebook.deletedPageIds !== undefined
      && !Array.isArray(notebook.deletedPageIds)
    ) {
      return `Danh sách trang đã xóa của cuốn sổ ${String(notebook.id)} không hợp lệ`;
    }
    if (
      Array.isArray(notebook.deletedPageIds)
      && notebook.deletedPageIds.length > MAX_DELETED_PAGE_IDS
    ) {
      return `Danh sách trang đã xóa của cuốn sổ ${String(notebook.id)} vượt quá giới hạn`;
    }
    if (
      Array.isArray(notebook.deletedPageIds)
      && notebook.deletedPageIds.some(id => !isValidId(id))
    ) {
      return `Danh sách trang đã xóa của cuốn sổ ${String(notebook.id)} chứa ID không hợp lệ`;
    }

    const pageIds = new Set();
    for (const page of notebook.pages || []) {
      if (!page || typeof page !== 'object' || Array.isArray(page)) {
        return `Cuốn sổ ${String(notebook.id)} chứa trang không hợp lệ`;
      }
      if (!isValidId(page.id)) {
        return `Cuốn sổ ${String(notebook.id)} chứa trang có ID không hợp lệ`;
      }

      const normalizedPageId = String(page.id);
      if (pageIds.has(normalizedPageId)) {
        return `Cuốn sổ ${String(notebook.id)} chứa ID trang trùng lặp`;
      }
      pageIds.add(normalizedPageId);
    }

    if (hasOversizedTextFields(notebook)) {
      return `Cuốn sổ ${String(notebook.id)} chứa trường văn bản vượt quá giới hạn`;
    }
  }

  return null;
}

export function apiRoutes(app) {
  // ─── GET /api/notebooks — Load full library ───
  app.get('/api/notebooks', requireAuth, (req, res) => {
    try {
      const notebooks = loadFullState(req.user.id);
      const lastSyncedAt = getLastSyncedAt(req.user.id);
      const deletedNotebookIds = getDeletedNotebookIds(req.user.id);
      res.json({ ok: true, notebooks, lastSyncedAt, deletedNotebookIds });
    } catch (err) {
      console.error('Error loading notebooks:', err);
      res.status(500).json({ error: 'Lỗi tải dữ liệu' });
    }
  });

  // ─── GET /api/notebooks/sync-meta — Server sync timestamp ───
  app.get('/api/notebooks/sync-meta', requireAuth, (req, res) => {
    try {
      const lastSyncedAt = getLastSyncedAt(req.user.id);
      res.json({ ok: true, lastSyncedAt });
    } catch (err) {
      res.status(500).json({ error: 'Lỗi lấy thông tin đồng bộ' });
    }
  });

  // ─── PUT /api/notebooks/sync — Smart merge sync ───
  app.put('/api/notebooks/sync', requireAuth, (req, res) => {
    try {
      const { notebooks, lastSyncedAt: clientLastSyncedAt, deletedNotebookIds = [] } = req.body;
      const validationError = validateSyncPayload(notebooks, deletedNotebookIds);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      // Reject push of empty notebooks when server has data AND no deletedNotebookIds
      // (prevents stale/cold clients from wiping content)
      const existing = loadFullState(req.user.id);
      if (notebooks.length === 0 && existing.length > 0 && (!Array.isArray(deletedNotebookIds) || deletedNotebookIds.length === 0)) {
        return res.status(409).json({
          error: 'Không thể đồng bộ danh sách rỗng khi server có dữ liệu. Hãy tải lại trang.',
          code: 'EMPTY_SYNC_BLOCKED',
          serverCount: existing.length
        });
      }

      const { merged, savedAt, deletedNotebookIds: serverDeletedIds } = mergeAndSaveState(req.user.id, notebooks, clientLastSyncedAt, deletedNotebookIds);
      res.json({
        ok: true,
        savedAt,
        count: merged.length,
        notebooks: merged,
        deletedNotebookIds: serverDeletedIds
      });
    } catch (err) {
      console.error('Error syncing notebooks:', err);
      res.status(500).json({ error: 'Lỗi lưu dữ liệu' });
    }
  });

  // ─── POST /api/notebooks/sync-beacon — Fire-and-forget sync via sendBeacon ───
  // sendBeacon sends text/plain by default, so we use express.text() middleware
  app.post(
    '/api/notebooks/sync-beacon',
    requireAuth,
    express.text({ type: 'text/plain', limit: SYNC_BEACON_BODY_LIMIT }),
    (req, res) => {
      try {
        // Parse only after authentication so unauthenticated callers cannot
        // consume resources by forcing large beacon payload parsing.
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
          return res.status(204).end();
        }
        const {
          notebooks,
          lastSyncedAt: clientLastSyncedAt,
          deletedNotebookIds = []
        } = body;

        if (!Array.isArray(notebooks) || notebooks.length === 0) {
          return res.status(204).end();
        }

        const validationError = validateSyncPayload(notebooks, deletedNotebookIds);
        if (validationError) {
          console.warn('Rejected invalid sync beacon:', validationError);
          return res.status(204).end();
        }

        mergeAndSaveState(
          req.user.id,
          notebooks,
          clientLastSyncedAt,
          deletedNotebookIds
        );
        return res.status(204).end();
      } catch (err) {
        console.error('Error in sync-beacon:', err);
        return res.status(204).end();
      }
    }
  );

  // ─── PATCH /api/notebooks/:id/progress — Update reading progress safely ───
  app.patch('/api/notebooks/:id/progress', requireAuth, (req, res) => {
    try {
      const { lastPageIndex } = req.body || {};
      if (!Number.isSafeInteger(lastPageIndex) || lastPageIndex < 0) {
        return res.status(400).json({ error: 'lastPageIndex không hợp lệ' });
      }
      const result = updateNotebookProgress(req.user.id, req.params.id, lastPageIndex);
      if (result.reason === 'not_found') {
        return res.status(404).json({ error: 'Không tìm thấy cuốn sổ' });
      }
      if (result.reason === 'out_of_range') {
        return res.status(400).json({
          error: 'lastPageIndex vượt quá số trang hiện có',
          pageCount: result.pageCount
        });
      }
      res.json({
        ok: true,
        lastPageIndex: result.lastPageIndex,
        pageCount: result.pageCount
      });
    } catch (err) {
      console.error('Error updating notebook progress:', err);
      res.status(500).json({ error: 'Lỗi cập nhật tiến độ đọc' });
    }
  });

  // ─── DELETE /api/notebooks/:id ───
  app.delete('/api/notebooks/:id', requireAuth, (req, res) => {
    try {
      deleteNotebookById(req.user.id, req.params.id);
      res.json({ ok: true });
    } catch (err) {
      console.error('Error deleting notebook:', err);
      res.status(500).json({ error: 'Lỗi xóa cuốn sổ' });
    }
  });
}
