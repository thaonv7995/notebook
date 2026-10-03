/**
 * Dedicated PDF Export View Generator
 *
 * Runs inside Puppeteer headless browser when visiting:
 * /?export-pdf=:notebookId&cover=0|1
 *
 * Renders all pages of the notebook into pixel-perfect A4 containers,
 * using the app's real template renderers, fonts, ornaments, and styles.
 */

import { getState } from '../state/store.js';
import { renderSheetContent } from '../templates/index.js';
import { createPrintCover } from './pdf-exporter.js';
import { FONT_FAMILIES } from '../config/constants.js';

export function checkAndRenderPdfExport() {
  const params = new URLSearchParams(window.location.search);
  const exportBookId = params.get('export-pdf');
  if (!exportBookId) return false;

  const includeCover = params.get('cover') === '1';

  let attempts = 0;
  const tryRender = () => {
    attempts += 1;
    const state = getState();
    const notebook = (state.notebooks || []).find(nb => nb.id === exportBookId);

    if (!notebook) {
      if (attempts < 50) {
        setTimeout(tryRender, 100);
      } else {
        window.__PDF_ERROR__ = 'Không tìm thấy cuốn sổ trong trạng thái lưu trữ.';
      }
      return;
    }

    try {
      // 1. Hide all interactive web UI
      document.querySelectorAll(
        '.login-view, .library-view, .notebook-view, .reader-header, .editor-toolbar, ' +
        '.fullscreen-rail, .fullscreen-tools-panel, .edge-turn-btn, ' +
        '.modal-overlay, #save-status, .open-book-workspace, ' +
        '.ai-corner-copilot-container, .ai-corner-fab, .ai-corner-chat, ' +
        '.ai-notion-bar-wrapper, #aiNotionInlineBar, .ai-running-corner-badge, .ai-selection-bubble'
      ).forEach(el => el.style.setProperty('display', 'none', 'important'));

      document.body.classList.add('pdf-export-mode');

      // ── Apply notebook typography CSS variables ──
      // These must be set so templates render with the correct font, size, and line spacing
      const nbFontKey = notebook.fontFamily || state.fontFamily || 'sans';
      const cssFont = FONT_FAMILIES[nbFontKey] || FONT_FAMILIES['sans'];
      const lhValue = notebook.lineHeight || state.lineHeight || '28';
      const fontSize = state.fontSize || 16;
      const lhPx = lhValue === 'none' ? 28 : (parseInt(lhValue, 10) || 28);
      const maxNbFont = Math.max(12, lhPx - 4);
      const nbFont = Math.max(10, Math.min(fontSize, maxNbFont));

      document.documentElement.style.setProperty('--notebook-font-family', cssFont);
      document.documentElement.style.setProperty('--notebook-line-height', `${lhPx}px`);
      document.documentElement.style.setProperty('--notebook-font-size', `${nbFont}px`);
      if (lhValue === 'none') {
        document.documentElement.style.setProperty('--notebook-lines-display', 'none');
      } else {
        document.documentElement.style.setProperty(
          '--notebook-lines-display',
          `repeating-linear-gradient(to bottom, transparent 0, transparent ${lhPx - 1}px, #cbd5e1 ${lhPx - 1}px, #cbd5e1 ${lhPx}px)`
        );
      }

      // 2. Inject A4 export stylesheet
      const style = document.createElement('style');
      style.id = 'pdf-export-runtime-styles';

      // ── IMPORTANT: Puppeteer page.pdf() ALWAYS applies @media print CSS ──
      // print.css already handles: .book-page-sheet at 210mm×297mm and
      // .book-page-sheet > .a4-template-sheet at 480×680px with transform:scale(1.65).
      // We must NOT add another transform or the lines will be double-scaled.
      // Our export CSS only needs to: (1) set up the page-break containers,
      // (2) reset visual chrome, and (3) override mode-1-page dimensions.

      style.textContent = `
        /* Emoji font for Puppeteer headless Chrome */
        @font-face {
          font-family: 'Noto Color Emoji';
          src: local('Noto Color Emoji'),
               local('Apple Color Emoji'),
               local('Segoe UI Emoji'),
               local('Segoe UI Symbol'),
               local('Noto Emoji');
          unicode-range: U+200D, U+2049, U+20E3, U+2122, U+2139, U+2194-21AA,
                         U+231A-231B, U+2328, U+23CF, U+23E9-23F3, U+23F8-23FA,
                         U+24C2, U+25AA-25AB, U+25B6, U+25C0, U+25FB-25FE,
                         U+2600-27BF, U+2934-2935, U+2B05-2B07, U+2B1B-2B1C,
                         U+2B50, U+2B55, U+3030, U+303D, U+3297, U+3299,
                         U+FE0F, U+1F000-1FFFF;
        }

        @page {
          size: 210mm 297mm;
          margin: 0;
        }

        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          overflow: visible !important;
        }

        .pdf-export-container {
          width: 210mm;
          margin: 0 auto;
          background: #ffffff;
        }

        .pdf-export-sheet {
          width: 210mm;
          height: 297mm;
          min-height: 297mm;
          max-height: 297mm;
          box-sizing: border-box;
          page-break-after: always;
          page-break-inside: avoid;
          overflow: hidden;
          position: relative;
          background: #ffffff;
        }

        .pdf-export-sheet .book-spread-casing {
          background: none !important;
          box-shadow: none !important;
          border: none !important;
          border-radius: 0 !important;
          padding: 0 !important;
          margin: 0 !important;
          width: 210mm !important;
          height: 297mm !important;
          display: block !important;
          overflow: hidden !important;
        }

        /* Book page sheet: A4 size. NO transform here!
           print.css handles the inner .a4-template-sheet scaling (480×680 → A4).
           Adding transform here would cause DOUBLE scaling. */
        .pdf-export-sheet .book-spread-casing .book-page-sheet,
        .pdf-export-sheet .book-spread-casing.mode-1-page .book-page-sheet {
          display: flex !important;
          width: 210mm !important;
          height: 297mm !important;
          min-height: 297mm !important;
          max-height: 297mm !important;
          box-shadow: none !important;
          border: none !important;
          border-radius: 0 !important;
          margin: 0 !important;
          box-sizing: border-box !important;
          position: relative !important;
          background: var(--paper-cream, #ffffff) !important;
          transform: none !important;
        }

        .pdf-export-sheet [contenteditable] {
          cursor: default !important;
        }

        /* Ensure ruled-line backgrounds and paper colors render in PDF */
        .pdf-export-sheet .template-writing-area,
        .pdf-export-sheet .ruled-canvas-text,
        .pdf-export-sheet .dotgrid-canvas-text,
        .pdf-export-sheet .grid-canvas-text,
        .pdf-export-sheet .quadrant-text,
        .pdf-export-sheet .a4-template-sheet,
        .pdf-export-sheet .a4-template-sheet::after {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
          background-attachment: scroll !important;
        }

        /* Emoji rendering: add emoji font to all text areas */
        .pdf-export-sheet .template-writing-area,
        .pdf-export-sheet .a4-template-sheet {
          font-family: var(--notebook-font-family), 'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif !important;
        }

        /* Hanzi CJK alignment preserved in PDF */
        .pdf-export-sheet .hanzi-cjk {
          display: inline;
          position: relative;
          top: -2px;
        }

        /* Hide only interactive/UI elements — keep decorative elements like
           corner ornaments (.content-corner-frame) and edge index markers (.edge-index-markers) */
        .pdf-export-sheet .ai-corner-copilot-container,
        .pdf-export-sheet .ai-corner-fab,
        .pdf-export-sheet .ai-corner-chat,
        .pdf-export-sheet .status-pill-btn {
          display: none !important;
        }

        .pdf-export-sheet .print-cover-sheet {
          display: flex !important;
          position: relative !important;
          align-items: stretch;
          width: 210mm !important;
          height: 297mm !important;
          min-height: 297mm !important;
          max-height: 297mm !important;
          box-sizing: border-box;
          margin: 0 auto !important;
          padding: 18mm;
          overflow: hidden !important;
          color: var(--print-cover-color, #ffffff) !important;
          background: var(--print-cover-background, linear-gradient(135deg, #1e3a8a, #0f172a)) !important;
        }

        .pdf-export-sheet .print-cover-sheet::before {
          content: '';
          position: absolute;
          inset: 0 auto 0 0;
          width: 15mm;
          background: linear-gradient(to right, rgba(0, 0, 0, 0.42), rgba(255, 255, 255, 0.16) 28%, rgba(0, 0, 0, 0.18) 70%, transparent);
        }

        .pdf-export-sheet .print-cover-frame {
          position: relative;
          z-index: 1;
          display: flex;
          flex: 1;
          flex-direction: column;
          justify-content: space-between;
          padding: 13mm;
          border: 0.6mm solid currentColor;
          color: inherit;
        }

        .pdf-export-sheet .print-cover-category {
          font-size: 11pt;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          opacity: 0.82;
        }

        .pdf-export-sheet .print-cover-title {
          max-width: 155mm;
          margin: auto 0 8mm;
          color: inherit !important;
          font-size: 38pt;
          line-height: 1.08;
          letter-spacing: -0.02em;
          text-transform: uppercase;
          overflow-wrap: anywhere;
        }

        .pdf-export-sheet .print-cover-rule {
          width: 24mm;
          height: 1mm;
          margin-bottom: auto;
          background: currentColor;
          opacity: 0.8;
        }

        .pdf-export-sheet .print-cover-footer {
          display: flex;
          justify-content: space-between;
          gap: 10mm;
          padding-top: 8mm;
          border-top: 0.3mm solid currentColor;
          font-size: 10pt;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
      `;
      document.head.appendChild(style);

      // 3. Build container
      const container = document.createElement('div');
      container.className = 'pdf-export-container';

      // ── Apply paper tone & texture so colors/textures render in PDF ──
      const paperTone = state.paperTone || 'cream';
      const paperTexture = state.paperTexture || 'grain';
      container.setAttribute('data-paper-tone', paperTone);
      container.setAttribute('data-paper-texture', paperTexture);

      // 4. Optional Cover
      if (includeCover) {
        const coverWrapper = document.createElement('div');
        coverWrapper.className = 'pdf-export-sheet';
        coverWrapper.appendChild(createPrintCover(notebook));
        container.appendChild(coverWrapper);
      }

      // 5. Render every page
      const pages = notebook.pages || [];
      pages.forEach((page, index) => {
        const sheetWrapper = document.createElement('div');
        sheetWrapper.className = 'pdf-export-sheet';

        const casing = document.createElement('div');
        casing.className = 'book-spread-casing mode-1-page focus-left';
        // Paper tone & texture attributes on casing too (CSS selectors use [data-paper-tone])
        casing.setAttribute('data-paper-tone', paperTone);
        casing.setAttribute('data-paper-texture', paperTexture);

        const sheet = document.createElement('article');
        sheet.className = 'book-page-sheet book-page-left';

        renderSheetContent(sheet, JSON.parse(JSON.stringify(page)), index + 1, true, null);

        // Make inputs readonly and contenteditables non-editable
        sheet.querySelectorAll('[contenteditable]').forEach(el => el.setAttribute('contenteditable', 'false'));
        sheet.querySelectorAll('input').forEach(input => input.setAttribute('readonly', 'readonly'));

        casing.appendChild(sheet);
        sheetWrapper.appendChild(casing);
        container.appendChild(sheetWrapper);
      });

      document.body.appendChild(container);

      // 6. Signal readiness after fonts are loaded
      document.fonts.ready.then(() => {
        setTimeout(() => {
          window.__PDF_READY__ = true;
        }, 500);
      });
    } catch (err) {
      console.error('PDF export render error:', err);
      window.__PDF_ERROR__ = err.message;
    }
  };

  tryRender();
  return true;
}

