/**
 * Book Reader Component
 *
 * Controls 1-page & 2-page open book spread, 3D flip animation,
 * desk zoom scaling, silk focus ribbon, page transitions, and templates binding.
 */

import { getState, setState, persistState, getActiveNotebook, scheduleSave, extractTemplateDataFromSheet } from '../state/store.js';
import { getEls } from '../utils/dom.js';
import { renderSheetContent, renderEmptyRightPagePlaceholder, createNotebookPage } from '../templates/index.js';
import { applyFontFamily, applyFontSize, applyLineHeight, setLastActiveEditable, setLastActiveTextarea } from '../editor/formatter.js';
import { placeCaretAtStart } from '../editor/caret.js';
import { wrapHanziInElement } from '../editor/hanzi-aligner.js';
import { showStatus, showToast, openDeleteNotebookModal, showPromptModal, showConfirmModal, showAlertModal } from './modal.js';
import { renderLibraryGrid, deleteBook } from './library.js';

let currentPageMode = '2-page';
let focusedPageSide = 'left';
let isTurningPage = false;
let wasCompactViewport = window.innerWidth <= 900;
let onUrlUpdateCallback = null;
let onFullscreenUpdateCallback = null;

export function setReaderCallbacks({ onUrlUpdate, onFullscreenUpdate }) {
  if (onUrlUpdate) onUrlUpdateCallback = onUrlUpdate;
  if (onFullscreenUpdate) onFullscreenUpdateCallback = onFullscreenUpdate;
}

export function getCurrentPageMode() {
  return currentPageMode;
}

export function getFocusedPageSide() {
  return focusedPageSide;
}

export function setFocusedPageSide(side) {
  const els = getEls();
  if (currentPageMode === '1-page') side = 'left';
  focusedPageSide = (side === 'right') ? 'right' : 'left';

  if (els.bookSpreadCasing) {
    els.bookSpreadCasing.classList.remove('focus-left', 'focus-right');
    els.bookSpreadCasing.classList.add(`focus-${focusedPageSide}`);
  }

  if (els.bookFocusRibbon) {
    els.bookFocusRibbon.classList.remove('focus-left', 'focus-right');
    els.bookFocusRibbon.classList.add(`focus-${focusedPageSide}`);
    const state = getState();
    const curIdx = state.activePageIndex;
    const leftPageNum = curIdx + 1;
    const rightPageNum = curIdx + 2;
    const curPageNum = (focusedPageSide === 'left') ? leftPageNum : rightPageNum;
    const otherPageNum = (focusedPageSide === 'left') ? rightPageNum : leftPageNum;
    els.bookFocusRibbon.setAttribute(
      'title',
      currentPageMode === '2-page'
        ? `Trang đang viết: Trang ${curPageNum} • Bấm để chuyển sang Trang ${otherPageNum}`
        : `Trang đang viết: Trang ${leftPageNum}`
    );
  }

  const nb = getActiveNotebook();
  if (nb && els.readerTemplateSelect) {
    const state = getState();
    const curIdx = state.activePageIndex;
    const activeSheet = (focusedPageSide === 'right' && currentPageMode === '2-page' && nb.pages[curIdx + 1])
      ? nb.pages[curIdx + 1]
      : nb.pages[curIdx];
    if (activeSheet) {
      els.readerTemplateSelect.value = activeSheet.template || 'cornell';
    }
  }

  if (onFullscreenUpdateCallback) {
    onFullscreenUpdateCallback();
  }
}

