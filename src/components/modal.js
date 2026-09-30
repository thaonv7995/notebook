/**
 * Modal Dialogs & Toast Notifications Component
 */

import { getEls } from '../utils/dom.js';
import { getState, persistState } from '../state/store.js';

let toastTimer = null;
let selectedCoverGradient = 'linear-gradient(135deg, #1e3a8a, #0f172a)';

export function showToast(message, actionLabel = '', action = null) {
  const els = getEls();
  if (!els.appToast || !els.appToastText) return;
  clearTimeout(toastTimer);
  els.appToastText.textContent = message;
  els.appToast.hidden = false;
  els.appToast.classList.add('is-visible');
  if (els.appToastAction) {
    els.appToastAction.hidden = !actionLabel;
    els.appToastAction.textContent = actionLabel;
    els.appToastAction.onclick = action ? () => {
      action();
      hideToast();
    } : null;
  }
  toastTimer = setTimeout(hideToast, actionLabel ? 8000 : 4500);
}

export function hideToast() {
  const els = getEls();
  if (!els.appToast) return;
  els.appToast.classList.remove('is-visible');
  setTimeout(() => {
    if (!els.appToast.classList.contains('is-visible')) {
      els.appToast.hidden = true;
    }
  }, 180);
}

export function openNewNotebookModal(defaultCategory = 'Học tập') {
  const els = getEls();
  if (!els.newNotebookModal) return;
  els.newNotebookModal.classList.add('open');
  els.newNotebookModal.setAttribute('aria-hidden', 'false');
  if (els.newNotebookTitle) {
    els.newNotebookTitle.value = '';
    els.newNotebookTitle.focus();
  }
  if (els.newNotebookCategory) {
    els.newNotebookCategory.value = defaultCategory;
  }
}

export function closeNewNotebookModal() {
  const els = getEls();
  if (!els.newNotebookModal) return;
  els.newNotebookModal.classList.remove('open');
  els.newNotebookModal.setAttribute('aria-hidden', 'true');
}

let pendingDeleteAction = null;

export function openDeleteNotebookModal(notebook, onConfirm) {
  const els = getEls();
  if (!els.deleteNotebookModal || !notebook) return;
  pendingDeleteAction = onConfirm;
  if (els.deleteModalBookTitle) {
    els.deleteModalBookTitle.textContent = `“${notebook.title || 'Cuốn sổ'}”`;
  }
  if (els.deleteModalPageCount) {
    els.deleteModalPageCount.textContent = (notebook.pages && notebook.pages.length) || 1;
  }
  els.deleteNotebookModal.classList.add('open');
  els.deleteNotebookModal.setAttribute('aria-hidden', 'false');
  if (els.btnCancelDeleteModal) {
    els.btnCancelDeleteModal.focus();
  }
}

export function closeDeleteNotebookModal() {
  const els = getEls();
  if (!els.deleteNotebookModal) return;
  els.deleteNotebookModal.classList.remove('open');
  els.deleteNotebookModal.setAttribute('aria-hidden', 'true');
  pendingDeleteAction = null;
}

export function showStatus(text, state) {
  const els = getEls();
  if (els.saveStatus) {
    els.saveStatus.setAttribute('data-state', state);
    els.saveStatus.setAttribute('title', text);
  }
  if (els.saveStatusText) {
    els.saveStatusText.textContent = text;
  }
  if (els.fullscreenSaveStatus) {
    els.fullscreenSaveStatus.setAttribute('data-state', state);
    els.fullscreenSaveStatus.setAttribute('title', text);
  }
}

