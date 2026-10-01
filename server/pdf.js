/**
 * Server-side PDF Generator using Puppeteer
 *
 * Opens the notebook in a headless browser at the exact same URL the user sees,
 * navigates to a special print-mode route, and captures a pixel-perfect PDF.
 *
 * This bypasses Chrome's print dialog entirely — the PDF output is identical
 * to what the user sees on screen.
 *
 * Endpoint: GET /api/notebooks/:id/pdf
 */

import { requireAuth } from './auth.js';
import { loadFullState } from './db.js';

const PORT = parseInt(process.env.PORT, 10) || 27972;

/**
 * Generates a self-contained HTML document that renders all notebook pages
 * with the exact same styles as the web app. Puppeteer opens this HTML and
 * prints it to PDF.
 */
function buildPrintHTML(notebook, allCSS) {
  const pages = notebook.pages || [];

  // Build page HTML using the same template structure as the frontend
  const pagesHTML = pages.map((page, idx) => {
    const template = page.template || 'cornell';
    return buildPageHTML(page, template, idx + 1, notebook);
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${notebook.title || 'Notebook'} — PDF Export</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    ${allCSS}

    /* PDF-specific overrides */
    @page {
      size: A4 portrait;
      margin: 0;
    }

    *, *::before, *::after {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
    }

    .pdf-root {
      width: 210mm;
    }

    .pdf-page {
      width: 480px;
      height: 680px;
      background: #ffffff;
      position: relative;
      overflow: hidden;
      box-sizing: border-box;
      page-break-after: always;
      page-break-inside: avoid;
    }

    /* Hide interactive elements */
    .punch-margin-line,
    .content-corner-frame,
    .edge-notch-markers,
    .status-pill-btn { display: none !important; }

    [contenteditable] { cursor: default; }
  </style>
</head>
<body>
  <div class="pdf-root">
    ${pagesHTML}
  </div>
</body>
</html>`;
}

/**
 * Build HTML for a single page based on its template type
 */
function buildPageHTML(page, template, pageNum, notebook) {
  const authorName = notebook.author || 'Cá nhân';
  const escapeHTML = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const formatContent = (text) => {
    if (!text) return '';
    return text.split('\n').map(line => `<div>${line || '<br>'}</div>`).join('');
  };

  switch (template) {
    case 'cornell':
      return buildCornellHTML(page, pageNum, authorName, escapeHTML, formatContent);
    case 'ruled':
      return buildRuledHTML(page, pageNum, authorName, escapeHTML, formatContent);
    default:
      return buildRuledHTML(page, pageNum, authorName, escapeHTML, formatContent);
  }
}

function buildCornellHTML(page, pageNum, author, esc, fmt) {
  return `
  <div class="pdf-page">
    <div class="a4-template-sheet cornell-template-sheet">
      <div class="functional-header">
        <div class="header-top-meta">
          <div class="header-purpose-badge"><span>✦</span> STUDY JOURNAL</div>
          <div class="signature-seal-cartouche">
            <span class="seal-user-handle">${esc(author)}</span>
            <span class="seal-user-sub">STUDY ARCHIVE</span>
          </div>
        </div>
        <div class="header-main-field">
          <span class="field-label">SUBJECT / TOPIC:</span>
          <span class="field-underline-input">${esc(page.topic || page.title || '')}</span>
        </div>
        <div class="header-sub-fields">
          <div class="sub-field-group">
            <span style="font-weight:700">DATE:</span>
            <span class="sub-field-input">${esc(page.date || '')}</span>
          </div>
          <div class="sub-field-group" style="margin-left:auto">
            <span style="font-weight:700">NO.</span>
            <span class="sub-field-input">${esc(page.no || String(pageNum).padStart(2, '0'))}</span>
          </div>
        </div>
      </div>
      <div class="cornell-container">
        <div class="col-guide-bar">
          <span class="section-guide-badge">CUES & QUESTIONS</span>
          <span class="section-guide-badge">NOTES</span>
        </div>
        <div class="cornell-body-split">
          <div class="cornell-cue-col">
            <div class="template-writing-area cornell-cues-text">${fmt(page.cues)}</div>
          </div>
          <div class="cornell-notes-col">
            <div class="template-writing-area cornell-notes-text">${fmt(page.notes || page.content)}</div>
          </div>
        </div>
        <div class="cornell-summary-area">
          <div class="col-guide-bar"><span class="section-guide-badge">SUMMARY & SYNTHESIS</span></div>
          <div class="template-writing-area cornell-summary-text">${fmt(page.summary)}</div>
        </div>
      </div>
      <div class="scholar-footer">
        <span class="footer-system-name">CORNELL SYSTEM</span>
        <span class="footer-page-line">PAGE <span>${pageNum}</span></span>
      </div>
    </div>
  </div>`;
}

function buildRuledHTML(page, pageNum, author, esc, fmt) {
  return `
  <div class="pdf-page">
    <div class="a4-template-sheet ruled-template-sheet">
      <div class="functional-header">
        <div class="header-top-meta">
          <div class="header-purpose-badge"><span>✎</span> GENERAL NOTEBOOK</div>
          <div class="signature-seal-cartouche">
            <span class="seal-user-handle">${esc(author)}</span>
            <span class="seal-user-sub">PERSONAL NOTES</span>
          </div>
        </div>
        <div class="header-main-field">
          <span class="field-label">SUBJECT / TOPIC:</span>
          <span class="field-underline-input">${esc(page.topic || page.title || '')}</span>
        </div>
        <div class="header-sub-fields">
          <div class="sub-field-group">
            <span style="font-weight:700">DATE:</span>
            <span class="sub-field-input">${esc(page.date || '')}</span>
          </div>
          <div class="sub-field-group" style="margin-left:auto">
            <span style="font-weight:700">NO.</span>
            <span class="sub-field-input">${esc(page.no || String(pageNum).padStart(2, '0'))}</span>
          </div>
        </div>
      </div>
      <div class="ruled-full-canvas">
        <div class="template-writing-area ruled-canvas-text">${fmt(page.content)}</div>
      </div>
      <div class="scholar-footer">
        <span class="footer-system-name">RULED NOTEBOOK</span>
        <span class="footer-page-line">PAGE <span>${pageNum}</span></span>
      </div>
    </div>
  </div>`;
}

/**
 * Register the PDF export API route
 */
export function pdfRoutes(app) {
  app.get('/api/notebooks/:id/pdf', requireAuth, async (req, res) => {
    let browser = null;
    try {
      const notebooks = loadFullState(req.user.id);
      const notebook = notebooks.find(nb => nb.id === req.params.id);
      if (!notebook) {
        return res.status(404).json({ error: 'Không tìm thấy cuốn sổ' });
      }

      // Dynamically import puppeteer
      const puppeteer = await import('puppeteer');

      // Read all CSS files from the built app
      const { readFileSync } = await import('fs');
      const { join, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      const __dirname = dirname(fileURLToPath(import.meta.url));

      // Try dist/ first (production), fall back to src/ (dev)
      let allCSS = '';
      const srcStylesDir = join(__dirname, '..', 'src', 'styles');
      const cssFiles = ['reader.css', 'templates.css', 'library.css'];
      for (const file of cssFiles) {
        try {
          allCSS += readFileSync(join(srcStylesDir, file), 'utf-8') + '\n';
        } catch { /* skip if not found */ }
      }

      const html = buildPrintHTML(notebook, allCSS);

      browser = await puppeteer.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
      });

      const browserPage = await browser.newPage();
      await browserPage.setContent(html, { waitUntil: 'networkidle0' });

      // Wait for fonts to load
      await browserPage.evaluateHandle('document.fonts.ready');

      const pdfBuffer = await browserPage.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        preferCSSPageSize: true,
      });

      await browser.close();
      browser = null;

      const safeName = (notebook.title || 'notebook').replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF\u4E00-\u9FFF\s-]/g, '').trim() || 'notebook';
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}.pdf"`,
        'Content-Length': pdfBuffer.length,
      });
      res.send(pdfBuffer);
    } catch (err) {
      console.error('PDF generation error:', err);
      if (browser) {
        try { await browser.close(); } catch {}
      }
      res.status(500).json({ error: 'Lỗi tạo PDF: ' + err.message });
    }
  });
}
