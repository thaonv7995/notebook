/**
 * Templates Dispatcher & Page Lifecycle Factory
 */

import { renderCornellLayout } from './cornell.js';
import { renderWorkLayout } from './work.js';
import { renderRuledLayout } from './ruled.js';
import { createUniqueId } from '../state/store.js';

export { renderCornellLayout, renderWorkLayout, renderRuledLayout };

export function renderSheetContent(sheetEl, page, pageNum, isLeft, attachListeners) {
  if (!sheetEl || !page) return;
  const template = page.template || 'cornell';

  if (template === 'cornell') {
    renderCornellLayout(sheetEl, page, pageNum, isLeft, attachListeners);
  } else if (template === 'work') {
    renderWorkLayout(sheetEl, page, pageNum, isLeft, attachListeners);
  } else {
    renderRuledLayout(sheetEl, page, pageNum, isLeft, attachListeners);
  }
}

export function createNotebookPage(notebook, template = 'cornell', lang = 'VI') {
  const pageNumber = (notebook.pages ? notebook.pages.length : 0) + 1;
  return {
    id: createUniqueId('p'),
    lang,
    title: `TRANG ${pageNumber}`,
    topic: `${notebook.title} - Trang ${pageNumber}`,
    date: new Date().toLocaleDateString('vi-VN'),
    no: String(pageNumber).padStart(2, '0'),
    template: ['cornell', 'work', 'ruled'].includes(template) ? template : 'cornell',
    updatedAt: new Date().toISOString(),
    content: ''
  };
}

export function renderEmptyRightPagePlaceholder(containerEl, notebook, onAddPage) {
  if (!containerEl) return;
  const nextNumber = ((notebook && notebook.pages) ? notebook.pages.length : 0) + 1;
  containerEl.innerHTML = `
    <div class="empty-right-page" role="status">
      <span>Đây là cuối cuốn sổ.</span>
      <button type="button" class="btn-add-right-page">+ Thêm trang ${nextNumber}</button>
    </div>
  `;
  const button = containerEl.querySelector('.btn-add-right-page');
  if (button && typeof onAddPage === 'function') {
    button.addEventListener('click', onAddPage);
  }
}