export function attachTemplateInputListeners(sheetEl, page) {
  if (!sheetEl || !page) return;
  const els = getEls();
  const sheetSide = (sheetEl === els.rightPageSheet || sheetEl.id === 'rightPageSheet' || sheetEl.classList.contains('book-page-right')) ? 'right' : 'left';

  // Listen to all inputs (topic, date, deadline, no, etc.)
  sheetEl.querySelectorAll('input').forEach(input => {
    input.addEventListener('focus', () => {
      setLastActiveTextarea(input);
      setFocusedPageSide(sheetSide);
    });
    input.addEventListener('click', () => {
      setLastActiveTextarea(input);
      setFocusedPageSide(sheetSide);
    });
    input.addEventListener('input', () => {
      extractTemplateDataFromSheet(sheetEl, page);
      showStatus('Chưa lưu', 'dirty');
      scheduleSave(() => saveActivePages());
    });
  });

  // Listen to all contenteditable writing areas
  sheetEl.querySelectorAll('.template-writing-area[contenteditable="true"]').forEach(editable => {
    editable.addEventListener('focus', () => {
      setLastActiveEditable(editable);
      setFocusedPageSide(sheetSide);
    });
    editable.addEventListener('click', () => {
      setLastActiveEditable(editable);
      setFocusedPageSide(sheetSide);
    });
    editable.addEventListener('input', () => {
      setLastActiveEditable(editable);
      wrapHanziInElement(editable);
      extractTemplateDataFromSheet(sheetEl, page);
      showStatus('Chưa lưu', 'dirty');
      scheduleSave(() => saveActivePages());
    });
  });

  // Action checkboxes for Work Template
  sheetEl.querySelectorAll('.action-check-square').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setFocusedPageSide(sheetSide);
      btn.classList.toggle('checked');
      const row = btn.closest('.action-row');
      if (row) {
        const input = row.querySelector('.action-line-input');
        if (input) input.classList.toggle('done-line', btn.classList.contains('checked'));
      }
      extractTemplateDataFromSheet(sheetEl, page);
      showStatus('Chưa lưu', 'dirty');
      scheduleSave(() => saveActivePages());
    });
  });

  // Status pills for Work Template
  sheetEl.querySelectorAll('.status-pill-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setFocusedPageSide(sheetSide);
      const newStatus = btn.dataset.status;
      page.status = newStatus;
      sheetEl.querySelectorAll('.status-pill-btn').forEach(b => {
        b.classList.remove('active-todo', 'active-wip', 'active-done');
      });
      if (newStatus === 'TODO') btn.classList.add('active-todo');
      else if (newStatus === 'WIP') btn.classList.add('active-wip');
      else if (newStatus === 'DONE') btn.classList.add('active-done');
      showStatus('Chưa lưu', 'dirty');
      scheduleSave(() => saveActivePages());
    });
  });
}

export function saveActivePages() {
  const els = getEls();
  if (els.notebookView && els.notebookView.classList.contains('hidden')) return true;
  const nb = getActiveNotebook();
  if (!nb) return false;
  const state = getState();
  const curIdx = state.activePageIndex;
  showStatus('Đang lưu', 'loading');

  // Save left page
  if (nb.pages[curIdx]) {
    const leftPage = nb.pages[curIdx];
    extractTemplateDataFromSheet(els.leftPageSheet, leftPage);
    leftPage.updatedAt = new Date().toISOString();
  }

  // Save right page if in 2-page mode
  if (currentPageMode === '2-page' && nb.pages[curIdx + 1]) {
    const rightPage = nb.pages[curIdx + 1];
    extractTemplateDataFromSheet(els.rightPageSheet, rightPage);
    rightPage.updatedAt = new Date().toISOString();
  }

  nb.lastPageIndex = curIdx;
  nb.updatedAt = new Date().toISOString();
  const saved = persistState();
  if (saved) {
    setTimeout(() => {
      showStatus('Đã lưu tự động', 'saved');
    }, 120);
  }
  return saved;
}

