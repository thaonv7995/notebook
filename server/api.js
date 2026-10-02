/**
 * Notebook API Routes
 * 
 * All routes require authentication via requireAuth middleware.
 * 
 * GET  /api/notebooks          — Load full library
 * GET  /api/notebooks/sync-meta — Get server sync timestamp
 * PUT  /api/notebooks/sync     — Smart merge sync (per-notebook conflict resolution)
 * DELETE /api/notebooks/:id    — Delete a notebook
 */

import { requireAuth } from './auth.js';
import { loadFullState, saveFullState, deleteNotebookById, mergeAndSaveState, getLastSyncedAt } from './db.js';

export function apiRoutes(app) {
  // ─── GET /api/notebooks — Load full library ───
  app.get('/api/notebooks', requireAuth, (req, res) => {
    try {
      const notebooks = loadFullState(req.user.id);
      const lastSyncedAt = getLastSyncedAt(req.user.id);
      res.json({ ok: true, notebooks, lastSyncedAt });
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
      const { notebooks, lastSyncedAt: clientLastSyncedAt } = req.body;
      if (!Array.isArray(notebooks)) {
        return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
      }

      // Reject push of empty notebooks when server has data
      // (prevents stale/cold clients from wiping content)
      const existing = loadFullState(req.user.id);
      if (notebooks.length === 0 && existing.length > 0) {
        return res.status(409).json({
          error: 'Không thể đồng bộ danh sách rỗng khi server có dữ liệu. Hãy tải lại trang.',
          code: 'EMPTY_SYNC_BLOCKED',
          serverCount: existing.length
        });
      }

      const { merged, savedAt } = mergeAndSaveState(req.user.id, notebooks, clientLastSyncedAt);
      res.json({
        ok: true,
        savedAt,
        count: merged.length,
        notebooks: merged
      });
    } catch (err) {
      console.error('Error syncing notebooks:', err);
      res.status(500).json({ error: 'Lỗi lưu dữ liệu' });
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
