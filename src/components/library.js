/**
 * Digital Library Component (Tủ Sách / Danh Sách Cuốn Sổ)
 */

import { getState, persistState } from '../state/store.js';
import { getEls } from '../utils/dom.js';
import { showToast, openNewNotebookModal, showPromptModal, openDeleteNotebookModal, openEditCoverModal } from './modal.js';

let searchQuery = '';
let categoryFilter = 'all';
let onOpenNotebookCallback = null;
let onCopyLinkCallback = null;
let activeOpenCardMenuId = null;

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

export function closeAllCardMenus() {
  document.querySelectorAll('.book-card-menu').forEach(m => m.hidden = true);
  document.querySelectorAll('.btn-book-card-more').forEach(b => b.classList.remove('is-active'));
  document.querySelectorAll('.book-card.has-open-menu').forEach(c => c.classList.remove('has-open-menu'));
  activeOpenCardMenuId = null;
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
          <!-- Pin Button -->
          <button class="book-card-pin ${nb.isPinned ? 'is-pinned' : ''}" type="button" data-id="${escapeAttr(nb.id)}" title="${nb.isPinned ? 'Bỏ ghim cuốn sổ này' : 'Ghim cuốn sổ này lên đầu'}" aria-label="Ghim sổ">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="${nb.isPinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="17" x2="12" y2="22"></line>
              <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path>
            </svg>
          </button>

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
            
            <!-- 3-Dots Action Menu -->
            <div class="book-card-menu-wrapper">
              <button class="btn-book-card-more" type="button" data-id="${escapeAttr(nb.id)}" title="Tùy chọn cuốn sổ" aria-haspopup="true">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <circle cx="12" cy="5" r="1.75"/>
                  <circle cx="12" cy="12" r="1.75"/>
                  <circle cx="12" cy="19" r="1.75"/>
                </svg>
              </button>
              <div class="book-card-menu" id="menu-${escapeAttr(nb.id)}" hidden>
                <button type="button" class="book-menu-item" data-action="rename" data-id="${escapeAttr(nb.id)}">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  <span>Đổi tên sổ</span>
                </button>
                <button type="button" class="book-menu-item" data-action="cover" data-id="${escapeAttr(nb.id)}">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
                  <span>Đổi màu bìa</span>
                </button>
                <button type="button" class="book-menu-item" data-action="duplicate" data-id="${escapeAttr(nb.id)}">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  <span>Nhân bản sổ</span>
                </button>
                <button type="button" class="book-menu-item" data-action="pin" data-id="${escapeAttr(nb.id)}">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="${nb.isPinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>
                  <span>${nb.isPinned ? 'Bỏ ghim' : 'Ghim lên đầu'}</span>
                </button>
                <div class="menu-divider-line"></div>
                <button type="button" class="book-menu-item book-menu-item--danger" data-action="delete" data-id="${escapeAttr(nb.id)}">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  <span>Xóa cuốn sổ</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach card click handlers
  els.booksGrid.querySelectorAll('.book-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Ignore clicks on pin button or more menu
      if (e.target.closest('.book-card-pin') || e.target.closest('.book-card-menu-wrapper')) {
        return;
      }
      const id = card.dataset.id;
      if (id && onOpenNotebookCallback) onOpenNotebookCallback(id);
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if (e.target.closest('.book-card-pin') || e.target.closest('.book-card-menu-wrapper')) return;
        e.preventDefault();
        if (onOpenNotebookCallback) onOpenNotebookCallback(card.dataset.id);
      }
    });
  });

  // Attach Pin Button handlers
  els.booksGrid.querySelectorAll('.book-card-pin').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.dataset.id;
      if (id) togglePin(id);
    });
  });

  // Attach 3-Dots Menu Button handlers
  els.booksGrid.querySelectorAll('.btn-book-card-more').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.dataset.id;
      const menu = document.getElementById(`menu-${id}`);
      if (!menu) return;
      const isOpen = !menu.hidden;
      closeAllCardMenus();
      if (!isOpen) {
        menu.hidden = false;
        btn.classList.add('is-active');
        const card = btn.closest('.book-card');
        if (card) card.classList.add('has-open-menu');
        activeOpenCardMenuId = id;
      }
    });
  });

  // Attach Menu Item Actions
  els.booksGrid.querySelectorAll('.book-menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const action = item.dataset.action;
      const id = item.dataset.id;
      closeAllCardMenus();

      if (action === 'rename') {
        renameBook(id);
      } else if (action === 'cover') {
        changeBookCover(id);
      } else if (action === 'duplicate') {
        duplicateBook(id);
      } else if (action === 'pin') {
        togglePin(id);
      } else if (action === 'delete') {
        const state = getState();
        const nb = state.notebooks.find(n => n.id === id);
        if (nb) {
          openDeleteNotebookModal(nb, () => deleteBook(id));
        }
      }
    });
  });
}

// Global click outside to close book card menus
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.book-card-menu-wrapper')) {
      closeAllCardMenus();
    }
  });
}

export async function renameBook(id) {
  const state = getState();
  const nb = state.notebooks.find(n => n.id === id);
  if (!nb) return;
  const newTitle = await showPromptModal('Đổi tên cuốn sổ', 'Nhập tên mới cho cuốn sổ:', nb.title);
  if (newTitle != null && newTitle.trim()) {
    nb.title = newTitle.trim();
    nb.updatedAt = new Date().toISOString();
    persistState();
    renderLibraryGrid();
    showToast(`Đã đổi tên thành “${nb.title}”.`);
  }
}

export function changeBookCover(id) {
  const state = getState();
  const nb = state.notebooks.find(n => n.id === id);
  if (!nb) return;
  openEditCoverModal(nb, (newGradient) => {
    nb.coverGradient = newGradient;
    nb.updatedAt = new Date().toISOString();
    persistState();
    renderLibraryGrid();
    showToast(`Đã cập nhật màu bìa cuốn sổ “${nb.title}”.`);
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
  showToast(nb.isPinned ? `Đã ghim “${nb.title}” lên đầu danh sách.` : `Đã bỏ ghim “${nb.title}”.`);
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
