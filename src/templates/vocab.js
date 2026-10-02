/**
 * Language Vocabulary Learning Template Layout & Event Handlers
 *
 * 3-column layout designed for language learners:
 * - Word/Phrase column (target language)
 * - Meaning & Pronunciation column
 * - Example Sentence column (with context usage)
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

export function renderVocabLayout(sheetEl, page, pageNum, isLeft, attachListeners) {
  const activeNotebook = getActiveNotebook();
  const langLabel = (page.lang || 'EN').toUpperCase();

  sheetEl.innerHTML = `
    <div class="a4-template-sheet vocab-template-sheet">
      <div class="punch-margin-line"></div>
      ${EDGE_NOTCHES_HTML}
      ${ROYAL_CORNERS_SVG}

      <div class="functional-header">
        <div class="header-top-meta">
          <div class="header-purpose-badge"><span>🗣️</span> VOCABULARY · ${escapeHTML(langLabel)}</div>
          ${renderSignatureSeal(activeNotebook && activeNotebook.author, 'LANGUAGE LAB')}
        </div>
        <div class="header-main-field">
          <span class="field-label">TOPIC / THEME:</span>
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

      <div class="vocab-container">
        <div class="vocab-body-split">
          <div class="vocab-word-col">
            <div class="col-guide-bar"><span class="section-guide-badge">WORD / PHRASE</span></div>
            <div contenteditable="true" class="template-writing-area vocab-word-text">${formatContentToHtml(page.vocabWord || '')}</div>
          </div>
          <div class="vocab-meaning-col">
            <div class="col-guide-bar"><span class="section-guide-badge">MEANING · PRONUNCIATION</span></div>
            <div contenteditable="true" class="template-writing-area vocab-meaning-text">${formatContentToHtml(page.vocabMeaning || '')}</div>
          </div>
          <div class="vocab-example-col">
            <div class="col-guide-bar"><span class="section-guide-badge">EXAMPLE SENTENCE</span></div>
            <div contenteditable="true" class="template-writing-area vocab-example-text">${formatContentToHtml(page.vocabExample || page.content || '')}</div>
          </div>
        </div>
        <div class="vocab-review-area">
          <div class="col-guide-bar"><span class="section-guide-badge">REVIEW NOTES · MEMORY TIPS</span></div>
          <div contenteditable="true" class="template-writing-area vocab-review-text">${formatContentToHtml(page.vocabReview || '')}</div>
        </div>
      </div>

      <div class="scholar-footer">
        <span class="footer-left-tag">VOCABULARY · ${escapeHTML(langLabel)}</span>
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
