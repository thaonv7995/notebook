/**
 * Universal Quick Capture
 *
 * Keyboard-first capture UI backed by the shared Task Engine.
 * The component mounts its own accessible dialog markup and exposes a small
 * API so Command Palette and other features can reuse it later.
 */

import { getState } from '../state/store.js';
import { createTask } from '../tasks/task-engine.js';
import { parseQuickCapture } from '../tasks/quick-capture-parser.js';

let overlayEl = null;
let inputEl = null;
let previewEl = null;
let submitEl = null;
let previousFocus = null;
let onTaskCreatedCallback = null;

const PRIORITY_LABELS = {
  1: 'P1 · Khẩn cấp',
  2: 'P2 · Cao',
  3: 'P3 · Trung bình',
  4: 'P4 · Bình thường'
};

const STATUS_LABELS = {
  inbox: 'Inbox',
  todo: 'Cần làm',
  in_progress: 'Đang làm',
  waiting: 'Đang chờ',
  done: 'Hoàn tất',
  cancelled: 'Đã hủy'
};

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getParsedCapture() {
  return parseQuickCapture(inputEl?.value || '', {
    notebooks: getState().notebooks || []
  });
}

function metadataChip(label, value, tone = '') {
  if (!value) return '';
  const toneClass = tone ? ` quick-capture-chip--${tone}` : '';
  return `
    <span class="quick-capture-chip${toneClass}">
      <strong>${escapeHtml(label)}</strong>
      ${escapeHtml(value)}
    </span>
  `;
}

