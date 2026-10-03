/**
 * Image Insertion, Compression & Scrapbook Formatting Engine
 *
 * Supports:
 * - Direct pasting of screenshots (Ctrl+V / Cmd+V)
 * - Drag-and-drop image files from desktop
 * - Toolbar file picker insertion
 * - Automatic client-side canvas downscaling (keeps localStorage/sync light)
 * - Interactive floating toolbar (Align: Left/Center/Right, Size: 35%/65%/100%, Delete)
 */

import { showToast } from '../components/modal.js';

let activeSelectedFigure = null;
let imageToolbarEl = null;

/**
 * Compresses and scales an image file using an offscreen canvas
 * @param {File|Blob} file
 * @param {number} maxDimension
 * @param {number} quality
 * @returns {Promise<string>} Data URL
 */
export async function compressAndProcessImageFile(file, maxDimension = 1200, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Tệp không phải định dạng hình ảnh hợp lệ'));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Retain PNG format if small with potential alpha, otherwise compress to JPEG
        const isPng = file.type === 'image/png' && file.size < 600 * 1024;
        const mimeType = isPng ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Không thể tải dữ liệu ảnh'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Lỗi khi đọc file ảnh'));
    reader.readAsDataURL(file);
  });
}

/**
 * Inserts an image card into the active contenteditable area at cursor position
 * @param {HTMLElement} editable
 * @param {string} dataUrl
 * @param {string} altText
 * @returns {HTMLElement|null}
 */
export function insertImageCardIntoEditable(editable, dataUrl, altText = 'Ảnh đính kèm') {
  if (!editable) return null;
  editable.focus();

  const figure = document.createElement('figure');
  figure.className = 'notebook-image-card img-align-center img-size-md';
  figure.setAttribute('data-align', 'center');
  figure.setAttribute('data-size', 'md');
  figure.setAttribute('contenteditable', 'false');

  const frame = document.createElement('div');
  frame.className = 'notebook-image-frame';

  const img = document.createElement('img');
  img.className = 'notebook-embedded-img';
  img.src = dataUrl;
  img.alt = altText;
  img.setAttribute('loading', 'lazy');
  img.setAttribute('draggable', 'false');

  frame.appendChild(img);
  figure.appendChild(frame);

  const caption = document.createElement('figcaption');
  caption.className = 'notebook-image-caption';
  caption.setAttribute('contenteditable', 'true');
  caption.setAttribute('placeholder', 'Thêm chú thích ảnh...');
  figure.appendChild(caption);

  // Position at current selection or append to end
  const sel = window.getSelection();
  let inserted = false;
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    if (editable.contains(range.commonAncestorContainer)) {
      range.deleteContents();
      range.insertNode(figure);

      // Add a trailing newline/div so typing can seamlessly continue below the image
      const trailingDiv = document.createElement('div');
      trailingDiv.innerHTML = '<br>';
      figure.after(trailingDiv);

      // Move caret to trailing div
      const newRange = document.createRange();
      newRange.setStart(trailingDiv, 0);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      inserted = true;
    }
  }

  if (!inserted) {
    editable.appendChild(figure);
    const trailingDiv = document.createElement('div');
    trailingDiv.innerHTML = '<br>';
    editable.appendChild(trailingDiv);
  }

  editable.dispatchEvent(new Event('input', { bubbles: true }));

  // Automatically select the newly inserted image to show alignment/size toolbar
  setTimeout(() => {
    showImageToolbar(figure);
  }, 100);

  return figure;
}

/**
 * Initializes and lazily constructs the floating Image Toolbar singleton
 */