export function renderBookPages() {
  const els = getEls();
  const nb = getActiveNotebook();
  if (!nb) {
    returnToLibrary();
    return;
  }
  const totalPages = nb.pages.length;
  (nb.pages || []).forEach(p => {
    if (p.textBoxes) delete p.textBoxes;
  });
  const state = getState();
  let curIdx = state.activePageIndex;

  if (curIdx >= totalPages) curIdx = Math.max(0, totalPages - 1);
  if (curIdx < 0) curIdx = 0;
  setState({ activePageIndex: curIdx });
  nb.lastPageIndex = curIdx;

  if (els.notebookView && !els.notebookView.classList.contains('hidden') && onUrlUpdateCallback) {
    onUrlUpdateCallback({ bookId: nb.id, pageIndex: curIdx }, true);
  }

  const leftPage = nb.pages[curIdx] || { title: '', lang: 'VI', content: '', template: 'cornell' };
  const rightPage = nb.pages[curIdx + 1] || null;

  if (els.openBookTitle) {
    els.openBookTitle.textContent = nb.title;
  }
  if (els.readerPageInput) {
    els.readerPageInput.value = `${curIdx + 1}`;
  }
  if (els.readerTotalPages) {
    els.readerTotalPages.textContent = `/ ${totalPages}`;
  }

  if (els.btnPrevPage) els.btnPrevPage.disabled = curIdx <= 0;
  if (els.btnNextPage) {
    const step = currentPageMode === '2-page' ? 2 : 1;
    els.btnNextPage.disabled = curIdx + step >= totalPages;
  }

  if (onFullscreenUpdateCallback) {
    onFullscreenUpdateCallback();
  }

  const activePageForTemplate = (currentPageMode === '2-page' && focusedPageSide === 'right' && rightPage)
    ? rightPage
    : leftPage;
  if (els.readerTemplateSelect) {
    els.readerTemplateSelect.value = (activePageForTemplate && activePageForTemplate.template) || 'cornell';
  }

  applyFontFamily(nb.fontFamily || state.fontFamily || 'sans');
  applyFontSize(state.fontSize || 16);
  applyLineHeight((nb && nb.lineHeight) || state.lineHeight || '28');

  // Render Left Page Sheet
  renderSheetContent(els.leftPageSheet, leftPage, curIdx + 1, true, attachTemplateInputListeners);

  // Render Right Page Sheet if in 2-page mode
  if (currentPageMode === '2-page') {
    if (rightPage) {
      renderSheetContent(els.rightPageSheet, rightPage, curIdx + 2, false, attachTemplateInputListeners);
    } else {
      renderEmptyRightPagePlaceholder(els.rightPageSheet, nb, () => {
        const newPage = createNotebookPage(nb, leftPage.template || 'cornell', 'VI');
        nb.pages.push(newPage);
        nb.updatedAt = newPage.updatedAt;
        persistState();
        renderBookPages();
        const selector = newPage.template === 'cornell'
          ? '.cornell-notes-text'
          : newPage.template === 'work' ? '.work-notes-text' : '.ruled-canvas-text';
        placeCaretAtStart(els.rightPageSheet.querySelector(selector));
      });
    }
  }
  setFocusedPageSide(focusedPageSide);
}

export function applyPageMode(mode, persistPreference = true) {
  const els = getEls();
  currentPageMode = mode;
  if (persistPreference) setState({ pageMode: mode });
  if (mode === '1-page') {
    els.bookSpreadCasing.classList.add('mode-1-page');
    els.btnMode1Page.classList.add('active');
    els.btnMode2Pages.classList.remove('active');
  } else {
    els.bookSpreadCasing.classList.remove('mode-1-page');
    els.btnMode2Pages.classList.add('active');
    els.btnMode1Page.classList.remove('active');
  }
  if (persistPreference) persistState();
  renderBookPages();
}

export function applyZoom(scale, persistPreference = true) {
  const els = getEls();
  const clampedScale = Math.max(0.3, Math.min(3.5, Math.round(scale * 100) / 100));
  if (persistPreference) setState({ zoomLevel: clampedScale });
  els.bookDeskScaler.style.transform = `scale(${clampedScale})`;
  els.bookDeskScaler.style.transformOrigin = 'top center';

  const casing = els.bookSpreadCasing;
  if (casing) {
    const naturalW = casing.offsetWidth || (currentPageMode === '1-page' ? 688 : 1002);
    const naturalH = casing.offsetHeight || (currentPageMode === '1-page' ? 844 : 704);
    const scaledW = naturalW * clampedScale;
    const scaledH = naturalH * clampedScale;

    if (clampedScale > 1) {
      els.bookDeskScaler.style.marginBottom = `${Math.round(scaledH - naturalH + 40)}px`;
      const extraSide = Math.max(0, Math.round((scaledW - naturalW) / 2));
      els.bookDeskScaler.style.marginLeft = `${extraSide}px`;
      els.bookDeskScaler.style.marginRight = `${extraSide}px`;
    } else {
      els.bookDeskScaler.style.marginBottom = '';
      els.bookDeskScaler.style.marginLeft = '';
      els.bookDeskScaler.style.marginRight = '';
    }
  }

  if (els.readerScaleValue) {
    els.readerScaleValue.textContent = `${Math.round(clampedScale * 100)}%`;
  }
  if (els.fullscreenScaleValue) {
    els.fullscreenScaleValue.textContent = `${Math.round(clampedScale * 100)}%`;
  }
  if (persistPreference) persistState();
}

