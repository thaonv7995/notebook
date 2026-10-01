/**
 * Reading Notes / Book Review Template Layout & Event Handlers
 *
 * Structured layout for reading comprehension & book review:
 * - Book/Article info header
 * - Key Ideas & Takeaways column
 * - Quotes & Highlights column
 * - Summary & Personal Reflection area
 */

import { ROYAL_CORNERS_SVG, EDGE_NOTCHES_HTML } from './ornaments.js';
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

export function renderReadingLayout(sheetEl, page, pageNum, isLeft, attachListeners) {
  const activeNotebook = getActiveNotebook();
  const authorName = (activeNotebook && activeNotebook.author) || 'Cá nhân';

  sheetEl.innerHTML = `
    <div class="a4-template-sheet reading-template-sheet">
      <div class="punch-margin-line"></div>
      ${EDGE_NOTCHES_HTML}
      ${ROYAL_CORNERS_SVG}

      <div class="functional-header">
        <div class="header-top-meta">
          <div class="header-purpose-badge"><span>📖</span> READING NOTES</div>
          <div class="signature-seal-cartouche">
            <span class="seal-user-handle">${escapeHTML(authorName)}</span>
            <span class="seal-user-sub">BOOK ARCHIVE</span>
          </div>
        </div>
        <div class="header-main-field">
          <span class="field-label">BOOK / ARTICLE:</span>
          <input type="text" class="field-underline-input topic-input" value="${escapeAttr(page.topic || page.title || '')}" />
        </div>
        <div class="header-sub-fields">
          <div class="sub-field-group">
            <span style="font-weight: 700;">DATE:</span>
            <input type="text" class="sub-field-input date-input" value="${escapeAttr(page.date || '')}" style="width: 80px;" />
          </div>
          <div class="sub-field-group">
            <span style="font-weight: 700;">CH.</span>
            <input type="text" class="sub-field-input no-input" value="${escapeAttr(page.no || String(pageNum).padStart(2, '0'))}" style="width: 45px;" />
          </div>
        </div>
      </div>

      <div class="reading-container">
        <div class="reading-body-split">
          <div class="reading-ideas-col">
            <div class="col-guide-bar"><span class="section-guide-badge">KEY IDEAS & TAKEAWAYS</span></div>
            <div contenteditable="true" class="template-writing-area reading-ideas-text">${formatContentToHtml(page.cues || '')}</div>
          </div>
          <div class="reading-quotes-col">
            <div class="col-guide-bar"><span class="section-guide-badge">QUOTES & HIGHLIGHTS</span></div>
            <div contenteditable="true" class="template-writing-area reading-quotes-text">${formatContentToHtml(page.notes || page.content || '')}</div>
          </div>
        </div>
        <div class="reading-summary-area">
          <div class="col-guide-bar"><span class="section-guide-badge">SUMMARY & PERSONAL REFLECTION</span></div>
          <div contenteditable="true" class="template-writing-area reading-summary-text">${formatContentToHtml(page.summary || '')}</div>
        </div>
      </div>

      <div class="scholar-footer">
        <span class="footer-left-tag">READING NOTES</span>
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