function ensureImageToolbar() {
  if (imageToolbarEl) return imageToolbarEl;

  imageToolbarEl = document.createElement('div');
  imageToolbarEl.id = 'imageActionToolbar';
  imageToolbarEl.className = 'image-action-toolbar';
  imageToolbarEl.setAttribute('role', 'toolbar');
  imageToolbarEl.setAttribute('aria-label', 'Công cụ ảnh');
  imageToolbarEl.hidden = true;

  imageToolbarEl.innerHTML = `
    <div class="img-tool-group" title="Căn lề ảnh">
      <button type="button" class="img-tool-btn" data-action="align-left" title="Căn trái">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="6" x2="3" y2="6"/><line x1="15" y1="12" x2="3" y2="12"/><line x1="17" y1="18" x2="3" y2="18"/></svg>
      </button>
      <button type="button" class="img-tool-btn is-active" data-action="align-center" title="Căn giữa">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="6" x2="3" y2="6"/><line x1="19" y1="12" x2="5" y2="12"/><line x1="21" y1="18" x2="3" y2="18"/></svg>
      </button>
      <button type="button" class="img-tool-btn" data-action="align-right" title="Căn phải">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="9" y2="12"/><line x1="21" y1="18" x2="7" y2="18"/></svg>
      </button>
    </div>
    <div class="img-tool-divider"></div>
    <div class="img-tool-group" title="Kích cỡ ảnh">
      <button type="button" class="img-tool-btn img-tool-btn--text" data-action="size-sm" title="Nhỏ (35%)">S</button>
      <button type="button" class="img-tool-btn img-tool-btn--text is-active" data-action="size-md" title="Vừa (65%)">M</button>
      <button type="button" class="img-tool-btn img-tool-btn--text" data-action="size-full" title="Toàn trang (100%)">L</button>
    </div>
    <div class="img-tool-divider"></div>
    <div class="img-tool-group">
      <button type="button" class="img-tool-btn img-tool-btn--danger" data-action="delete" title="Xóa hình ảnh này">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
      </button>
    </div>
  `;

  document.body.appendChild(imageToolbarEl);

  // Button actions
  imageToolbarEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.img-tool-btn');
    if (!btn || !activeSelectedFigure) return;
    e.stopPropagation();

    const action = btn.dataset.action;
    const editable = activeSelectedFigure.closest('.template-writing-area');

    if (action === 'align-left') {
      setImageAlignment(activeSelectedFigure, 'left');
    } else if (action === 'align-center') {
      setImageAlignment(activeSelectedFigure, 'center');
    } else if (action === 'align-right') {
      setImageAlignment(activeSelectedFigure, 'right');
    } else if (action === 'size-sm') {
      setImageSize(activeSelectedFigure, 'sm');
    } else if (action === 'size-md') {
      setImageSize(activeSelectedFigure, 'md');
    } else if (action === 'size-full') {
      setImageSize(activeSelectedFigure, 'full');
    } else if (action === 'delete') {
      const parent = activeSelectedFigure.parentElement;
      activeSelectedFigure.remove();
      hideImageToolbar();
      if (parent) parent.dispatchEvent(new Event('input', { bubbles: true }));
      showToast('Đã xóa hình ảnh', 'info');
      return;
    }

    updateToolbarButtonStates(activeSelectedFigure);
    positionImageToolbar(activeSelectedFigure);
    if (editable) {
      editable.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  return imageToolbarEl;
}

function setImageAlignment(figure, align) {
  figure.classList.remove('img-align-left', 'img-align-center', 'img-align-right');
  figure.classList.add(`img-align-${align}`);
  figure.setAttribute('data-align', align);
}

function setImageSize(figure, size) {
  figure.classList.remove('img-size-sm', 'img-size-md', 'img-size-full');
  figure.classList.add(`img-size-${size}`);
  figure.setAttribute('data-size', size);
}

function updateToolbarButtonStates(figure) {
  if (!imageToolbarEl || !figure) return;
  const curAlign = figure.getAttribute('data-align') || 'center';
  const curSize = figure.getAttribute('data-size') || 'md';

  imageToolbarEl.querySelectorAll('[data-action^="align-"]').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.action === `align-${curAlign}`);
  });
  imageToolbarEl.querySelectorAll('[data-action^="size-"]').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.action === `size-${curSize}`);
  });
}

function positionImageToolbar(figure) {
  if (!imageToolbarEl || !figure) return;
  const rect = figure.getBoundingClientRect();
  const tbRect = imageToolbarEl.getBoundingClientRect();

  let top = rect.top - tbRect.height - 10;
  if (top < 60) {
    top = rect.bottom + 10;
  }
  let left = rect.left + (rect.width / 2) - (tbRect.width / 2);
  left = Math.max(16, Math.min(window.innerWidth - tbRect.width - 16, left));

  imageToolbarEl.style.top = `${Math.round(top)}px`;
  imageToolbarEl.style.left = `${Math.round(left)}px`;
}

