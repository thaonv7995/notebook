/**
 * Bilingual App Integration Router
 *
 * Backend-to-backend bridge to communicate with Bilingual App (FastAPI).
 * Completely shields client credentials and internal URLs from the browser.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth } from './auth.js';
import { loadFullState, saveFullState } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let BILINGUAL_URL = (process.env.BILINGUAL_APP_URL || 'http://127.0.0.1:27099').replace(/\/+$/, '');
const BILINGUAL_CLIENT_ID = process.env.BILINGUAL_CLIENT_ID || 'notebook_client_v1';

export function bilingualRoutes(app) {
  // ─── GET /api/bilingual/config — Get current Bilingual App config ───
  app.get('/api/bilingual/config', requireAuth, (req, res) => {
    res.json({
      ok: true,
      bilingualUrl: BILINGUAL_URL
    });
  });

  // ─── POST /api/bilingual/config — Update Bilingual App URL & persist to .env ───
  app.post('/api/bilingual/config', requireAuth, (req, res) => {
    const { bilingualUrl } = req.body || {};
    if (bilingualUrl && typeof bilingualUrl === 'string') {
      const trimmed = bilingualUrl.trim().replace(/\/+$/, '');
      if (trimmed) {
        BILINGUAL_URL = trimmed;
        process.env.BILINGUAL_APP_URL = trimmed;
        try {
          const envPath = path.resolve(__dirname, '..', '.env');
          if (fs.existsSync(envPath)) {
            let envContent = fs.readFileSync(envPath, 'utf8');
            if (/^BILINGUAL_APP_URL=.*$/m.test(envContent)) {
              envContent = envContent.replace(/^BILINGUAL_APP_URL=.*$/m, `BILINGUAL_APP_URL=${trimmed}`);
            } else {
              envContent += `\nBILINGUAL_APP_URL=${trimmed}\n`;
            }
            fs.writeFileSync(envPath, envContent, 'utf8');
          }
        } catch (e) {
          console.warn('[BilingualConfig] Failed to save .env:', e.message);
        }
      }
    }
    res.json({ ok: true, bilingualUrl: BILINGUAL_URL });
  });

  // ─── GET /api/bilingual/test — Test connectivity to Bilingual App ───
  app.get('/api/bilingual/test', requireAuth, async (req, res) => {
    try {
      const targetUrl = req.query.url ? String(req.query.url).trim().replace(/\/+$/, '') : BILINGUAL_URL;
      const resp = await fetch(`${targetUrl}/api/books`, {
        headers: {
          'X-Client-ID': BILINGUAL_CLIENT_ID
        },
        signal: AbortSignal.timeout(4000)
      });
      if (resp.ok) {
        const books = await resp.json();
        const count = Array.isArray(books) ? books.length : (books?.books?.length || 0);
        return res.json({
          ok: true,
          message: `Kết nối thành công! Đã tìm thấy ${count} cuốn sách trong Thư viện.`,
          count
        });
      } else {
        return res.status(resp.status).json({
          ok: false,
          error: `Máy chủ phản hồi mã lỗi HTTP ${resp.status}`
        });
      }
    } catch (err) {
      return res.status(502).json({
        ok: false,
        error: `Không thể kết nối đến máy chủ: ${err.message}`
      });
    }
  });
  // ─── GET /api/bilingual/books — List books from Bilingual App ───
  app.get('/api/bilingual/books', requireAuth, async (req, res) => {
    try {
      const resp = await fetch(`${BILINGUAL_URL}/api/books`, {
        headers: {
          'X-Client-ID': BILINGUAL_CLIENT_ID
        }
      });

      if (!resp.ok) {
        return res.status(resp.status).json({
          ok: false,
          error: `Bilingual App error (${resp.status})`
        });
      }

      const books = await resp.json();
      res.json({ ok: true, books });
    } catch (err) {
      console.warn('[BilingualProxy] Failed to connect to Bilingual App:', err.message);
      res.status(502).json({
        ok: false,
        error: 'Không thể kết nối đến máy chủ Bilingual App'
      });
    }
  });

  // ─── GET /api/bilingual/books/:slug/page/:lang/:page — Serve book page with rewritten assets ───
  app.get('/api/bilingual/books/:slug/page/:lang/:page', requireAuth, async (req, res) => {
    try {
      const { slug, lang } = req.params;
      const page = parseInt(req.params.page, 10) || 1;
      const padPage = String(page).padStart(4, '0');

      const targetUrl = `${BILINGUAL_URL}/books/${encodeURIComponent(slug)}/output/${encodeURIComponent(lang)}/page_${padPage}.html?client_id=${BILINGUAL_CLIENT_ID}&embed=1`;

      const resp = await fetch(targetUrl, {
        headers: {
          'X-Client-ID': BILINGUAL_CLIENT_ID
        }
      });

      if (!resp.ok) {
        return res.status(resp.status).send(`Không thể tải trang sách (HTTP ${resp.status})`);
      }

      let html = await resp.text();

      // Rewrite relative asset paths so the browser loads them through our secure backend proxy
      const assetProxyBase = `/api/bilingual/books/${encodeURIComponent(slug)}/assets/`;
      html = html.replace(/(href|src)=["'](?:\.\.\/|\.\/)?assets\/([^"']+)["']/g, `$1="${assetProxyBase}$2"`);
      html = html.replace(/url\(['"]?(?:\.\.\/|\.\/)?assets\/([^'"]+)['"]?\)/g, `url('${assetProxyBase}$1')`);

      // Inject responsive reading styles so the fixed A4 page fits the reader panel perfectly without clipping
      const embedResponsiveStyle = `
<style id="nb-embed-responsive-style">
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
    -webkit-font-smoothing: antialiased;
  }
  body.book-standalone {
    display: block !important;
    min-height: auto !important;
    background: #ffffff !important;
    padding: 0 !important;
  }
  .book-page.book-page--sheet {
    width: 100% !important;
    max-width: 100% !important;
    height: auto !important;
    min-height: auto !important;
    max-height: none !important;
    overflow: visible !important;
    margin: 0 auto !important;
    padding: 22px 26px 44px !important;
    box-shadow: none !important;
    box-sizing: border-box !important;
  }
  .sheet-flow {
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    box-sizing: border-box !important;
  }
  .sheet-flow.prose-page p {
    font-size: 15px !important;
    line-height: 1.7 !important;
    margin-bottom: 14px !important;
    text-align: justify !important;
    color: #1e293b !important;
    word-break: break-word !important;
  }
  .sheet-flow.prose-page h1,
  .sheet-flow.prose-page h2,
  .sheet-flow.prose-page h3 {
    color: #0f172a !important;
    margin-top: 18px !important;
    margin-bottom: 10px !important;
    line-height: 1.35 !important;
  }
  .sheet-flow.prose-page h3.section-title {
    font-size: 18px !important;
    font-weight: 700 !important;
  }
  .sheet-flow.prose-page pre.code-block {
    max-width: 100% !important;
    overflow-x: auto !important;
    font-size: 13px !important;
    padding: 12px 14px !important;
    border-radius: 6px !important;
  }
  .sheet-flow.prose-page img {
    max-width: 100% !important;
    height: auto !important;
  }
  .running-head {
    border-bottom: 1px solid #e2e8f0 !important;
    padding-bottom: 6px !important;
    margin-bottom: 18px !important;
    font-size: 11px !important;
    color: #94a3b8 !important;
  }
  .book-footer {
    border-top: 1px solid #e2e8f0 !important;
    padding-top: 8px !important;
    margin-top: 24px !important;
    font-size: 11px !important;
    color: #94a3b8 !important;
  }
  /* Hide the redundant in-page page-nav floating button */
  .page-nav {
    display: none !important;
  }
  ::-webkit-scrollbar {
    width: 6px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
</style>
`;
      if (html.includes('</head>')) {
        html = html.replace('</head>', `${embedResponsiveStyle}\n</head>`);
      } else {
        html = embedResponsiveStyle + html;
      }

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (err) {
      console.error('[BilingualProxy] Page fetch error:', err.message);
      res.status(502).send('Lỗi kết nối máy chủ Bilingual App');
    }
  });

  // ─── GET /api/bilingual/books/:slug/assets/{*assetPath} — Proxy static assets (CSS, images, fonts) ───
  app.get('/api/bilingual/books/:slug/assets/{*assetPath}', async (req, res) => {
    try {
      const { slug } = req.params;
      const assetPath = req.params.assetPath || '';

      const targetUrl = `${BILINGUAL_URL}/books/${encodeURIComponent(slug)}/output/assets/${assetPath}?client_id=${BILINGUAL_CLIENT_ID}`;

      const resp = await fetch(targetUrl, {
        headers: {
          'X-Client-ID': BILINGUAL_CLIENT_ID
        }
      });

      if (!resp.ok) {
        return res.status(resp.status).end();
      }

      // Forward content type and cache headers
      const contentType = resp.headers.get('content-type');
      if (contentType) res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');

      const buffer = await resp.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (err) {
      console.warn('[BilingualProxy] Asset proxy error:', err.message);
      res.status(404).end();
    }
  });

  // ─── GET /api/bilingual/notebooks — List user notebooks for linking ───
  app.get('/api/bilingual/notebooks', requireAuth, (req, res) => {
    try {
      const notebooks = loadFullState(req.user.id) || [];
      const list = notebooks.map(nb => ({
        id: nb.id,
        title: nb.title,
        category: nb.category || 'Chung',
        bookSlug: nb.bookSlug || '',
        coverGradient: nb.coverGradient || 'linear-gradient(135deg, #1e3a8a, #0f172a)',
        pageCount: Array.isArray(nb.pages) ? nb.pages.length : 0,
        updatedAt: nb.updatedAt || nb.createdAt
      }));
      res.json({ ok: true, notebooks: list });
    } catch (err) {
      console.error('[BilingualIntegration] Error listing notebooks:', err);
      res.status(500).json({ ok: false, error: 'Lỗi tải danh sách sổ tay' });
    }
  });

  // ─── POST /api/bilingual/notebooks — Create a new notebook linked to a book ───
  app.post('/api/bilingual/notebooks', requireAuth, (req, res) => {
    try {
      const { title, bookSlug, bookTitle, category = 'Sách song ngữ' } = req.body || {};
      const notebooks = loadFullState(req.user.id) || [];
      const now = new Date().toISOString();
      const newId = `nb-${Date.now()}`;
      const firstPageId = `p-${Date.now()}-1`;

      const newNotebook = {
        id: newId,
        title: title || (bookTitle ? `[Ghi chép] ${bookTitle}` : 'Sổ ghi chép mới'),
        author: `@${req.user.username || 'user'}`,
        category,
        lang: 'EN · VI',
        coverGradient: 'linear-gradient(135deg, #4f46e5, #0f172a)',
        coverTextColor: '#ffffff',
        bookSlug: bookSlug || '',
        createdAt: now,
        updatedAt: now,
        lastPageIndex: 0,
        isPinned: false,
        pages: [
          {
            id: firstPageId,
            lang: 'VI',
            title: `Trang mở đầu — ${bookTitle || 'Ghi chép'}`,
            topic: bookTitle || 'Đọc sách song ngữ',
            project: bookSlug || '',
            date: new Date().toLocaleDateString('vi-VN'),
            no: '01',
            status: 'WIP',
            template: 'cornell',
            updatedAt: now,
            content: `<h2>${title || (bookTitle ? `Ghi chép: ${bookTitle}` : 'Ghi chép mới')}</h2><p>Bắt đầu ghi chép các ý tưởng, từ vựng và câu trích dẫn từ sách...</p>`,
            cues: '<div>✦ <strong>Mục tiêu:</strong> Đọc hiểu và tích lũy từ vựng</div>',
            notes: '',
            summary: ''
          }
        ]
      };

      notebooks.unshift(newNotebook);
      saveFullState(req.user.id, notebooks);
      res.json({ ok: true, notebook: newNotebook });
    } catch (err) {
      console.error('[BilingualIntegration] Error creating notebook:', err);
      res.status(500).json({ ok: false, error: 'Lỗi tạo sổ tay mới' });
    }
  });

  // ─── POST /api/bilingual/books/:slug/link-notebook — Link/unlink notebook to book ───
  app.post('/api/bilingual/books/:slug/link-notebook', requireAuth, (req, res) => {
    try {
      const { slug } = req.params;
      const { notebookId } = req.body || {};
      const notebooks = loadFullState(req.user.id) || [];

      notebooks.forEach(nb => {
        if (nb.id === notebookId) {
          nb.bookSlug = slug;
          nb.updatedAt = new Date().toISOString();
        } else if (nb.bookSlug === slug && notebookId) {
          delete nb.bookSlug;
        }
      });

      saveFullState(req.user.id, notebooks);
      res.json({ ok: true, linkedNotebookId: notebookId });
    } catch (err) {
      console.error('[BilingualIntegration] Error linking notebook:', err);
      res.status(500).json({ ok: false, error: 'Lỗi liên kết sổ tay' });
    }
  });

  // ─── GET /api/bilingual/books/:slug/notebook-status — Get notebook status & pinned pages ───
  app.get('/api/bilingual/books/:slug/notebook-status', requireAuth, (req, res) => {
    try {
      const { slug } = req.params;
      const notebooks = loadFullState(req.user.id) || [];
      
      let linked = notebooks.find(nb => nb.bookSlug === slug);
      if (!linked) {
        linked = notebooks.find(nb => (nb.pages || []).some(p => p.project === slug));
      }

      if (!linked) {
        return res.json({
          ok: true,
          linkedNotebook: null,
          pagesWithNotes: [],
          notes: []
        });
      }

      const pagesWithNotesSet = new Set();
      const notesList = [];

      (linked.pages || []).forEach(p => {
        const bookPageNum = p.bookPage || (p.project === slug && parseInt(p.no, 10)) || null;
        if (bookPageNum) {
          pagesWithNotesSet.add(bookPageNum);
        }
        const textPreview = (p.notes || p.content || p.cues || '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        notesList.push({
          id: p.id,
          no: p.no || '',
          bookPage: bookPageNum,
          title: p.title || (bookPageNum ? `Ghi chép Trang ${bookPageNum}` : `Trang ${p.no || '?'}`),
          date: p.date || p.updatedAt || new Date().toLocaleDateString('vi-VN'),
          preview: textPreview ? textPreview.slice(0, 160) : '(Trang chưa có nội dung)',
          template: p.template || 'cornell'
        });
      });

      res.json({
        ok: true,
        linkedNotebook: {
          id: linked.id,
          title: linked.title,
          coverGradient: linked.coverGradient
        },
        pagesWithNotes: Array.from(pagesWithNotesSet).sort((a, b) => a - b),
        notes: notesList
      });
    } catch (err) {
      console.error('[BilingualIntegration] Error getting notebook status:', err);
      res.status(500).json({ ok: false, error: 'Lỗi kiểm tra trạng thái sổ tay' });
    }
  });

  // ─── POST /api/bilingual/notebooks/:id/notes — Push quote, vocab or quick note ───
  app.post('/api/bilingual/notebooks/:id/notes', requireAuth, (req, res) => {
    try {
      const { id } = req.params;
      const { bookSlug, bookTitle, page, type = 'note', text = '', note = '', vocab = null } = req.body || {};
      const notebooks = loadFullState(req.user.id) || [];
      const notebook = notebooks.find(nb => nb.id === id);

      if (!notebook) {
        return res.status(404).json({ ok: false, error: 'Không tìm thấy sổ tay' });
      }

      if (bookSlug && !notebook.bookSlug) {
        notebook.bookSlug = bookSlug;
      }

      const now = new Date().toISOString();
      const pageNum = parseInt(page, 10) || 1;

      if (!Array.isArray(notebook.pages)) notebook.pages = [];
      let targetPage = notebook.pages.find(p => p.bookPage === pageNum || (p.project === bookSlug && p.bookPage === pageNum));

      if (!targetPage) {
        targetPage = {
          id: `p-${Date.now()}-${notebook.pages.length + 1}`,
          lang: 'VI',
          title: `${bookTitle || 'Sách'} — Trang ${pageNum}`,
          topic: bookTitle || 'Đọc hiểu',
          project: bookSlug || '',
          bookPage: pageNum,
          date: new Date().toLocaleDateString('vi-VN'),
          no: String(pageNum).padStart(2, '0'),
          status: 'WIP',
          template: 'cornell',
          updatedAt: now,
          content: '',
          cues: '',
          notes: '',
          summary: ''
        };
        notebook.pages.push(targetPage);
      }

      if (type === 'vocab' && vocab) {
        const vocabCardHtml = `
<div class="note-vocab-card" style="margin: 10px 0; padding: 12px 14px; background: rgba(56, 189, 248, 0.08); border-left: 3px solid #38bdf8; border-radius: 6px;">
  <div style="font-weight: 700; font-size: 15px; color: #0284c7;">✦ ${vocab.word || text} <span style="font-weight: 400; font-size: 13px; color: #64748b;">${vocab.ipa ? `/${vocab.ipa}/` : ''}</span></div>
  <div style="margin-top: 4px; font-size: 14px; color: #334155;"><strong>Ý nghĩa:</strong> ${vocab.meaningVi || vocab.meaningEn || '—'}</div>
  ${vocab.example ? `<div style="margin-top: 4px; font-size: 13px; font-style: italic; color: #64748b;">Ví dụ: "${vocab.example}"</div>` : ''}
  <div style="margin-top: 6px; font-size: 11px; color: #94a3b8;">📖 ${bookTitle || bookSlug} (Trang ${pageNum})</div>
</div>`;
        targetPage.cues = (targetPage.cues ? targetPage.cues + '<br>' : '') + `✦ <strong>${vocab.word || text}</strong>: ${vocab.meaningVi || vocab.meaningEn || ''}`;
        targetPage.notes = (targetPage.notes || '') + vocabCardHtml;
      } else if (type === 'quote') {
        const quoteHtml = `
<blockquote style="margin: 10px 0; padding: 10px 14px; border-left: 3px solid #8b5cf6; background: rgba(139, 92, 246, 0.08); border-radius: 4px; font-style: italic; color: #1e293b;">
  "${text}"
  <div style="font-style: normal; font-size: 11px; color: #64748b; margin-top: 5px;">— Trích từ <strong>${bookTitle || bookSlug}</strong>, Trang ${pageNum}</div>
</blockquote>
${note ? `<p style="margin: 4px 0 10px 12px; color: #334155;">💬 <strong>Ghi chú:</strong> ${note}</p>` : ''}`;
        targetPage.notes = (targetPage.notes || '') + quoteHtml;
      } else {
        const noteHtml = `
<div style="margin: 10px 0; padding: 8px 12px; background: rgba(16, 185, 129, 0.08); border-left: 3px solid #10b981; border-radius: 4px;">
  <div style="font-size: 11px; color: #059669; font-weight: 600;">📝 Ghi chú Trang ${pageNum} (${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})</div>
  <p style="margin: 4px 0; color: #1e293b;">${text}</p>
</div>`;
        targetPage.notes = (targetPage.notes || '') + noteHtml;
      }

      targetPage.updatedAt = now;
      notebook.updatedAt = now;

      saveFullState(req.user.id, notebooks);

      res.json({
        ok: true,
        notebookId: notebook.id,
        pageId: targetPage.id,
        bookPage: pageNum,
        message: 'Đã lưu vào Sổ tay thành công'
      });
    } catch (err) {
      console.error('[BilingualIntegration] Error pushing note to notebook:', err);
      res.status(500).json({ ok: false, error: 'Lỗi ghi chú vào sổ tay' });
    }
  });

  // ─── GET /api/bilingual/notebooks/:id/page-detail — Get full page template data for a book page ───
  app.get('/api/bilingual/notebooks/:id/page-detail', requireAuth, (req, res) => {
    try {
      const { id } = req.params;
      const pageId = req.query.pageId || '';
      const bookSlug = req.query.bookSlug || '';
      const bookTitle = req.query.bookTitle || '';
      const pageNum = req.query.page ? parseInt(req.query.page, 10) : null;
      const notebooks = loadFullState(req.user.id) || [];
      const notebook = notebooks.find(nb => nb.id === id);

      if (!notebook) {
        return res.status(404).json({ ok: false, error: 'Không tìm thấy sổ tay' });
      }

      if (!Array.isArray(notebook.pages)) notebook.pages = [];
      let targetPage = null;

      // 1. Look up by exact pageId if provided
      if (pageId) {
        targetPage = notebook.pages.find(p => p.id === pageId);
      }

      // 2. Look up by bookPage or p.no matching pageNum
      if (!targetPage && pageNum !== null) {
        targetPage = notebook.pages.find(p => p.bookPage === pageNum || (p.project === bookSlug && p.bookPage === pageNum));
        if (!targetPage) {
          targetPage = notebook.pages.find(p => parseInt(p.no, 10) === pageNum);
        }
      }

      if (!targetPage) {
        const fallbackNum = pageNum || (notebook.pages.length + 1);
        targetPage = {
          id: `p-${Date.now()}-${notebook.pages.length + 1}`,
          lang: 'VI',
          title: `${bookTitle || 'Sách'} — Trang ${fallbackNum}`,
          topic: bookTitle || 'Đọc hiểu',
          project: bookSlug || '',
          bookPage: fallbackNum,
          date: new Date().toLocaleDateString('vi-VN'),
          no: String(fallbackNum).padStart(2, '0'),
          status: 'WIP',
          template: 'cornell',
          updatedAt: new Date().toISOString(),
          content: '',
          cues: '',
          notes: '',
          summary: '',
          isNew: true
        };
      } else {
        if (!targetPage.notes && targetPage.content) {
          targetPage.notes = targetPage.content;
        }
        if (!targetPage.content && targetPage.notes) {
          targetPage.content = targetPage.notes;
        }
      }

      res.json({
        ok: true,
        notebook: {
          id: notebook.id,
          title: notebook.title,
          coverGradient: notebook.coverGradient
        },
        page: targetPage,
        availableTemplates: [
          { id: 'cornell', name: 'Cornell Notes (Khuyên dùng)', badge: '✦ STUDY JOURNAL' },
          { id: 'reading', name: 'Reading Notes (Đọc sách)', badge: '📖 READING NOTES' },
          { id: 'ruled', name: 'Ruled Notebook (Kẻ ngang)', badge: '📝 SCHOLAR JOURNAL' },
          { id: 'vocab', name: 'Vocabulary Lab (Từ vựng)', badge: '✦ VOCAB LAB' },
          { id: 'work', name: 'Work & Project Log', badge: '💼 PROJECT LOG' },
          { id: 'blank', name: 'Freeform / Blank', badge: '✦ FREEFORM' }
        ]
      });
    } catch (err) {
      console.error('[BilingualIntegration] Error getting page detail:', err);
      res.status(500).json({ ok: false, error: 'Lỗi tải trang ghi chú' });
    }
  });

  // ─── PUT /api/bilingual/notebooks/:id/page-detail — Save full page template data ───
  app.put('/api/bilingual/notebooks/:id/page-detail', requireAuth, (req, res) => {
    try {
      const { id } = req.params;
      console.log(`\n🔥🔥🔥 [PUT /page-detail] pageId=${req.body?.pageId} notes=${JSON.stringify(req.body?.notes?.slice(0, 100))}\n`);
      const {
        pageId,
        bookSlug,
        bookTitle,
        page,
        template = 'cornell',
        topic,
        title,
        date,
        no,
        status = 'WIP',
        cues = '',
        notes = '',
        summary = '',
        content = ''
      } = req.body || {};

      const notebooks = loadFullState(req.user.id) || [];
      const notebook = notebooks.find(nb => nb.id === id);

      if (!notebook) {
        return res.status(404).json({ ok: false, error: 'Không tìm thấy sổ tay' });
      }

      if (bookSlug && !notebook.bookSlug) {
        notebook.bookSlug = bookSlug;
      }

      const now = new Date().toISOString();
      const pageNum = page !== undefined && page !== null ? parseInt(page, 10) : null;

      if (!Array.isArray(notebook.pages)) notebook.pages = [];
      let targetPage = null;

      if (pageId) {
        targetPage = notebook.pages.find(p => p.id === pageId);
      }
      if (!targetPage && pageNum !== null) {
        targetPage = notebook.pages.find(p => p.bookPage === pageNum || (p.project === bookSlug && p.bookPage === pageNum));
        if (!targetPage) {
          targetPage = notebook.pages.find(p => parseInt(p.no, 10) === pageNum);
        }
      }

      if (!targetPage) {
        const fallbackNum = pageNum || (notebook.pages.length + 1);
        targetPage = {
          id: pageId || `p-${Date.now()}-${notebook.pages.length + 1}`,
          lang: 'VI',
          title: title || `${bookTitle || 'Sách'} — Trang ${fallbackNum}`,
          topic: topic || bookTitle || 'Đọc hiểu',
          project: bookSlug || '',
          bookPage: fallbackNum,
          date: date || new Date().toLocaleDateString('vi-VN'),
          no: no || String(fallbackNum).padStart(2, '0'),
          status,
          template,
          updatedAt: now,
          cues,
          notes,
          summary,
          content: content || notes || ''
        };
        notebook.pages.push(targetPage);
      } else {
        if (template) targetPage.template = template;
        if (topic !== undefined) targetPage.topic = topic;
        if (title !== undefined) targetPage.title = title;
        if (date !== undefined) targetPage.date = date;
        if (no !== undefined) targetPage.no = no;
        if (status !== undefined) targetPage.status = status;
        if (cues !== undefined) targetPage.cues = cues;
        if (notes !== undefined) {
          targetPage.notes = notes;
          if (!content) targetPage.content = notes;
        }
        if (summary !== undefined) targetPage.summary = summary;
        if (content !== undefined && content !== '') targetPage.content = content;
        targetPage.updatedAt = now;
      }

      notebook.updatedAt = now;
      saveFullState(req.user.id, notebooks);

      res.json({
        ok: true,
        notebookId: notebook.id,
        page: targetPage,
        message: 'Đã lưu trang ghi chú thành công'
      });
    } catch (err) {
      console.error('[BilingualIntegration] Error saving page detail:', err);
      res.status(500).json({ ok: false, error: 'Lỗi lưu trang ghi chú' });
    }
  });
}
