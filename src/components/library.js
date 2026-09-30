/**
 * Digital Library Component (Tủ Sách / Danh Sách Cuốn Sổ)
 */

import { getState, persistState } from '../state/store.js';
import { getEls } from '../utils/dom.js';
import { showToast, openNewNotebookModal } from './modal.js';

let searchQuery = '';
let categoryFilter = 'all';
let onOpenNotebookCallback = null;
let onCopyLinkCallback = null;

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

export function setLibraryCallbacks({ onOpenNotebook, onCopyLink }) {
  if (onOpenNotebook) onOpenNotebookCallback = onOpenNotebook;
  if (onCopyLink) onCopyLinkCallback = onCopyLink;
}

export function getNotebookSearchText(nb) {
  const pageText = (nb.pages || []).map(page => [
    page.title, page.topic, page.project, page.date, page.deadline, page.status,
    page.cues, page.notes, page.summary, page.agenda, page.discussions, page.content,
    ...(page.actions || []).map(action => action.text)
  ].join(' ')).join(' ');
  return `${nb.title || ''} ${nb.author || ''} ${nb.category || ''} ${pageText}`
    .replace(/<[^>]*>/g, ' ')
    .toLowerCase();
}

export function updateCategoryOptions() {
  const els = getEls();
  if (!els.libCategoryFilter) return;
  const state = getState();
  const categories = [...new Set(state.notebooks.map(nb => (nb.category || 'Ghi chép').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'vi'));
  const selected = categoryFilter;
  els.libCategoryFilter.innerHTML = '<option value="all">Tất cả sổ</option>' + categories
    .map(category => `<option value="${escapeAttr(category)}">${escapeHTML(category)}</option>`)
    .join('');
  els.libCategoryFilter.value = categories.includes(selected) ? selected : 'all';
  categoryFilter = els.libCategoryFilter.value;
}

export function renderLibraryGrid() {
  const els = getEls();
  if (!els.booksGrid) return;
  updateCategoryOptions();

  const state = getState();
  const source = state.notebooks || [];

  let filtered = source.filter(nb => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!getNotebookSearchText(nb).includes(q)) return false;
    }
    if (categoryFilter !== 'all') {
      if ((nb.category || '') !== categoryFilter) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '');
  });

  if (els.libBookCount) {
    els.libBookCount.textContent = `${filtered.length} cuốn sổ`;
  }
  if (els.libSectionTitle) els.libSectionTitle.textContent = 'Tủ Sổ Tay Của Bạn';

  if (filtered.length === 0) {
    els.booksGrid.innerHTML = `
      <div class="lib-empty-state">
        <div class="lib-empty-icon">📓</div>
        <h3 class="lib-empty-title">Chưa có cuốn sổ nào</h3>
        <p class="lib-empty-desc">
          ${searchQuery || categoryFilter !== 'all'
            ? 'Không có cuốn sổ nào khớp với tiêu chí tìm kiếm.' 
            : 'Tủ sổ tay hiện đang trống. Hãy tạo cuốn sổ ghi chép đầu tiên của bạn!'}
        </p>
        <button class="btn-create-empty" id="btnEmptyCreate">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
          <span>Tạo cuốn sổ mới</span>
        </button>
      </div>
    `;
    const btnEmpty = els.booksGrid.querySelector('#btnEmptyCreate');
    if (btnEmpty) {
      btnEmpty.addEventListener('click', () => {
        openNewNotebookModal(categoryFilter !== 'all' ? categoryFilter : 'Học tập');
      });
    }
    return;
  }

  els.booksGrid.innerHTML = filtered.map(nb => {
    const totalPages = Math.max(1, (nb.pages && nb.pages.length) || 1);
    const textColor = nb.coverTextColor || '#ffffff';

    return `
      <div class="book-card" data-id="${escapeAttr(nb.id)}" role="button" tabindex="0">
        <div class="book-cover" style="background: ${nb.coverGradient || 'linear-gradient(135deg, #1e3a8a, #0f172a)'}; color: ${textColor};">
          <div class="cover-header-meta">${escapeHTML(nb.category || 'GHI CHÉP')}</div>
          <div class="cover-main-title" style="font-size: ${nb.title.length > 35 ? '13px' : '15px'};">
            ${escapeHTML(nb.title)}
          </div>
          <div class="cover-footer-meta">
            <span>${escapeHTML(nb.author || 'ARCHIVE')}</span>
            <span>●</span>
          </div>
        </div>
        <div class="book-info">
          <div class="book-title" title="${escapeAttr(nb.title)}">${escapeHTML(nb.title)}</div>
          <div class="book-meta-row">
            <span class="book-page-count">${totalPages} trang</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach card click handlers
  els.booksGrid.querySelectorAll('.book-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      if (id && onOpenNotebookCallback) onOpenNotebookCallback(id);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (onOpenNotebookCallback) onOpenNotebookCallback(card.dataset.id);
      }
    });
  });
}

export function deleteBook(id, onDeletedCallback = null) {
  const state = getState();
  const nbIndex = state.notebooks.findIndex(n => n.id === id);
  if (nbIndex === -1) return;
  const [deletedBook] = state.notebooks.splice(nbIndex, 1);
  if (state.activeNotebookId === id) {
    state.activeNotebookId = state.notebooks.length > 0 ? state.notebooks[0].id : null;
  }
  persistState();
  renderLibraryGrid();
  if (onDeletedCallback) onDeletedCallback();
  showToast(`Đã xóa cuốn sổ “${deletedBook.title}”.`, 'Hoàn tác', () => {
    state.notebooks.splice(nbIndex, 0, deletedBook);
    persistState();
    renderLibraryGrid();
    showToast(`Đã hoàn tác xóa “${deletedBook.title}”.`);
  });
}

export function togglePin(id) {
  const state = getState();
  const nb = state.notebooks.find(n => n.id === id);
  if (!nb) return;
  nb.isPinned = !nb.isPinned;
  nb.updatedAt = new Date().toISOString();
  persistState();
  renderLibraryGrid();
}

export function duplicateBook(id) {
  const state = getState();
  const source = state.notebooks.find(n => n.id === id);
  if (!source) return;
  const now = Date.now();
  const copy = JSON.parse(JSON.stringify(source));
  copy.id = `nb-${now}`;
  const cleanSourceTitle = source.title
    .replace(/\s*•\s*Sổ\s+Kẻ\s+Ngang\s+A4/gi, '')
    .replace(/\s*Sổ\s+Kẻ\s+Ngang\s+A4/gi, '')
    .replace(/\s*—\s*Bản\s+sao/gi, '')
    .trim();
  copy.title = `${cleanSourceTitle || 'Ruled Notebook'} — Bản sao`;
  copy.createdAt = new Date().toISOString();
  copy.updatedAt = copy.createdAt;
  copy.isPinned = false;
  copy.lastPageIndex = 0;
  copy.pages = copy.pages.map((page, index) => ({ ...page, id: `p-${now}-${index + 1}` }));
  state.notebooks.unshift(copy);
  persistState();
  renderLibraryGrid();
  showToast(`Đã nhân bản “${source.title}”.`);
}

export function setSearchQuery(query) {
  searchQuery = query;
  renderLibraryGrid();
}

export function setCategoryFilter(category) {
  categoryFilter = category;
  renderLibraryGrid();
}

export function setupLibraryListeners({ onReturnToLibrary } = {}) {
  const els = getEls();
  if (els.libSearchInput) {
    els.libSearchInput.addEventListener('input', (e) => {
      setSearchQuery(e.target.value.trim());
    });
  }
  if (els.libCategoryFilter) {
    els.libCategoryFilter.addEventListener('change', (e) => {
      setCategoryFilter(e.target.value);
    });
  }
  if (els.libBrandLogo) {
    els.libBrandLogo.addEventListener('click', () => {
      if (onReturnToLibrary) onReturnToLibrary();
    });
  }
  if (els.btnBackToLibrary) {
    els.btnBackToLibrary.addEventListener('click', () => {
      if (onReturnToLibrary) onReturnToLibrary();
    });
  }
}
