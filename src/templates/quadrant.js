/**
 * Eisenhower Matrix (Priority Quadrant) Template Layout & Event Handlers
 *
 * 4-Zone layout with meaningful labels for task prioritization:
 * - Zone 1: DO (Urgent + Important)
 * - Zone 2: SCHEDULE (Not Urgent + Important)
 * - Zone 3: DELEGATE (Urgent + Not Important)
 * - Zone 4: ELIMINATE (Not Urgent + Not Important)
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

export function renderEisenhowerLayout(sheetEl, page, pageNum, isLeft, attachListeners) {
  const activeNotebook = getActiveNotebook();
  const authorName = (activeNotebook && activeNotebook.author) || 'Cá nhân';

  // Parse quadrant data from page content or initialize empty
  const q = page.quadrants || { q1: '', q2: '', q3: '', q4: '' };

  sheetEl.innerHTML = `
    <div class="a4-template-sheet eisenhower-template-sheet">
      <div class="punch-margin-line"></div>
      ${EDGE_NOTCHES_HTML}
      ${ROYAL_CORNERS_SVG}

      <div class="functional-header">
        <div class="header-top-meta">
          <div class="header-purpose-badge"><span>⚡</span> EISENHOWER MATRIX</div>
          <div class="signature-seal-cartouche">
            <span class="seal-user-handle">${escapeHTML(authorName)}</span>
            <span class="seal-user-sub">PRIORITY PLANNER</span>
          </div>
        </div>
        <div class="header-main-field">
          <span class="field-label">GOAL / CONTEXT:</span>
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

      <div class="quadrant-container eisenhower-container">
        <div class="eisenhower-axis-labels">
          <span class="axis-label axis-urgent">← URGENT</span>
          <span class="axis-label axis-not-urgent">NOT URGENT →</span>
        </div>
        <div class="quadrant-row">
          <div class="quadrant-cell quadrant-tl eisenhower-do">
            <div class="col-guide-bar eisenhower-bar do-bar"><span class="section-guide-badge eisenhower-badge do-badge">🔴 DO FIRST — Urgent & Important</span></div>
            <div contenteditable="true" class="template-writing-area quadrant-text quadrant-q1-text">${formatContentToHtml(q.q1 || '')}</div>
          </div>
          <div class="quadrant-cell quadrant-tr eisenhower-schedule">
            <div class="col-guide-bar eisenhower-bar schedule-bar"><span class="section-guide-badge eisenhower-badge schedule-badge">🟡 SCHEDULE — Important, Not Urgent</span></div>
            <div contenteditable="true" class="template-writing-area quadrant-text quadrant-q2-text">${formatContentToHtml(q.q2 || '')}</div>
          </div>
        </div>
        <div class="quadrant-row">
          <div class="quadrant-cell quadrant-bl eisenhower-delegate">
            <div class="col-guide-bar eisenhower-bar delegate-bar"><span class="section-guide-badge eisenhower-badge delegate-badge">🟠 DELEGATE — Urgent, Not Important</span></div>
            <div contenteditable="true" class="template-writing-area quadrant-text quadrant-q3-text">${formatContentToHtml(q.q3 || '')}</div>
          </div>
          <div class="quadrant-cell quadrant-br eisenhower-eliminate">
            <div class="col-guide-bar eisenhower-bar eliminate-bar"><span class="section-guide-badge eisenhower-badge eliminate-badge">⚪ ELIMINATE — Not Urgent, Not Important</span></div>
            <div contenteditable="true" class="template-writing-area quadrant-text quadrant-q4-text">${formatContentToHtml(q.q4 || '')}</div>
          </div>
        </div>
      </div>

      <div class="scholar-footer">
        <span class="footer-left-tag">EISENHOWER MATRIX</span>
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