export function zoomIn() {
  const els = getEls();
  const state = getState();
  const cur = Math.round((state.zoomLevel || 1.0) * 100) / 100;
  const step = cur < 1.0 ? 0.1 : (cur < 2.0 ? 0.15 : 0.25);
  const next = Math.min(3.0, Math.round((cur + step) * 100) / 100);
  if (els.btnFitPage) els.btnFitPage.classList.remove('active');
  if (els.btnFitWidth) els.btnFitWidth.classList.remove('active');
  if (els.btnFullscreenFitPage) els.btnFullscreenFitPage.classList.remove('is-active');
  if (els.btnFullscreenFitWidth) els.btnFullscreenFitWidth.classList.remove('is-active');
  applyZoom(next);
}

export function zoomOut() {
  const els = getEls();
  const state = getState();
  const cur = Math.round((state.zoomLevel || 1.0) * 100) / 100;
  const step = cur <= 1.0 ? 0.1 : (cur <= 2.0 ? 0.15 : 0.25);
  const next = Math.max(0.3, Math.round((cur - step) * 100) / 100);
  if (els.btnFitPage) els.btnFitPage.classList.remove('active');
  if (els.btnFitWidth) els.btnFitWidth.classList.remove('active');
  if (els.btnFullscreenFitPage) els.btnFullscreenFitPage.classList.remove('is-active');
  if (els.btnFullscreenFitWidth) els.btnFullscreenFitWidth.classList.remove('is-active');
  applyZoom(next);
}

export function resetZoom() {
  const els = getEls();
  if (els.btnFitPage) els.btnFitPage.classList.remove('active');
  if (els.btnFitWidth) els.btnFitWidth.classList.remove('active');
  if (els.btnFullscreenFitPage) els.btnFullscreenFitPage.classList.remove('is-active');
  if (els.btnFullscreenFitWidth) els.btnFullscreenFitWidth.classList.remove('is-active');
  applyZoom(1.0);
}

export function turnPageForward() {
  if (isTurningPage) return;
  const nb = getActiveNotebook();
  if (!nb) return;
  const step = currentPageMode === '2-page' ? 2 : 1;
  const state = getState();

  if (state.activePageIndex + step >= nb.pages.length) return;

  saveActivePages();
  isTurningPage = true;

  const els = getEls();
  const targetSheet = currentPageMode === '2-page' ? els.rightPageSheet : els.leftPageSheet;
  targetSheet.classList.add('flip-turn-next');

  setTimeout(() => {
    setState({ activePageIndex: state.activePageIndex + step });
    renderBookPages();
    targetSheet.classList.remove('flip-turn-next');
    isTurningPage = false;
  }, 550);
}

export function turnPageBackward() {
  if (isTurningPage) return;
  const step = currentPageMode === '2-page' ? 2 : 1;
  const state = getState();

  if (state.activePageIndex <= 0) return;

  saveActivePages();
  isTurningPage = true;

  const els = getEls();
  const targetSheet = els.leftPageSheet;
  targetSheet.classList.add('flip-turn-prev');

  setTimeout(() => {
    setState({ activePageIndex: Math.max(0, state.activePageIndex - step) });
    renderBookPages();
    targetSheet.classList.remove('flip-turn-prev');
    isTurningPage = false;
  }, 550);
}

export function jumpToPage(pageNum) {
  const nb = getActiveNotebook();
  if (!nb) return;
  saveActivePages();
  let idx = Math.max(0, Math.min(pageNum - 1, nb.pages.length - 1));
  if (currentPageMode === '2-page') {
    if (idx % 2 === 1) {
      idx = idx - 1;
      focusedPageSide = 'right';
    } else {
      focusedPageSide = 'left';
    }
  }
  setState({ activePageIndex: idx });
  renderBookPages();
  setFocusedPageSide(focusedPageSide);
}

export function addPageToCurrentBook() {
  saveActivePages();
  const nb = getActiveNotebook();
  if (!nb) return;
  const state = getState();
  const curPage = nb.pages[state.activePageIndex] || {};
  const newPage = createNotebookPage(nb, curPage.template || 'cornell', 'VI');

  nb.pages.push(newPage);
  nb.updatedAt = newPage.updatedAt;
  nb.lastPageIndex = nb.pages.length - 1;
  persistState();

  setState({ activePageIndex: nb.pages.length - 1 });
  renderBookPages();
}

