/**
 * Dot Grid Notebook Template Layout & Event Handlers
 */

import { ROYAL_CORNERS_SVG, EDGE_NOTCHES_HTML, renderSignatureSeal } from './ornaments.js';
import { formatContentToHtml } from '../editor/sanitizer.js';
import { getActiveNotebook } from '../state/store.js';

function escapeHTML(str) {
  if (str == null) return '';
  return String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

function escapeAttr(str) {
  return escapeHTML(str);
}

export function renderDotGridLayout(sheetEl, page, pageNum, isLeft, attachListeners) {
  const activeNotebook = getActiveNotebook();

  sheetEl.innerHTML = `
    <div class="a4-template-sheet dotgrid-template-sheet">
      <div class="punch-margin-line"></div>
      ${EDGE_NOTCHES_HTML}
      ${ROYAL_CORNERS_SVG}

      <div class="functional-header">
        <div class="header-top-meta">
          <div class="header-purpose-badge"><span>⬡</span> DOT GRID</div>
          ${renderSignatureSeal(activeNotebook && activeNotebook.author, 'CREATIVE SPACE')}
        </div>
        <div class="header-main-field">
          <span class="field-label">SUBJECT / TOPIC:</span>
          <input type="text" class="field-underline-input topic-input" value="${escapeAttr(page.topic || page.title || '')}" />
        </div>
        <div class="header-sub-fields">
          <div class="sub-field-group">
            <span style="font-weight: 700;">DATE:</span>
            <input type="text" class="sub-field-input date-input" value="${escapeAttr(page.date || '')}" style="width: 80px;" />
          </div>
          <div class="sub-field-group">
            <span style="font-weight: 700;">NO.</span>
            <input type="text" class="sub-field-input no-input" value="${escapeAttr(page.no || String(pageNum).padStart(2, '0'))}" style="width: 45px;" />
          </div>
        </div>
      </div>

      <div class="dotgrid-full-canvas">
        <div contenteditable="true" class="template-writing-area dotgrid-canvas-text">${formatContentToHtml(page.content || '')}</div>
      </div>

      <div class="scholar-footer">
        <span class="footer-left-tag">DOT GRID</span>
        <div class="footer-page-box">
          <span>PAGE</span>
          <span class="footer-page-line">${pageNum}</span>
        </div>
      </div>
    </div>
  `;

  if (typeof attachListeners === 'function') {
    attachListeners(sheetEl, page);
  }
}
