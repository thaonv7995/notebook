/**
 * Book Reader Component
 *
 * Controls 1-page & 2-page open book spread, 3D flip animation,
 * desk zoom scaling, silk focus ribbon, page transitions, and templates binding.
 */

import { getState, setState, persistState, getActiveNotebook, scheduleSave, cancelPendingSave, isSavePending, extractTemplateDataFromSheet } from '../state/store.js';
import { getEls } from '../utils/dom.js';
import { renderSheetContent, renderEmptyRightPagePlaceholder, createNotebookPage } from '../templates/index.js';
import { applyFontFamily, applyFontSize, applyLineHeight, setLastActiveEditable, setLastActiveTextarea } from '../editor/formatter.js';
import { placeCaretAtStart } from '../editor/caret.js';
import { wrapHanziInElement } from '../editor/hanzi-aligner.js';
import { attachImageHandlersToSheet } from '../editor/image-manager.js';
import { showStatus, showToast, openDeleteNotebookModal, showPromptModal, showConfirmModal, showAlertModal } from './modal.js';
import { renderLibraryGrid, deleteBook } from './library.js';
import { playPaperFlipSound, isSoundEnabled, toggleSound } from '../utils/audio.js';

let lastTypingTimestamp = 0;

export function recordUserTyping() {
  lastTypingTimestamp = Date.now();
}

export function isUserActivelyEditing() {
  const active = document.activeElement;
  if (active) {
    if (active.isContentEditable) return true;
    const tag = active.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
    if (active.closest && (active.closest('.template-writing-area') || active.closest('.book-page-sheet'))) {
      return true;
    }
  }
  if (Date.now() - lastTypingTimestamp < 2500) {
    return true;
  }
  if (isSavePending()) {
    return true;
  }
  return false;
}

/**
 * Maps template key to the CSS selector of its main writing area
 */
function getMainTextSelector(template) {
  const map = {
    cornell: '.cornell-notes-text',
    work: '.work-notes-text',
    ruled: '.ruled-canvas-text',
    dotgrid: '.dotgrid-canvas-text',
    grid: '.grid-canvas-text',
    blank: '.blank-canvas-text',
    quadrant: '.quadrant-q1-text',
    vocab: '.vocab-word-text',
    charting: '.charting-col1-text',
    reading: '.reading-ideas-text'
  };
  return map[template] || '.ruled-canvas-text';
}

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
    input.addEventListener('keydown', () => {
      recordUserTyping();
    });
    input.addEventListener('input', () => {
      recordUserTyping();
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
    editable.addEventListener('keydown', () => {
      recordUserTyping();
    });
    editable.addEventListener('input', () => {
      recordUserTyping();
      setLastActiveEditable(editable);
      wrapHanziInElement(editable);
      extractTemplateDataFromSheet(sheetEl, page);
      showStatus('Chưa lưu', 'dirty');
      scheduleSave(() => saveActivePages());
    });
  });

  // Attach screenshot paste, drag-and-drop, and floating toolbar for images
  attachImageHandlersToSheet(sheetEl, () => {
    extractTemplateDataFromSheet(sheetEl, page);
    showStatus('Chưa lưu', 'dirty');
    scheduleSave(() => saveActivePages());
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

  // Signature Seal Cartouche - Click to personalize author / handle
  sheetEl.querySelectorAll('.signature-seal-cartouche').forEach(seal => {
    seal.setAttribute('title', 'Bấm để đổi tên tác giả / @handle (ví dụ: @thaonv)');
    seal.addEventListener('click', async (e) => {
      e.stopPropagation();
      const nb = getActiveNotebook();
      const currentAuthor = (nb && nb.author) || '@thaonv';
      const promptVal = (currentAuthor === 'Cá nhân' || currentAuthor === 'Notebook Studio') ? '@thaonv' : currentAuthor;
      const newAuthor = await showPromptModal(
        'Cá nhân hoá Sổ tay',
        'Nhập tên hiển thị hoặc handle cá nhân của bạn (ví dụ: @thaonv):',
        promptVal
      );
      if (newAuthor !== null) {
        const trimmed = newAuthor.trim();
        if (trimmed) {
          const formatted = (/^[a-zA-Z0-9._-]+$/.test(trimmed) && !trimmed.startsWith('@'))
            ? `@${trimmed}`
            : trimmed;
          if (nb) {
            nb.author = formatted;
            nb.updatedAt = new Date().toISOString();
            persistState();
            renderBookPages();
            showToast(`Đã cập nhật tác giả: ${formatted}`, 'success');
          }
        }
      }
    });
  });
}

export function saveActivePages() {
  cancelPendingSave();
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
  applyPaperTone(state.paperTone || 'cream', false);
  applyPaperTexture(state.paperTexture || 'grain', false);

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
        const selector = getMainTextSelector(newPage.template);
        placeCaretAtStart(els.rightPageSheet.querySelector(selector));
      });
    }
  }
  setFocusedPageSide(focusedPageSide);

  if (els.pageNavDrawer && els.pageNavDrawer.classList.contains('is-open')) {
    renderPageDrawerList(els.pageDrawerSearch ? els.pageDrawerSearch.value : '');
  }
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function applyPaperTone(tone, persistPreference = true) {
  const els = getEls();
  const validTones = ['cream', 'white', 'ivory', 'aged', 'mint', 'rose', 'lavender'];
  const safeTone = validTones.includes(tone) ? tone : 'cream';
  if (persistPreference) setState({ paperTone: safeTone });
  if (els.notebookView) {
    els.notebookView.setAttribute('data-paper-tone', safeTone);
  }
  if (els.bookSpreadCasing) {
    els.bookSpreadCasing.setAttribute('data-paper-tone', safeTone);
  }
  if (els.readerToneSelect) {
    els.readerToneSelect.value = safeTone;
  }
  document.querySelectorAll('.fs-tone-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tone === safeTone);
  });
  if (persistPreference) persistState();
}

