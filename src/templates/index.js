/**
 * Templates Dispatcher & Page Lifecycle Factory
 *
 * 10 specialized notebook page templates:
 * - cornell:    Cornell Note-Taking System (cues, notes, summary)
 * - work:       Work & Project Log (agenda, notes, action items)
 * - ruled:      General Ruled Notebook (lined writing area)
 * - vocab:      Language Vocabulary Learning (word, meaning, example)
 * - charting:   Charting/Comparison Method (3 columns + analysis)
 * - reading:    Reading Notes & Book Review (ideas, quotes, reflection)
 * - dotgrid:    Dot Grid (creative/sketching)
 * - grid:       Square Grid (math/diagrams)
 * - blank:      Blank/Freeform (no background)
 * - eisenhower: Eisenhower Priority Matrix (4 zones: do/schedule/delegate/eliminate)
 */

import { renderCornellLayout } from './cornell.js';
import { renderWorkLayout } from './work.js';
import { renderRuledLayout } from './ruled.js';
import { renderVocabLayout } from './vocab.js';
import { renderChartingLayout } from './charting.js';
import { renderReadingLayout } from './reading.js';
import { renderDotGridLayout } from './dotgrid.js';
import { renderGridLayout } from './grid.js';
import { renderBlankLayout } from './blank.js';
import { renderEisenhowerLayout } from './quadrant.js';
import { createUniqueId } from '../state/store.js';

export {
  renderCornellLayout, renderWorkLayout, renderRuledLayout,
  renderVocabLayout, renderChartingLayout, renderReadingLayout,
  renderDotGridLayout, renderGridLayout, renderBlankLayout,
  renderEisenhowerLayout
};

/**
 * All valid template keys for validation
 */
export const VALID_TEMPLATES = [
  'cornell', 'work', 'ruled',
  'vocab', 'charting', 'reading',
  'dotgrid', 'grid', 'blank',
  'quadrant' // eisenhower uses 'quadrant' key for backward compat
];

export function renderSheetContent(sheetEl, page, pageNum, isLeft, attachListeners) {
  if (!sheetEl || !page) return;
  const template = page.template || 'cornell';

  switch (template) {
    case 'cornell':   renderCornellLayout(sheetEl, page, pageNum, isLeft, attachListeners); break;
    case 'work':      renderWorkLayout(sheetEl, page, pageNum, isLeft, attachListeners); break;
    case 'vocab':     renderVocabLayout(sheetEl, page, pageNum, isLeft, attachListeners); break;
    case 'charting':  renderChartingLayout(sheetEl, page, pageNum, isLeft, attachListeners); break;
    case 'reading':   renderReadingLayout(sheetEl, page, pageNum, isLeft, attachListeners); break;
    case 'dotgrid':   renderDotGridLayout(sheetEl, page, pageNum, isLeft, attachListeners); break;
    case 'grid':      renderGridLayout(sheetEl, page, pageNum, isLeft, attachListeners); break;
    case 'blank':     renderBlankLayout(sheetEl, page, pageNum, isLeft, attachListeners); break;
    case 'quadrant':  renderEisenhowerLayout(sheetEl, page, pageNum, isLeft, attachListeners); break;
    default:          renderRuledLayout(sheetEl, page, pageNum, isLeft, attachListeners); break;
  }
}

export function createNotebookPage(notebook, template = 'cornell', lang = 'VI') {
  const pageNumber = (notebook.pages ? notebook.pages.length : 0) + 1;
  return {
    id: createUniqueId('p'),
    lang,
    title: '',
    topic: '',
    date: new Date().toLocaleDateString('vi-VN'),
    no: String(pageNumber).padStart(2, '0'),
    template: VALID_TEMPLATES.includes(template) ? template : 'cornell',
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
