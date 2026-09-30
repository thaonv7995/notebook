/**
 * Notebook API Routes
 * 
 * All routes require authentication via requireAuth middleware.
 * 
 * GET  /api/notebooks          — Load full library
 * PUT  /api/notebooks/sync     — Save full state (bulk sync)
 * DELETE /api/notebooks/:id    — Delete a notebook
 */

import { requireAuth } from './auth.js';
import { loadFullState, saveFullState, deleteNotebookById } from './db.js';

export function apiRoutes(app) {
  // ─── GET /api/notebooks — Load full library ───
  app.get('/api/notebooks', requireAuth, (req, res) => {
    try {
      const notebooks = loadFullState(req.user.id);
      res.json({ ok: true, notebooks });
    } catch (err) {
      console.error('Error loading notebooks:', err);
      res.status(500).json({ error: 'Lỗi tải dữ liệu' });
    }
  });

  // ─── PUT /api/notebooks/sync — Full state sync ───
  app.put('/api/notebooks/sync', requireAuth, (req, res) => {
    try {
      const { notebooks } = req.body;
      if (!Array.isArray(notebooks)) {
        return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
      }
      saveFullState(req.user.id, notebooks);
      res.json({
        ok: true,
        savedAt: new Date().toISOString(),
        count: notebooks.length
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