export function applyPaperTexture(texture, persistPreference = true) {
  const els = getEls();
  const validTextures = ['grain', 'smooth', 'kraft', 'linen', 'washi', 'vellum'];
  const safeTexture = validTextures.includes(texture) ? texture : 'grain';
  if (persistPreference) setState({ paperTexture: safeTexture });
  if (els.notebookView) {
    els.notebookView.setAttribute('data-paper-texture', safeTexture);
  }
  if (els.bookSpreadCasing) {
    els.bookSpreadCasing.setAttribute('data-paper-texture', safeTexture);
  }
  if (els.readerTextureSelect) {
    els.readerTextureSelect.value = safeTexture;
  }
  document.querySelectorAll('.fs-texture-pill').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.texture === safeTexture);
  });
  if (persistPreference) persistState();
}

export function openPageDrawer() {
  const els = getEls();
  if (!els.pageNavDrawer) return;
  renderPageDrawerList(els.pageDrawerSearch ? els.pageDrawerSearch.value : '');
  els.pageNavDrawer.hidden = false;
  els.pageNavDrawer.removeAttribute('hidden');
  if (els.pageNavBackdrop) {
    els.pageNavBackdrop.hidden = false;
    els.pageNavBackdrop.removeAttribute('hidden');
  }
  void els.pageNavDrawer.offsetWidth;
  els.pageNavDrawer.classList.add('is-open');
  if (els.pageNavBackdrop) els.pageNavBackdrop.classList.add('is-open');
  if (els.pageDrawerSearch) {
    setTimeout(() => els.pageDrawerSearch.focus(), 60);
  }
}

export function closePageDrawer() {
  const els = getEls();
  if (!els.pageNavDrawer) return;
  els.pageNavDrawer.classList.remove('is-open');
  if (els.pageNavBackdrop) els.pageNavBackdrop.classList.remove('is-open');
  setTimeout(() => {
    if (!els.pageNavDrawer.classList.contains('is-open')) {
      els.pageNavDrawer.hidden = true;
      els.pageNavDrawer.setAttribute('hidden', '');
      if (els.pageNavBackdrop) {
        els.pageNavBackdrop.hidden = true;
        els.pageNavBackdrop.setAttribute('hidden', '');
      }
    }
  }, 240);
}