export function showImageToolbar(figure) {
  const toolbar = ensureImageToolbar();
  if (activeSelectedFigure && activeSelectedFigure !== figure) {
    activeSelectedFigure.classList.remove('is-selected');
  }

  activeSelectedFigure = figure;
  figure.classList.add('is-selected');

  updateToolbarButtonStates(figure);
  toolbar.hidden = false;
  positionImageToolbar(figure);
}

export function hideImageToolbar() {
  if (imageToolbarEl) {
    imageToolbarEl.hidden = true;
  }
  if (activeSelectedFigure) {
    activeSelectedFigure.classList.remove('is-selected');
    activeSelectedFigure = null;
  }
}

// Global outside click listener to dismiss floating image toolbar
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    if (imageToolbarEl && !imageToolbarEl.hidden) {
      const isInsideToolbar = imageToolbarEl.contains(e.target);
      const isInsideFigure = activeSelectedFigure && activeSelectedFigure.contains(e.target);
      if (!isInsideToolbar && !isInsideFigure) {
        hideImageToolbar();
      }
    }
  });

  window.addEventListener('resize', () => {
    if (activeSelectedFigure && imageToolbarEl && !imageToolbarEl.hidden) {
      positionImageToolbar(activeSelectedFigure);
    }
  });

  window.addEventListener('scroll', () => {
    if (activeSelectedFigure && imageToolbarEl && !imageToolbarEl.hidden) {
      positionImageToolbar(activeSelectedFigure);
    }
  }, true);
}

/**
 * Attaches image paste, drag & drop, and click handlers to a page sheet
 * @param {HTMLElement} sheetEl
 * @param {Function} onDirtyChange
 */
export function attachImageHandlersToSheet(sheetEl, onDirtyChange) {
  if (!sheetEl) return;

  sheetEl.querySelectorAll('.template-writing-area[contenteditable="true"]').forEach(editable => {
    // 1. Paste Screenshot / Image from clipboard
    editable.addEventListener('paste', async (e) => {
      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) {
            try {
              showToast('Đang xử lý ảnh chụp màn hình... ⏳', 'info');
              const dataUrl = await compressAndProcessImageFile(file);
              insertImageCardIntoEditable(editable, dataUrl, 'Ảnh chụp màn hình');
              showToast('Đã dán ảnh chụp màn hình vào trang! 🖼️', 'success');
              if (typeof onDirtyChange === 'function') onDirtyChange();
            } catch (err) {
              console.error('Lỗi dán ảnh:', err);
              showToast('Không thể xử lý ảnh: ' + err.message, 'error');
            }
          }
          return;
        }
      }
    });

    // 2. Drag & Drop Image file
    editable.addEventListener('dragover', (e) => {
      if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
        e.preventDefault();
        editable.classList.add('writing-area-drag-over');
      }
    });

    editable.addEventListener('dragleave', (e) => {
      if (!editable.contains(e.relatedTarget)) {
        editable.classList.remove('writing-area-drag-over');
      }
    });

    editable.addEventListener('drop', async (e) => {
      editable.classList.remove('writing-area-drag-over');
      const files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
          e.preventDefault();
          try {
            showToast('Đang đính kèm hình ảnh... ⏳', 'info');
            const dataUrl = await compressAndProcessImageFile(file);
            insertImageCardIntoEditable(editable, dataUrl, file.name || 'Ảnh đính kèm');
            showToast('Đã chèn ảnh vào trang! 🖼️', 'success');
            if (typeof onDirtyChange === 'function') onDirtyChange();
          } catch (err) {
            console.error('Lỗi kéo thả ảnh:', err);
            showToast('Không thể chèn ảnh: ' + err.message, 'error');
          }
        }
      }
    });
  });

  // 3. Click handler on image cards to show floating toolbar
  sheetEl.addEventListener('click', (e) => {
    const card = e.target.closest('.notebook-image-card');
    if (card) {
      // If clicking caption, let them edit caption naturally
      if (e.target.closest('.notebook-image-caption')) {
        return;
      }
      e.stopPropagation();
      showImageToolbar(card);
    }
  });
}