export function setupModalListeners({ onNotebookCreated } = {}) {
  const els = getEls();
  if (els.btnOpenNewBookModal) {
    els.btnOpenNewBookModal.addEventListener('click', () => openNewNotebookModal());
  }
  if (els.btnCloseModal) els.btnCloseModal.addEventListener('click', closeNewNotebookModal);
  if (els.btnCancelModal) els.btnCancelModal.addEventListener('click', closeNewNotebookModal);

  document.querySelectorAll('.cover-color-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.cover-color-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      selectedCoverGradient = opt.dataset.gradient || 'linear-gradient(135deg, #1e3a8a, #0f172a)';
    });
  });

  if (els.btnConfirmNewNotebook) {
    els.btnConfirmNewNotebook.addEventListener('click', () => {
      const title = els.newNotebookTitle ? els.newNotebookTitle.value.trim() : '';
      const finalTitle = title || 'Cuốn Sổ Mới';
      const category = (els.newNotebookCategory ? els.newNotebookCategory.value.trim() : '') || 'Ghi chép';
      const template = (els.newNotebookTemplate && els.newNotebookTemplate.value) || 'cornell';
      const newId = 'nb-' + Date.now();
      const createdAt = new Date().toISOString();
      const newBook = {
        id: newId,
        title: finalTitle,
        author: 'Cá nhân',
        category,
        lang: 'EN · VI',
        coverGradient: selectedCoverGradient,
        coverTextColor: '#ffffff',
        createdAt,
        updatedAt: createdAt,
        lastPageIndex: 0,
        isPinned: false,
        pages: [
          {
            id: 'p-' + Date.now() + '-1',
            lang: 'VI',
            title: '',
            topic: '',
            project: '',
            date: new Date().toLocaleDateString('vi-VN'),
            no: '01',
            deadline: '',
            status: '',
            template: template,
            updatedAt: createdAt,
            content: ''
          },
          {
            id: 'p-' + Date.now() + '-2',
            lang: 'VI',
            title: '',
            topic: '',
            project: '',
            date: new Date().toLocaleDateString('vi-VN'),
            no: '02',
            deadline: '',
            status: '',
            template: template,
            updatedAt: createdAt,
            content: ''
          }
        ]
      };

      const state = getState();
      state.notebooks.unshift(newBook);
      persistState();
      closeNewNotebookModal();
      if (onNotebookCreated) onNotebookCreated(newId);
    });
  }

  if (els.newNotebookModal) {
    els.newNotebookModal.addEventListener('click', (e) => {
      if (e.target === els.newNotebookModal) closeNewNotebookModal();
    });
  }

  // Delete Notebook Modal Listeners
  if (els.btnCloseDeleteModal) els.btnCloseDeleteModal.addEventListener('click', closeDeleteNotebookModal);
  if (els.btnCancelDeleteModal) els.btnCancelDeleteModal.addEventListener('click', closeDeleteNotebookModal);
  if (els.btnConfirmDeleteModal) {
    els.btnConfirmDeleteModal.addEventListener('click', () => {
      const action = pendingDeleteAction;
      closeDeleteNotebookModal();
      if (action) action();
    });
  }
  if (els.deleteNotebookModal) {
    els.deleteNotebookModal.addEventListener('click', (e) => {
      if (e.target === els.deleteNotebookModal) closeDeleteNotebookModal();
    });
  }
}

// =============================================
// Generic Modal Utilities (replaces native alert/confirm/prompt)
// =============================================

function getGenericModalEls() {
  return {
    overlay: document.querySelector('#genericModal'),
    title: document.querySelector('#genericModalTitle'),
    desc: document.querySelector('#genericModalDesc'),
    input: document.querySelector('#genericModalInput'),
    btnCancel: document.querySelector('#btnCancelGenericModal'),
    btnConfirm: document.querySelector('#btnConfirmGenericModal'),
    btnClose: document.querySelector('#btnCloseGenericModal')
  };
}

function closeGenericModal() {
  const m = getGenericModalEls();
  if (!m.overlay) return;
  m.overlay.classList.remove('open');
  m.overlay.setAttribute('aria-hidden', 'true');
}

/**
 * Show a prompt modal (replaces window.prompt).
 * Returns a Promise that resolves with the input string, or null if cancelled.
 */