export function togglePageDrawer() {
  const els = getEls();
  if (!els.pageNavDrawer) return;
  if (els.pageNavDrawer.classList.contains('is-open')) {
    closePageDrawer();
  } else {
    openPageDrawer();
  }
}

function getPageSnippet(page) {
  if (!page) return '';
  const raw = page.notes || page.content || page.summary || page.cues || page.discussions || page.agenda || page.vocabWord || '';
  if (!raw) return '';
  const text = String(raw).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > 70 ? text.slice(0, 70) + '…' : text;
}

export function renderPageDrawerList(filter = '') {
  const els = getEls();
  if (!els.pageDrawerList) return;
  const nb = getActiveNotebook();
  if (!nb || !Array.isArray(nb.pages)) return;

  const state = getState();
  const currentIdx = state.activePageIndex || 0;
  const query = filter.trim().toLowerCase();

  if (els.pageDrawerCount) {
    els.pageDrawerCount.textContent = `${nb.pages.length} trang`;
  }

  els.pageDrawerList.innerHTML = '';

  const filteredPages = nb.pages.map((p, idx) => ({ page: p, originalIndex: idx }))
    .filter(({ page, originalIndex }) => {
      if (!query) return true;
      const topic = (page.topic || '').toLowerCase();
      const title = (page.title || '').toLowerCase();
      const content = (page.content || '').replace(/<[^>]+>/g, '').toLowerCase();
      const numStr = String(originalIndex + 1);
      return topic.includes(query) || title.includes(query) || content.includes(query) || numStr.includes(query);
    });

  if (filteredPages.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'page-nav-empty';
    empty.textContent = 'Không tìm thấy trang nào phù hợp';
    els.pageDrawerList.appendChild(empty);
    return;
  }

  filteredPages.forEach(({ page, originalIndex }) => {
    const item = document.createElement('div');
    item.className = 'page-nav-item' + (originalIndex === currentIdx ? ' is-active' : '');
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');

    const displayTitle = page.topic || page.title || `Trang ${originalIndex + 1}`;
    const snippet = getPageSnippet(page);
    const templateNames = {
      cornell: 'Cornell',
      work: 'Work',
      ruled: 'Kẻ Ngang',
      vocab: 'Từ Vựng',
      charting: 'So Sánh',
      reading: 'Đọc Sách',
      dotgrid: 'Chấm Lưới',
      grid: 'Ô Vuông',
      blank: 'Tự Do',
      quadrant: 'Eisenhower'
    };
    const tplName = templateNames[page.template] || 'Cornell';
    const tplClass = `tpl-${page.template || 'ruled'}`;
    const dateStr = page.date ? ` • ${page.date}` : '';

    item.innerHTML = `
      <div class="page-nav-item-num">P.${originalIndex + 1}</div>
      <div class="page-nav-item-body">
        <div class="page-nav-item-title">${escapeHTML(displayTitle)}</div>
        ${snippet ? `<div class="page-nav-item-snippet">${escapeHTML(snippet)}</div>` : ''}
        <div class="page-nav-item-meta">
          <span class="page-nav-badge ${tplClass}">${tplName}</span>
          ${page.status ? `<span class="page-nav-badge">${escapeHTML(page.status)}</span>` : ''}
          <span>${escapeHTML(dateStr)}</span>
        </div>
      </div>
      <div class="page-nav-item-actions">
        <button class="btn-page-action btn-page-dup" type="button" data-idx="${originalIndex}" title="Nhân bản trang này" aria-label="Nhân bản trang">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        </button>
        <button class="btn-page-action btn-page-del" type="button" data-idx="${originalIndex}" title="Xóa trang này" aria-label="Xóa trang">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    `;

    item.addEventListener('click', (e) => {
      if (e.target.closest('.page-nav-item-actions')) return;
      jumpToPage(originalIndex + 1);
      closePageDrawer();
    });

    const btnDup = item.querySelector('.btn-page-dup');
    if (btnDup) {
      btnDup.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        duplicatePageByIndex(originalIndex);
      });
    }

    const btnDel = item.querySelector('.btn-page-del');
    if (btnDel) {
      btnDel.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        deletePageByIndex(originalIndex);
      });
    }

    els.pageDrawerList.appendChild(item);
  });
}

