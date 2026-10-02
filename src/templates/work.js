/**
 * Work Notes Template Layout & Event Handlers
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

export function renderWorkLayout(sheetEl, page, pageNum, isLeft, attachListeners) {
  const activeNotebook = getActiveNotebook();

  const storedActions = Array.isArray(page.actions) ? page.actions : [];
  const actions = storedActions.slice(0, 5).map(action => ({
    checked: Boolean(action && action.checked),
    text: String((action && action.text) || '')
  }));
  while (actions.length < 5) actions.push({ checked: false, text: '' });

  const actionRowsHtml = actions.map((act, idx) => `
    <div class="action-row" data-idx="${idx}">
      <button type="button" class="action-check-square ${act.checked ? 'checked' : ''}" data-idx="${idx}" title="Đánh dấu hoàn thành"></button>
      ${idx === 0 ? '<span class="section-guide-badge" style="position: static; margin-right: 4px;">ACTION ITEMS & NEXT STEPS</span>' : ''}
      <input type="text" class="action-line-input ${act.checked ? 'done-line' : ''}" data-idx="${idx}" value="${escapeAttr(act.text || '')}" />
    </div>
  `).join('');

  sheetEl.innerHTML = `
    <div class="a4-template-sheet work-template-sheet">
      <div class="punch-margin-line"></div>
      ${EDGE_NOTCHES_HTML}
      ${ROYAL_CORNERS_SVG}

      <div class="functional-header">
        <div class="header-top-meta">
          <div class="header-purpose-badge"><span>💼</span> WORK & PROJECT</div>
          ${renderSignatureSeal(activeNotebook && activeNotebook.author, 'WORK ARCHIVE')}
        </div>
        <div class="header-main-field">
          <span class="field-label">PROJECT / OBJECTIVE:</span>
          <input type="text" class="field-underline-input project-input" value="${escapeAttr(page.project || page.topic || page.title || '')}" />
        </div>
        <div class="header-sub-fields">
          <div class="sub-field-group">
            <span style="font-weight: 700;">DATE:</span>
            <input type="text" class="sub-field-input date-input" value="${escapeAttr(page.date || '')}" style="width: 75px;" />
            <span style="font-weight: 700; margin-left: 6px;">DEADLINE:</span>
            <input type="text" class="sub-field-input deadline-input" value="${escapeAttr(page.deadline || '')}" style="width: 75px;" />
          </div>
          <div class="sub-field-group">
            <span style="font-weight: 700;">STATUS:</span>
            <div class="status-pills">
              <button type="button" class="status-pill-btn ${page.status === 'TODO' ? 'active-todo' : ''}" data-status="TODO">[ ] TODO</button>
              <button type="button" class="status-pill-btn ${page.status === 'WIP' || !page.status ? 'active-wip' : ''}" data-status="WIP">[ ] WIP</button>
              <button type="button" class="status-pill-btn ${page.status === 'DONE' ? 'active-done' : ''}" data-status="DONE">[✓] DONE</button>
            </div>
          </div>
        </div>
      </div>

      <div class="work-container">
        <div class="work-body-split">
          <div class="work-side-col">
            <div class="col-guide-bar"><span class="section-guide-badge">AGENDA & DECISIONS</span></div>
            <div contenteditable="true" class="template-writing-area work-agenda-text">${formatContentToHtml(page.agenda || '')}</div>
          </div>
          <div class="work-notes-col">
            <div class="col-guide-bar"><span class="section-guide-badge">NOTES & DISCUSSIONS</span></div>
            <div contenteditable="true" class="template-writing-area work-notes-text">${formatContentToHtml(page.discussions || page.content || '')}</div>
          </div>
        </div>
        <div class="work-action-area">
          ${actionRowsHtml}
        </div>
      </div>

      <div class="scholar-footer">
        <span class="footer-left-tag">WORK & PROJECT LOG</span>
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