export function changePageTemplate(templateKey) {
  const nb = getActiveNotebook();
  if (!nb) return;
  const els = getEls();
  const state = getState();
  const isRightTarget = currentPageMode === '2-page' && focusedPageSide === 'right' && nb.pages[state.activePageIndex + 1];
  const targetIdx = isRightTarget ? state.activePageIndex + 1 : state.activePageIndex;
  const targetSheet = isRightTarget ? els.rightPageSheet : els.leftPageSheet;
  const curPage = nb.pages[targetIdx];
  if (!curPage) return;

  const oldTemplate = curPage.template;
  if (oldTemplate === templateKey) return;

  if (targetSheet) {
    extractTemplateDataFromSheet(targetSheet, curPage);
  }

  let latestBody = '';
  let latestSide = '';
  let latestSummary = '';
  if (oldTemplate === 'cornell') {
    latestBody = curPage.notes || curPage.content || '';
    latestSide = curPage.cues || '';
    latestSummary = curPage.summary || '';
  } else if (oldTemplate === 'work') {
    latestBody = curPage.discussions || curPage.content || '';
    latestSide = curPage.agenda || '';
  } else {
    latestBody = curPage.content || '';
  }

  if (templateKey === 'cornell') {
    curPage.notes = latestBody;
    curPage.content = latestBody;
    curPage.cues = latestSide || curPage.cues || '';
    curPage.summary = latestSummary || curPage.summary || '';
  } else if (templateKey === 'work') {
    curPage.discussions = latestBody;
    curPage.content = latestBody;
    curPage.agenda = latestSide || curPage.agenda || '';
    curPage.actions = Array.isArray(curPage.actions) ? curPage.actions : [
      { checked: false, text: '' },
      { checked: false, text: '' },
      { checked: false, text: '' },
      { checked: false, text: '' },
      { checked: false, text: '' }
    ];
  } else {
    curPage.content = latestBody;
    templateKey = 'ruled';
  }

  curPage.template = templateKey;
  curPage.updatedAt = new Date().toISOString();
  nb.updatedAt = curPage.updatedAt;
  persistState();
  renderBookPages();
  if (els.readerTemplateSelect) {
    els.readerTemplateSelect.value = templateKey;
  }
  if (onFullscreenUpdateCallback) onFullscreenUpdateCallback();
}

export async function renameCurrentNotebook() {
  const nb = getActiveNotebook();
  if (!nb) return;
  const newTitle = await showPromptModal('Đổi tên cuốn sổ', 'Nhập tên mới cho cuốn sổ:', nb.title);
  if (newTitle && newTitle.trim() && newTitle.trim() !== nb.title) {
    nb.title = newTitle.trim();
    nb.updatedAt = new Date().toISOString();
    const els = getEls();
    if (els.openBookTitle) els.openBookTitle.textContent = nb.title;
    const state = getState();
    if (onUrlUpdateCallback) onUrlUpdateCallback({ bookId: nb.id, pageIndex: state.activePageIndex }, true);
    persistState();
    showStatus('Đã đổi tên sổ', 'saved');
  }
}

export async function deleteCurrentPage() {
  const nb = getActiveNotebook();
  if (!nb) return;
  if (nb.pages.length <= 1) {
    await showAlertModal('Không thể xóa', 'Không thể xóa trang duy nhất của cuốn sổ!');
    return;
  }
  const state = getState();
  const pageNum = state.activePageIndex + 1;
  const confirmed = await showConfirmModal(
    'Xóa trang',
    `Bạn có chắc muốn xóa <strong>Trang ${pageNum}</strong> khỏi cuốn sổ <strong>"${nb.title}"</strong>?`,
    { confirmText: 'Xóa trang', danger: true }
  );
  if (confirmed) {
    nb.pages.splice(state.activePageIndex, 1);
    let nextIdx = state.activePageIndex;
    if (nextIdx >= nb.pages.length) {
      nextIdx = Math.max(0, nb.pages.length - 1);
    }
    setState({ activePageIndex: nextIdx });
    nb.lastPageIndex = nextIdx;
    nb.updatedAt = new Date().toISOString();
    persistState();
    renderBookPages();
    showStatus('Đã xóa trang', 'saved');
  }
}