export function showPromptModal(title, message, defaultValue = '') {
  return new Promise((resolve) => {
    const m = getGenericModalEls();
    if (!m.overlay) { resolve(prompt(message, defaultValue)); return; }

    m.title.textContent = title;
    m.desc.textContent = message;
    m.input.style.display = '';
    m.input.value = defaultValue;
    m.btnCancel.style.display = '';
    m.btnCancel.textContent = 'Hủy bỏ';
    m.btnConfirm.textContent = 'Xác nhận';
    m.btnConfirm.className = 'btn-modal btn-modal--confirm';
    m.overlay.classList.add('open');
    m.overlay.setAttribute('aria-hidden', 'false');

    setTimeout(() => { m.input.focus(); m.input.select(); }, 60);

    function cleanup() {
      m.btnConfirm.removeEventListener('click', onConfirm);
      m.btnCancel.removeEventListener('click', onCancel);
      m.btnClose.removeEventListener('click', onCancel);
      m.overlay.removeEventListener('click', onOverlay);
      m.input.removeEventListener('keydown', onKeydown);
      closeGenericModal();
    }
    function onConfirm() { cleanup(); resolve(m.input.value); }
    function onCancel() { cleanup(); resolve(null); }
    function onOverlay(e) { if (e.target === m.overlay) onCancel(); }
    function onKeydown(e) { if (e.key === 'Enter') { e.preventDefault(); onConfirm(); } }

    m.btnConfirm.addEventListener('click', onConfirm);
    m.btnCancel.addEventListener('click', onCancel);
    m.btnClose.addEventListener('click', onCancel);
    m.overlay.addEventListener('click', onOverlay);
    m.input.addEventListener('keydown', onKeydown);
  });
}

/**
 * Show a confirm modal (replaces window.confirm).
 * Returns a Promise that resolves with true (confirmed) or false (cancelled).
 */
export function showConfirmModal(title, message, { confirmText = 'Xác nhận', danger = false } = {}) {
  return new Promise((resolve) => {
    const m = getGenericModalEls();
    if (!m.overlay) { resolve(confirm(message)); return; }

    m.title.textContent = title;
    m.desc.innerHTML = message;
    m.input.style.display = 'none';
    m.btnCancel.style.display = '';
    m.btnCancel.textContent = 'Hủy bỏ';
    m.btnConfirm.textContent = confirmText;
    m.btnConfirm.className = danger ? 'btn-modal btn-modal--danger' : 'btn-modal btn-modal--confirm';
    m.overlay.classList.add('open');
    m.overlay.setAttribute('aria-hidden', 'false');

    setTimeout(() => m.btnCancel.focus(), 60);

    function cleanup() {
      m.btnConfirm.removeEventListener('click', onConfirm);
      m.btnCancel.removeEventListener('click', onCancel);
      m.btnClose.removeEventListener('click', onCancel);
      m.overlay.removeEventListener('click', onOverlay);
      closeGenericModal();
    }
    function onConfirm() { cleanup(); resolve(true); }
    function onCancel() { cleanup(); resolve(false); }
    function onOverlay(e) { if (e.target === m.overlay) onCancel(); }

    m.btnConfirm.addEventListener('click', onConfirm);
    m.btnCancel.addEventListener('click', onCancel);
    m.btnClose.addEventListener('click', onCancel);
    m.overlay.addEventListener('click', onOverlay);
  });
}

/**
 * Show an alert modal (replaces window.alert).
 * Returns a Promise that resolves when dismissed.
 */
export function showAlertModal(title, message) {
  return new Promise((resolve) => {
    const m = getGenericModalEls();
    if (!m.overlay) { alert(message); resolve(); return; }

    m.title.textContent = title;
    m.desc.textContent = message;
    m.input.style.display = 'none';
    m.btnCancel.style.display = 'none';
    m.btnConfirm.textContent = 'Đã hiểu';
    m.btnConfirm.className = 'btn-modal btn-modal--confirm';
    m.overlay.classList.add('open');
    m.overlay.setAttribute('aria-hidden', 'false');

    setTimeout(() => m.btnConfirm.focus(), 60);

    function cleanup() {
      m.btnConfirm.removeEventListener('click', onDismiss);
      m.btnClose.removeEventListener('click', onDismiss);
      m.overlay.removeEventListener('click', onOverlay);
      closeGenericModal();
    }
    function onDismiss() { cleanup(); resolve(); }
    function onOverlay(e) { if (e.target === m.overlay) onDismiss(); }

    m.btnConfirm.addEventListener('click', onDismiss);
    m.btnClose.addEventListener('click', onDismiss);
    m.overlay.addEventListener('click', onOverlay);
  });
}