export function duplicatePageByIndex(idx) {
  saveActivePages();
  const nb = getActiveNotebook();
  if (!nb || !Array.isArray(nb.pages) || !nb.pages[idx]) return;

  const targetPage = nb.pages[idx];
  const now = new Date().toISOString();
  const clone = JSON.parse(JSON.stringify(targetPage));
  clone.id = 'p-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
  clone.updatedAt = now;
  if (clone.topic) clone.topic = `${clone.topic} (Bản sao)`;
  else if (clone.title) clone.title = `${clone.title} (Bản sao)`;

  nb.pages.splice(idx + 1, 0, clone);
  nb.updatedAt = now;
  persistState();

  renderBookPages();
  const els = getEls();
  renderPageDrawerList(els.pageDrawerSearch ? els.pageDrawerSearch.value : '');
  showToast(`Đã nhân bản Trang ${idx + 1}.`);
}

export async function deletePageByIndex(idx) {
  saveActivePages();
  const nb = getActiveNotebook();
  if (!nb || !Array.isArray(nb.pages) || !nb.pages[idx]) return;

  if (nb.pages.length <= 1) {
    await showAlertModal('Không thể xóa', 'Cuốn sổ phải có ít nhất 1 trang ghi chép.');
    return;
  }

  const state = getState();
  const pageNum = idx + 1;
  const pageTitle = nb.pages[idx].topic || nb.pages[idx].title || `Trang ${pageNum}`;
  const confirmed = await showConfirmModal(
    'Xóa trang',
    `Bạn có chắc chắn muốn xóa <strong>Trang ${pageNum} (${escapeHTML(pageTitle)})</strong> khỏi cuốn sổ <strong>"${escapeHTML(nb.title)}"</strong>?`,
    { confirmText: 'Xóa trang', danger: true }
  );

  if (confirmed) {
    const [removed] = nb.pages.splice(idx, 1);
    if (!Array.isArray(nb.deletedPageIds)) nb.deletedPageIds = [];
    if (removed && removed.id) {
      nb.deletedPageIds.push(removed.id);
      if (nb.deletedPageIds.length > 200) {
        nb.deletedPageIds = nb.deletedPageIds.slice(-200);
      }
    }

    let curIdx = state.activePageIndex || 0;
    if (curIdx >= nb.pages.length) {
      curIdx = Math.max(0, nb.pages.length - 1);
    }
    setState({ activePageIndex: curIdx });
    nb.lastPageIndex = curIdx;
    nb.updatedAt = new Date().toISOString();
    persistState();

    renderBookPages();
    const els = getEls();
    renderPageDrawerList(els.pageDrawerSearch ? els.pageDrawerSearch.value : '');
    showToast(`Đã xóa Trang ${pageNum}.`);
  }
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
  playPaperFlipSound();

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
  playPaperFlipSound();

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
  playPaperFlipSound();
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
  } else if (oldTemplate === 'vocab') {
    latestBody = curPage.vocabExample || curPage.content || '';
    latestSide = curPage.vocabWord || '';
    latestSummary = curPage.vocabReview || '';
  } else if (oldTemplate === 'charting') {
    latestBody = (curPage.chartData && curPage.chartData.col1) || curPage.content || '';
    latestSide = (curPage.chartData && curPage.chartData.col2) || '';
    latestSummary = curPage.summary || '';
  } else if (oldTemplate === 'reading') {
    latestBody = curPage.notes || curPage.content || '';
    latestSide = curPage.cues || '';
    latestSummary = curPage.summary || '';
  } else if (oldTemplate === 'quadrant') {
    latestBody = (curPage.quadrants && curPage.quadrants.q1) || curPage.content || '';
    latestSide = (curPage.quadrants && curPage.quadrants.q2) || '';
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
  } else if (templateKey === 'vocab') {
    curPage.vocabWord = curPage.vocabWord || latestSide || '';
    curPage.vocabMeaning = curPage.vocabMeaning || '';
    curPage.vocabExample = latestBody;
    curPage.vocabReview = curPage.vocabReview || latestSummary || '';
    curPage.content = latestBody;
  } else if (templateKey === 'charting') {
    if (!curPage.chartData) curPage.chartData = { col1: '', col2: '', col3: '' };
    curPage.chartData.col1 = curPage.chartData.col1 || latestBody;
    curPage.chartData.col2 = curPage.chartData.col2 || latestSide;
    curPage.summary = curPage.summary || latestSummary || '';
    curPage.content = latestBody;
  } else if (templateKey === 'reading') {
    curPage.cues = curPage.cues || latestSide || '';
    curPage.notes = latestBody;
    curPage.summary = curPage.summary || latestSummary || '';
    curPage.content = latestBody;
  } else if (templateKey === 'quadrant') {
    if (!curPage.quadrants) curPage.quadrants = { q1: '', q2: '', q3: '', q4: '' };
    curPage.quadrants.q1 = curPage.quadrants.q1 || latestBody;
    curPage.quadrants.q2 = curPage.quadrants.q2 || latestSide;
    curPage.content = latestBody;
  } else {
    curPage.content = latestBody;
    if (!['dotgrid', 'grid', 'blank', 'ruled'].includes(templateKey)) {
      templateKey = 'ruled';
    }
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

/**
 * Returns active reader page context (notebook, page, sheet element, template)
 */
export function getActivePageInfo() {
  const nb = getActiveNotebook();
  if (!nb || !nb.pages) return null;
  const els = getEls();
  const state = getState();
  const isRightTarget = currentPageMode === '2-page' && focusedPageSide === 'right' && nb.pages[state.activePageIndex + 1];
  const targetIdx = isRightTarget ? state.activePageIndex + 1 : state.activePageIndex;
  const targetSheet = isRightTarget ? els.rightPageSheet : els.leftPageSheet;
  const curPage = nb.pages[targetIdx];
  return {
    notebook: nb,
    page: curPage,
    targetIdx,
    targetSheet,
    template: curPage ? curPage.template : 'ruled',
  };
}

/**
 * Applies AI structured autofill data directly into the active page's template fields.
 *
 * @param {Object} parsedJson - Structured template data generated by AI
 * @returns {boolean} True if successfully applied
 */
export function applyAiAutofillToCurrentPage(parsedJson) {
  const pageInfo = getActivePageInfo();
  if (!pageInfo || !pageInfo.page || !parsedJson) return false;

  const { notebook: nb, page, targetSheet } = pageInfo;
  const template = page.template || 'ruled';

  // Save any pre-existing input state first
  if (targetSheet) {
    extractTemplateDataFromSheet(targetSheet, page);
  }

  // Update Topic / Title
  if (parsedJson.topic) {
    page.topic = parsedJson.topic;
    page.title = parsedJson.topic;
    if (page.project !== undefined) page.project = parsedJson.topic;
  }

  // Apply template-specific fields
  if (template === 'vocab') {
    if (parsedJson.vocabWord) page.vocabWord = parsedJson.vocabWord;
    if (parsedJson.vocabMeaning) page.vocabMeaning = parsedJson.vocabMeaning;
    if (parsedJson.vocabExample) {
      page.vocabExample = parsedJson.vocabExample;
      page.content = parsedJson.vocabExample;
    }
    if (parsedJson.vocabReview) page.vocabReview = parsedJson.vocabReview;
  } else if (template === 'quadrant') {
    if (parsedJson.quadrants) {
      page.quadrants = {
        q1: parsedJson.quadrants.q1 || '',
        q2: parsedJson.quadrants.q2 || '',
        q3: parsedJson.quadrants.q3 || '',
        q4: parsedJson.quadrants.q4 || ''
      };
      page.content = [page.quadrants.q1, page.quadrants.q2, page.quadrants.q3, page.quadrants.q4].filter(Boolean).join('\n');
    }
  } else if (template === 'work') {
    if (parsedJson.agenda) page.agenda = parsedJson.agenda;
    if (parsedJson.discussions) {
      page.discussions = parsedJson.discussions;
      page.content = parsedJson.discussions;
    }
    if (Array.isArray(parsedJson.actions)) {
      page.actions = parsedJson.actions.map(a => ({
        checked: Boolean(a.checked),
        text: String(a.text || '')
      }));
    }
  } else if (template === 'cornell') {
    if (parsedJson.cues) page.cues = parsedJson.cues;
    if (parsedJson.notes) {
      page.notes = parsedJson.notes;
      page.content = parsedJson.notes;
    }
    if (parsedJson.summary) page.summary = parsedJson.summary;
  } else if (template === 'reading') {
    if (parsedJson.cues) page.cues = parsedJson.cues;
    if (parsedJson.notes) {
      page.notes = parsedJson.notes;
      page.content = parsedJson.notes;
    }
    if (parsedJson.summary) page.summary = parsedJson.summary;
  } else if (template === 'charting') {
    if (parsedJson.chartData) {
      page.chartData = {
        col1: parsedJson.chartData.col1 || '',
        col2: parsedJson.chartData.col2 || '',
        col3: parsedJson.chartData.col3 || ''
      };
    }
    if (parsedJson.summary) {
      page.summary = parsedJson.summary;
      page.content = parsedJson.summary;
    }
  } else {
    // ruled, dotgrid, grid, blank
    const content = parsedJson.content || parsedJson.result || '';
    if (content) page.content = content;
  }

  page.updatedAt = new Date().toISOString();
  nb.updatedAt = page.updatedAt;
  persistState();
  renderBookPages();
  showStatus('✨ Đã điền AI vào toàn bộ trang', 'saved');
  return true;
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
    const [removedPage] = nb.pages.splice(state.activePageIndex, 1);
    if (!Array.isArray(nb.deletedPageIds)) nb.deletedPageIds = [];
    if (removedPage && removedPage.id) {
      nb.deletedPageIds.push(removedPage.id);
      if (nb.deletedPageIds.length > 200) {
        nb.deletedPageIds = nb.deletedPageIds.slice(-200);
      }
    }
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
  closePageDrawer();
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

  // Sound Toggle
  function updateSoundButtonState() {
    if (!els.btnToggleSound) return;
    const on = isSoundEnabled();
    els.btnToggleSound.classList.toggle('is-muted', !on);
    els.btnToggleSound.setAttribute('title', on ? 'Âm thanh lật trang: Đang bật (Bấm để tắt)' : 'Âm thanh lật trang: Đang tắt (Bấm để bật)');
    els.btnToggleSound.setAttribute('aria-pressed', String(on));
  }
  if (els.btnToggleSound) {
    updateSoundButtonState();
    els.btnToggleSound.addEventListener('click', () => {
      const active = toggleSound();
      updateSoundButtonState();
      showToast(active ? 'Đã bật âm thanh lật trang 🔊' : 'Đã tắt âm thanh 🔇');
    });
  }

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

  // Paper Tone select
  if (els.readerToneSelect) {
    els.readerToneSelect.addEventListener('change', (e) => {
      applyPaperTone(e.target.value);
    });
  }

  // Paper Texture select
  if (els.readerTextureSelect) {
    els.readerTextureSelect.addEventListener('change', (e) => {
      applyPaperTexture(e.target.value);
    });
  }

  // Page Drawer toggles and search
  if (els.btnTogglePageDrawer) {
    els.btnTogglePageDrawer.addEventListener('click', togglePageDrawer);
  }
  if (els.btnClosePageDrawer) {
    els.btnClosePageDrawer.addEventListener('click', closePageDrawer);
  }
  if (els.pageNavBackdrop) {
    els.pageNavBackdrop.addEventListener('click', closePageDrawer);
  }
  if (els.pageDrawerSearch) {
    els.pageDrawerSearch.addEventListener('input', (e) => {
      renderPageDrawerList(e.target.value);
    });
  }
  if (els.btnDrawerAddPage) {
    els.btnDrawerAddPage.addEventListener('click', () => {
      addPageToCurrentBook();
      renderPageDrawerList(els.pageDrawerSearch ? els.pageDrawerSearch.value : '');
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