export function handleFitPage() {
  const els = getEls();
  if (els.btnFitPage) els.btnFitPage.classList.add('active');
  if (els.btnFitWidth) els.btnFitWidth.classList.remove('active');
  if (els.btnFullscreenFitPage) els.btnFullscreenFitPage.classList.add('is-active');
  if (els.btnFullscreenFitWidth) els.btnFullscreenFitWidth.classList.remove('is-active');
  const desk = els.openBookWorkspace;
  const casing = els.bookSpreadCasing;
  if (desk && casing) {
    const availH = desk.clientHeight - 40;
    const casingH = casing.offsetHeight || 710;
    const scale = Math.max(0.3, Math.min(3.0, availH / casingH));
    applyZoom(Math.round(scale * 100) / 100);
  } else {
    applyZoom(0.72);
  }
}

export function handleFitWidth() {
  const els = getEls();
  if (els.btnFitWidth) els.btnFitWidth.classList.add('active');
  if (els.btnFitPage) els.btnFitPage.classList.remove('active');
  if (els.btnFullscreenFitWidth) els.btnFullscreenFitWidth.classList.add('is-active');
  if (els.btnFullscreenFitPage) els.btnFullscreenFitPage.classList.remove('is-active');
  const desk = els.openBookWorkspace;
  const casing = els.bookSpreadCasing;
  if (desk && casing) {
    const availW = desk.clientWidth - 40;
    const casingW = casing.offsetWidth || (currentPageMode === '1-page' ? 510 : 1010);
    const scale = Math.max(0.3, Math.min(3.0, availW / casingW));
    applyZoom(Math.round(scale * 100) / 100);
  } else {
    applyZoom(1.0);
  }
}

export function openNotebook(notebookId, targetPageIndex = null, skipUrlUpdate = false) {
  const els = getEls();
  const state = getState();

  if (!notebookId) {
    if (!state.notebooks || state.notebooks.length === 0) {
      return;
    }
    notebookId = state.notebooks[0].id;
  }
  if (!els.notebookView.classList.contains('hidden')) saveActivePages();

  setState({ activeNotebookId: notebookId });
  const notebook = getActiveNotebook();
  if (!notebook) {
    returnToLibrary(skipUrlUpdate);
    return;
  }

  let nextIdx = 0;
  if (typeof targetPageIndex === 'number' && !isNaN(targetPageIndex)) {
    const maxIdx = Math.max(0, (notebook.pages ? notebook.pages.length : 1) - 1);
    nextIdx = Math.max(0, Math.min(targetPageIndex, maxIdx));
  } else {
    nextIdx = notebook.lastPageIndex || 0;
  }
  setState({ activePageIndex: nextIdx });
  notebook.lastPageIndex = nextIdx;
  persistState();

  els.libraryView.classList.add('hidden');
  els.notebookView.classList.remove('hidden');

  const compact = window.innerWidth <= 900;
  wasCompactViewport = compact;
  applyPageMode(compact ? '1-page' : (state.pageMode || '2-page'), !compact);

  if (!skipUrlUpdate && onUrlUpdateCallback) {
    onUrlUpdateCallback({ bookId: notebookId, pageIndex: nextIdx }, false);
  }

  renderBookPages();

  // Default to Fit Page (fit height) after layout is rendered
  requestAnimationFrame(() => {
    handleFitPage();
  });
}

export function returnToLibrary(skipUrlUpdate = false) {
  saveActivePages();
  const els = getEls();
  els.notebookView.classList.add('hidden');
  els.libraryView.classList.remove('hidden');
  renderLibraryGrid();

  if (!skipUrlUpdate && onUrlUpdateCallback) {
    onUrlUpdateCallback(null, false);
  }
}