function renderPreview() {
  if (!previewEl || !submitEl) return;

  const parsed = getParsedCapture();
  const hasInput = Boolean(parsed.raw);

  submitEl.disabled = !parsed.isValid || parsed.type !== 'task';

  if (!hasInput) {
    previewEl.innerHTML = `
      <p class="quick-capture-empty">
        Ví dụ:
        <code>Chuẩn bị tài liệu ngày mai 09:00 p1 #Work @meeting</code>
      </p>
    `;
    return;
  }

  const warning = parsed.type === 'note'
    ? 'Quick Note sẽ được bổ sung ở bước tiếp theo. Hiện tại hãy dùng /task hoặc bỏ command.'
    : parsed.unresolvedNotebook
      ? `Không tìm thấy sổ “${parsed.notebookQuery}”. Task vẫn sẽ được lưu vào Inbox.`
      : !parsed.isValid
        ? 'Hãy nhập nội dung công việc.'
        : '';

  previewEl.innerHTML = `
    <div class="quick-capture-preview-title">
      ${escapeHtml(parsed.title || 'Chưa có tiêu đề')}
    </div>
    <div class="quick-capture-chips" aria-label="Thông tin được nhận diện">
      ${metadataChip('Loại', parsed.type === 'task' ? 'Task' : 'Note')}
      ${metadataChip('Trạng thái', STATUS_LABELS[parsed.status])}
      ${metadataChip('Ưu tiên', PRIORITY_LABELS[parsed.priority], `p${parsed.priority}`)}
      ${metadataChip('Ngày', parsed.dueDate)}
      ${metadataChip('Giờ', parsed.dueTime)}
      ${metadataChip('Sổ', parsed.notebookTitle || parsed.notebookQuery)}
      ${parsed.tags.map(tag => metadataChip('Tag', `#${tag}`)).join('')}
    </div>
    ${warning ? `<p class="quick-capture-warning" role="status">${escapeHtml(warning)}</p>` : ''}
  `;
}

function getFocusableElements() {
  if (!overlayEl) return [];
  return [...overlayEl.querySelectorAll(
    'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )].filter(element => !element.hidden);
}

function handleDialogKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault();
    closeQuickCapture();
    return;
  }

  if (event.key !== 'Tab') return;
  const focusable = getFocusableElements();
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function submitQuickCapture() {
  const parsed = getParsedCapture();
  if (!parsed.isValid || parsed.type !== 'task') return null;

  const state = getState();
  const activeNotebook = (state.notebooks || []).find(
    notebook => notebook.id === state.activeNotebookId
  );
  const destinationNotebookId = parsed.notebookId || activeNotebook?.id || '';
  const destinationPage = destinationNotebookId === activeNotebook?.id
    ? activeNotebook?.pages?.[state.activePageIndex || 0]
    : null;

  const task = createTask({
    title: parsed.title,
    status: parsed.status,
    priority: parsed.priority,
    dueDate: parsed.dueDate,
    dueTime: parsed.dueTime,
    notebookId: destinationNotebookId,
    pageId: destinationPage?.id || '',
    tags: parsed.tags
  });

  if (typeof onTaskCreatedCallback === 'function') {
    onTaskCreatedCallback(task);
  }

  closeQuickCapture();
  return task;
}

function mountQuickCapture() {
  if (overlayEl) return;

  overlayEl = document.createElement('div');
  overlayEl.id = 'quickCaptureOverlay';
  overlayEl.className = 'quick-capture-overlay';
  overlayEl.hidden = true;
  overlayEl.innerHTML = `
    <section
      class="quick-capture-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quickCaptureTitle"
      aria-describedby="quickCaptureHelp"
    >
      <header class="quick-capture-header">
        <div>
          <p class="quick-capture-TURE NHANH</p>
          <h2 id="quickCaptureTitle">Thêm công việc</h2>
        </div>
        <button
          type="button"
          class="quick-capture-close"
          data-action="close"
          aria-label="Đóng Capture nhanh"
        >×</button>
      </header>

      <label class="quick-capture-field">
        <span class="sr-only">Nội dung công việc</span>
        <input
          id="quickCaptureInput"
          type="text"
          autocomplete="off"
          spellcheck="true"
          placeholder="Nhập việc cần làm, ngày, giờ, #sổ, @tag, p1..."
        />
      </label>

      <div id="quickCapturePreview" class="quick-capture-preview"></div>

      <p id="quickCaptureHelp" class="quick-capture-help">
        Dùng <kbd>#</kbd> cho sổ, <kbd>@</kbd> cho tag,
        <kbd>p1</kbd>–<kbd>p4</kbd> cho ưu tiên và
        <kbd>ngày mai</kbd> hoặc <kbd>dd/mm</kbd> cho hạn.
      </p>

      <footer class="quick-capture-footer">
        <span><kbd>Esc</kbd> đóng</span>
        <button
          id="quickCaptureSubmit"
          type="button"
          class="quick-capture-submit"
        >
          Lưu vào Task Inbox
          <kbd>Enter</kbd>
        </button>
      </footer>
    </section>
  `;

  document.body.appendChild(overlayEl);
  inputEl = overlayEl.querySelector('#quickCaptureInput');
  previewEl = overlayEl.querySelector('#quickCapturePreview');
  submitEl = overlayEl.querySelector('#quickCaptureSubmit');

  overlayEl.addEventListener('mousedown', event => {
    if (event.target === overlayEl) closeQuickCapture();
  });
  overlayEl.addEventListener('keydown', handleDialogKeydown);
  overlayEl.querySelector('[data-action="close"]')
    ?.addEventListener('click', closeQuickCapture);
  inputEl?.addEventListener('input', renderPreview);
  inputEl?.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.isComposing) {
      event.preventDefault();
      submitQuickCapture();
    }
  });
  submitEl?.addEventListener('click', submitQuickCapture);
  renderPreview();
}

export function openQuickCapture(initialValue = '') {
  mountQuickCapture();
  previousFocus = document.activeElement;
  overlayEl.hidden = false;
  document.body.classList.add('quick-capture-open');
  inputEl.value = String(initialValue || '');
  renderPreview();
  requestAnimationFrame(() => {
    inputEl.focus();
    inputEl.select();
  });
}

export function closeQuickCapture() {
  if (!overlayEl || overlayEl.hidden) return;
  overlayEl.hidden = true;
  document.body.classList.remove('quick-capture-open');
  const focusTarget = previousFocus;
  previousFocus = null;
  if (focusTarget && typeof focusTarget.focus === 'function') {
    focusTarget.focus();
  }
}

export function isQuickCaptureOpen() {
  return Boolean(overlayEl && !overlayEl.hidden);
}

export function setupQuickCapture({ onTaskCreated } = {}) {
  onTaskCreatedCallback = onTaskCreated || null;
  mountQuickCapture();

  window.addEventListener('quick-capture:open', event => {
    openQuickCapture(event.detail?.value || '');
  });
}