export function setupReaderListeners({ onCopyBookLink } = {}) {
  const els = getEls();

  // Navigation
  if (els.btnPrevPage) els.btnPrevPage.addEventListener('click', turnPageBackward);
  if (els.btnNextPage) els.btnNextPage.addEventListener('click', turnPageForward);

  const handlePageInputJump = (e) => {
    const nb = getActiveNotebook();
    if (!nb) return;
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1 && val <= nb.pages.length) {
      jumpToPage(val);
    } else {
      const state = getState();
      e.target.value = (state.activePageIndex || 0) + 1;
    }
  };

  if (els.readerPageInput) {
    els.readerPageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handlePageInputJump(e);
    });
    els.readerPageInput.addEventListener('change', handlePageInputJump);
  }

  // Zoom
  if (els.btnZoomIn) els.btnZoomIn.addEventListener('click', zoomIn);
  if (els.btnZoomOut) els.btnZoomOut.addEventListener('click', zoomOut);
  if (els.readerScaleValue) els.readerScaleValue.addEventListener('click', resetZoom);
  if (els.btnFitPage) els.btnFitPage.addEventListener('click', handleFitPage);
  if (els.btnFitWidth) els.btnFitWidth.addEventListener('click', handleFitWidth);

  // Wheel Zoom
  if (els.openBookWorkspace) {
    els.openBookWorkspace.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) zoomIn();
        else zoomOut();
      }
    }, { passive: false });
  }

  // Window Resize
  window.addEventListener('resize', () => {
    const isCompactViewport = window.innerWidth <= 900;
    const state = getState();
    if (!els.notebookView.classList.contains('hidden') && isCompactViewport !== wasCompactViewport) {
      applyPageMode(isCompactViewport ? '1-page' : state.pageMode, false);
      applyZoom(isCompactViewport ? 1 : (state.zoomLevel || 1), false);
      wasCompactViewport = isCompactViewport;
      return;
    }
    wasCompactViewport = isCompactViewport;
    if (isCompactViewport) return;
    if (els.btnFitPage && els.btnFitPage.classList.contains('active')) {
      handleFitPage();
    } else if (els.btnFitWidth && els.btnFitWidth.classList.contains('active')) {
      handleFitWidth();
    }
  });

  // Ribbon focus toggle
  if (els.bookFocusRibbon) {
    els.bookFocusRibbon.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentPageMode === '2-page') {
        const nextSide = (focusedPageSide === 'left') ? 'right' : 'left';
        setFocusedPageSide(nextSide);
        const targetSheet = (nextSide === 'right') ? els.rightPageSheet : els.leftPageSheet;
        if (targetSheet) {
          const editable = targetSheet.querySelector('.template-writing-area[contenteditable="true"]');
          if (editable) editable.focus();
        }
      }
    });
  }

  // Sheet pointerdown focus
  if (els.leftPageSheet) {
    els.leftPageSheet.addEventListener('pointerdown', () => setFocusedPageSide('left'));
  }
  if (els.rightPageSheet) {
    els.rightPageSheet.addEventListener('pointerdown', () => setFocusedPageSide('right'));
  }

  // Mode toggles
  if (els.btnMode1Page) {
    els.btnMode1Page.addEventListener('click', () => {
      applyPageMode('1-page');
      setFocusedPageSide('left');
    });
  }
  if (els.btnMode2Pages) {
    els.btnMode2Pages.addEventListener('click', () => {
      applyPageMode('2-page');
      setFocusedPageSide(focusedPageSide);
    });
  }

  // Template select
  if (els.readerTemplateSelect) {
    els.readerTemplateSelect.addEventListener('change', (e) => {
      changePageTemplate(e.target.value);
    });
  }

  // Add / Delete page
  if (els.btnAddPage) els.btnAddPage.addEventListener('click', addPageToCurrentBook);
  if (els.btnDeleteCurrentPage) els.btnDeleteCurrentPage.addEventListener('click', deleteCurrentPage);

  // Rename, Copy Link & Delete Notebook
  if (els.btnRenameBook) els.btnRenameBook.addEventListener('click', renameCurrentNotebook);
  if (els.btnCopyBookLink) {
    els.btnCopyBookLink.addEventListener('click', () => {
      if (onCopyBookLink) onCopyBookLink();
    });
  }
  if (els.btnDeleteCurrentBook) {
    els.btnDeleteCurrentBook.addEventListener('click', () => {
      const activeBook = getActiveNotebook();
      if (!activeBook) return;
      openDeleteNotebookModal(activeBook, () => {
        deleteBook(activeBook.id, () => {
          returnToLibrary();
        });
      });
    });
  }
  if (els.openBookTitle) els.openBookTitle.addEventListener('click', renameCurrentNotebook);
}

