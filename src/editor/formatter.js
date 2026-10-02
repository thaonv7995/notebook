/**
 * Text Formatting & Typography Controller
 */

import { FONT_SIZES, FONT_FAMILIES } from '../config/constants.js';
import { getState, setState, persistState, getActiveNotebook, scheduleSave } from '../state/store.js';
import { getEls } from '../utils/dom.js';
import { showToast } from '../components/modal.js';

let lastActiveEditable = null;
let lastActiveTextarea = null;
let savedSelectionRange = null;
let savedSelectionEditable = null;

export function setLastActiveEditable(el) {
  lastActiveEditable = el;
}

export function setLastActiveTextarea(el) {
  lastActiveTextarea = el;
}

export function getActiveEditableArea(focusedPageSide = 'left', currentPageMode = '2-page') {
  const els = getEls();
  if (lastActiveEditable && document.contains(lastActiveEditable)) {
    return lastActiveEditable;
  }
  const act = document.activeElement;
  if (act && act.classList && act.classList.contains('template-writing-area')) {
    return act;
  }
  const targetSheet = (focusedPageSide === 'right' && currentPageMode === '2-page' && els.rightPageSheet)
    ? els.rightPageSheet
    : els.leftPageSheet;
  if (targetSheet) {
    const el = targetSheet.querySelector('.template-writing-area[contenteditable="true"]');
    if (el) return el;
  }
  return null;
}

export function saveCurrentSelection() {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    savedSelectionRange = sel.getRangeAt(0).cloneRange();
    savedSelectionEditable = lastActiveEditable;
  }
}

export function restoreCurrentSelection() {
  const target = savedSelectionEditable || lastActiveEditable;
  if (target && document.contains(target)) {
    target.focus();
  }
  if (savedSelectionRange) {
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(savedSelectionRange);
    }
  }
}

export function applyBadgeToSelection(editable) {
  editable.focus();
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  const range = sel.getRangeAt(0);

  let parentBadge = range.commonAncestorContainer;
  while (parentBadge && parentBadge !== editable) {
    if (parentBadge.classList && parentBadge.classList.contains('pill-badge')) {
      const textNode = document.createTextNode(parentBadge.textContent);
      parentBadge.parentNode.replaceChild(textNode, parentBadge);
      editable.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    parentBadge = parentBadge.parentNode;
  }

  const selectedText = range.toString() || 'ghi chú';
  const badgeSpan = document.createElement('span');
  badgeSpan.className = 'pill-badge';
  badgeSpan.textContent = selectedText;

  range.deleteContents();
  range.insertNode(badgeSpan);

  const newRange = document.createRange();
  newRange.setStartAfter(badgeSpan);
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);

  editable.dispatchEvent(new Event('input', { bubbles: true }));
}

export function applyCodeToSelection(editable) {
  editable.focus();
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  const range = sel.getRangeAt(0);

  let parentCode = range.commonAncestorContainer;
  while (parentCode && parentCode !== editable) {
    if (parentCode.tagName === 'CODE') {
      const textNode = document.createTextNode(parentCode.textContent);
      parentCode.parentNode.replaceChild(textNode, parentCode);
      editable.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    parentCode = parentCode.parentNode;
  }

  const selectedText = range.toString() || 'code';
  const codeEl = document.createElement('code');
  codeEl.textContent = selectedText;

  range.deleteContents();
  range.insertNode(codeEl);

  const newRange = document.createRange();
  newRange.setStartAfter(codeEl);
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);

  editable.dispatchEvent(new Event('input', { bubbles: true }));
}

export function applyTodoToSelection(editable) {
  editable.focus();
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  const range = sel.getRangeAt(0);

  const todoSpan = document.createElement('span');
  todoSpan.style.fontFamily = 'monospace';
  todoSpan.style.marginRight = '6px';
  todoSpan.textContent = '☐ ';

  range.insertNode(todoSpan);
  const newRange = document.createRange();
  newRange.setStartAfter(todoSpan);
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);

  editable.dispatchEvent(new Event('input', { bubbles: true }));
}

export function applyColorToSelection(editable, color) {
  if (!editable) return;
  editable.focus();
  restoreCurrentSelection();

  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;

  try {
    document.execCommand('styleWithCSS', false, true);
  } catch (e) {}

  const hasSelection = !sel.isCollapsed;

  if (color) {
    if (hasSelection) {
      let applied = false;
      try {
        applied = document.execCommand('foreColor', false, color);
      } catch (e) {}

      if (!applied) {
        try {
          const range = sel.getRangeAt(0);
          const span = document.createElement('span');
          span.style.color = color;
          span.appendChild(range.extractContents());
          range.insertNode(span);
          range.selectNodeContents(span);
          sel.removeAllRanges();
          sel.addRange(range);
        } catch (e2) {}
      }
    } else {
      try {
        document.execCommand('foreColor', false, color);
      } catch (e) {}
    }
  } else {
    try {
      document.execCommand('foreColor', false, 'inherit');
    } catch (e) {
      document.execCommand('removeFormat', false, null);
    }
  }

  editable.dispatchEvent(new Event('input', { bubbles: true }));
}

export function applyBgToSelection(editable, bg) {
  if (!editable) return;
  editable.focus();
  restoreCurrentSelection();

  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;

  try {
    document.execCommand('styleWithCSS', false, true);
  } catch (e) {}

  const hasSelection = !sel.isCollapsed;

  if (bg) {
    if (hasSelection) {
      let applied = false;
      try {
        applied = document.execCommand('hiliteColor', false, bg) || document.execCommand('backColor', false, bg);
      } catch (e) {
        try {
          applied = document.execCommand('backColor', false, bg);
        } catch (e2) {}
      }

      if (!applied) {
        try {
          const range = sel.getRangeAt(0);
          const mark = document.createElement('mark');
          mark.style.backgroundColor = bg;
          mark.style.color = 'inherit';
          mark.appendChild(range.extractContents());
          range.insertNode(mark);
          range.selectNodeContents(mark);
          sel.removeAllRanges();
          sel.addRange(range);
        } catch (e2) {}
      }
    } else {
      try {
        if (!document.execCommand('hiliteColor', false, bg)) {
          document.execCommand('backColor', false, bg);
        }
      } catch (e) {}
    }
  } else {
    try {
      document.execCommand('backColor', false, 'transparent');
    } catch (e) {
      document.execCommand('removeFormat', false, null);
    }
  }

  editable.dispatchEvent(new Event('input', { bubbles: true }));
}

export function applyFormattingToEditable(editable, type, value) {
  if (!editable) return;
  editable.focus();

  if (type === 'badge') {
    applyBadgeToSelection(editable);
    return;
  }
  if (type === 'code') {
    applyCodeToSelection(editable);
    return;
  }
  if (type === 'todo') {
    applyTodoToSelection(editable);
    return;
  }
  if (type === 'color') {
    applyColorToSelection(editable, value);
    return;
  }
  if (type === 'bg') {
    applyBgToSelection(editable, value);
    return;
  }

  switch(type) {
    case 'bold': document.execCommand('bold', false, null); break;
    case 'italic': document.execCommand('italic', false, null); break;
    case 'underline': document.execCommand('underline', false, null); break;
    case 'strike': document.execCommand('strikeThrough', false, null); break;
    case 'h1': document.execCommand('formatBlock', false, '<h1>'); break;
    case 'h2': document.execCommand('formatBlock', false, '<h2>'); break;
    case 'h3': document.execCommand('formatBlock', false, '<h3>'); break;
    case 'bullet': document.execCommand('insertUnorderedList', false, null); break;
    case 'number': document.execCommand('insertOrderedList', false, null); break;
    case 'quote': document.execCommand('formatBlock', false, '<blockquote>'); break;
    case 'hr': document.execCommand('insertHorizontalRule', false, null); break;
    case 'clear': document.execCommand('removeFormat', false, null); break;
    case 'undo': document.execCommand('undo', false, null); break;
    case 'redo': document.execCommand('redo', false, null); break;
  }

  editable.dispatchEvent(new Event('input', { bubbles: true }));
}

export function applyFormattingToTextarea(textarea, type, value) {
  const start = textarea.selectionStart || 0;
  const end = textarea.selectionEnd || 0;
  const text = textarea.value || '';
  const selected = text.substring(start, end);

  let prefix = '';
  let suffix = '';
  let defaultText = 'văn bản';

  switch(type) {
    case 'bold': prefix = '**'; suffix = '**'; defaultText = 'in đậm'; break;
    case 'italic': prefix = '*'; suffix = '*'; defaultText = 'in nghiêng'; break;
    case 'underline': prefix = '<u>'; suffix = '</u>'; defaultText = 'gạch chân'; break;
    case 'strike': prefix = '~~'; suffix = '~~'; defaultText = 'gạch ngang'; break;
    case 'badge': prefix = '<span class="pill-badge">'; suffix = '</span>'; defaultText = 'ghi chú'; break;
    case 'color':
      if (!value) return;
      prefix = `<span style="color: ${value}">`; suffix = '</span>'; break;
    case 'bg':
      if (!value) return;
      prefix = `<mark style="background: ${value}">`; suffix = '</mark>'; break;
    case 'h1': prefix = '\n# '; suffix = '\n'; defaultText = 'Tiêu đề 1'; break;
    case 'h2': prefix = '\n## '; suffix = '\n'; defaultText = 'Tiêu đề 2'; break;
    case 'h3': prefix = '\n### '; suffix = '\n'; defaultText = 'Tiêu đề 3'; break;
    case 'bullet': prefix = '\n• '; suffix = ''; defaultText = 'Danh sách'; break;
    case 'number': prefix = '\n1. '; suffix = ''; defaultText = 'Mục số 1'; break;
    case 'todo': prefix = '\n- [ ] '; suffix = ''; defaultText = 'Việc cần làm'; break;
    case 'quote': prefix = '\n> '; suffix = '\n'; defaultText = 'Trích dẫn'; break;
    case 'code': prefix = '`'; suffix = '`'; defaultText = 'code'; break;
    case 'hr': prefix = '\n\n---\n\n'; suffix = ''; defaultText = ''; break;
    case 'clear': {
      const cleaned = selected.replace(/(\*\*|\*|~~|`)/g, '').replace(/<[^>]+>/g, '');
      textarea.setRangeText(cleaned, start, end, 'select');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    case 'undo':
      document.execCommand('undo');
      return;
    case 'redo':
      document.execCommand('redo');
      return;
  }

  const insertText = selected || defaultText;
  const replacement = prefix + insertText + suffix;
  textarea.setRangeText(replacement, start, end, 'select');
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.focus();
}

export function applyFormattingToActiveTarget(type, value, focusedPageSide = 'left', currentPageMode = '2-page') {
  const editable = getActiveEditableArea(focusedPageSide, currentPageMode);
  if (editable && (document.activeElement === editable || editable.contains(document.activeElement) || !document.activeElement || document.activeElement.tagName !== 'INPUT')) {
    applyFormattingToEditable(editable, type, value);
    return;
  }

  const els = getEls();
  let ta = lastActiveTextarea || (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') ? document.activeElement : null);
  if (!ta || !document.contains(ta)) {
    ta = els.leftPageSheet ? els.leftPageSheet.querySelector('input') : null;
  }
  if (ta) {
    applyFormattingToTextarea(ta, type, value);
  }
}

export function updateFontSize(direction, reset = false, focusedPageSide = 'left', currentPageMode = '2-page') {
  const editable = getActiveEditableArea(focusedPageSide, currentPageMode);
  const sel = window.getSelection();
  const hasSelection = editable && sel && !sel.isCollapsed && editable.contains(sel.anchorNode);

  if (hasSelection) {
    applyFontSizeToSelection(editable, direction, reset);
    return;
  }

  const state = getState();
  if (reset) {
    setState({ fontSize: 16 });
    applyFontSize(16);
    persistState();
    return;
  }

  const cur = state.fontSize || 16;
  let idx = FONT_SIZES.findIndex(s => s >= cur);
  if (idx === -1) idx = FONT_SIZES.length - 1;
  if (FONT_SIZES[idx] > cur && direction < 0) {
    idx = Math.max(0, idx - 1);
  } else {
    idx = Math.max(0, Math.min(FONT_SIZES.length - 1, idx + direction));
  }
  const next = FONT_SIZES[idx];
  setState({ fontSize: next });
  applyFontSize(next);
  persistState();
}

export function applyFontSizeToSelection(editable, direction, reset = false) {
  if (!editable) return;
  editable.focus();
  restoreCurrentSelection();
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount || sel.isCollapsed) return;

  try {
    const range = sel.getRangeAt(0);
    const parent = sel.anchorNode.parentElement;
    let cur = parent ? parseInt(window.getComputedStyle(parent).fontSize) || 16 : 16;
    let nextSize = 16;
    if (!reset) {
      let idx = FONT_SIZES.findIndex(s => s >= cur);
      if (idx === -1) idx = FONT_SIZES.length - 1;
      if (FONT_SIZES[idx] > cur && direction < 0) {
        idx = Math.max(0, idx - 1);
      } else {
        idx = Math.max(0, Math.min(FONT_SIZES.length - 1, idx + direction));
      }
      nextSize = FONT_SIZES[idx];
    }

    const span = document.createElement('span');
    if (!reset) {
      span.style.fontSize = `${nextSize}px`;
    }
    span.appendChild(range.extractContents());
    range.insertNode(span);
    range.selectNodeContents(span);
    sel.removeAllRanges();
    sel.addRange(range);
    saveCurrentSelection();

    const els = getEls();
    if (els.fontSizeLabel) els.fontSizeLabel.textContent = nextSize;
    editable.dispatchEvent(new Event('input', { bubbles: true }));
    scheduleSave();
  } catch (err) {
    console.warn('Could not apply font size to selection:', err);
  }
}

export function applyFontSize(size) {
  const state = getState();
  const s = size || state.fontSize || 16;
  setState({ fontSize: s });
  document.documentElement.style.setProperty('--editor-font-size', `${s}px`);

  const currentLhStr = document.documentElement.style.getPropertyValue('--notebook-line-height') || '28px';
  const nbLh = parseInt(currentLhStr, 10) || 28;
  const maxNbFont = Math.max(12, nbLh - 4);
  const nbFont = Math.max(10, Math.min(s, maxNbFont));
  document.documentElement.style.setProperty('--notebook-font-size', `${nbFont}px`);
  const els = getEls();
  if (els.fontSizeLabel) els.fontSizeLabel.textContent = s;
}

export function applyLineHeight(lhValue) {
  const nb = getActiveNotebook();
  const state = getState();
  const lh = lhValue || (nb && nb.lineHeight) || state.lineHeight || '28';

  if (lh === 'none') {
    document.documentElement.style.setProperty('--notebook-line-height', '28px');
    document.documentElement.style.setProperty('--notebook-lines-display', 'none');
  } else {
    const px = parseInt(lh, 10) || 28;
    document.documentElement.style.setProperty('--notebook-line-height', `${px}px`);
    document.documentElement.style.setProperty(
      '--notebook-lines-display',
      `repeating-linear-gradient(to bottom, transparent 0, transparent ${px - 1}px, #cbd5e1 ${px - 1}px, #cbd5e1 ${px}px)`
    );
  }

  const els = getEls();
  if (els.lineHeightLabel) {
    els.lineHeightLabel.textContent = lh === 'none' ? 'Trơn' : `${lh}px`;
  }
  if (els.lineHeightMenu) {
    els.lineHeightMenu.querySelectorAll('.line-height-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lh === String(lh));
    });
  }

  applyFontSize(state.fontSize || 16);
}

export function setLineHeight(lhValue) {
  const nb = getActiveNotebook();
  if (nb) {
    nb.lineHeight = lhValue;
  }
  setState({ lineHeight: lhValue });
  applyLineHeight(lhValue);
  persistState();
  showToast(`Đã đổi cỡ ô kẻ: ${lhValue === 'none' ? 'Giấy trơn' : lhValue + 'px'}`);
}

export function applyFontFamily(fontKey) {
  const state = getState();
  const nb = getActiveNotebook();
  const key = fontKey || (nb && nb.fontFamily) || state.fontFamily || 'sans';
  const cssFont = FONT_FAMILIES[key] || FONT_FAMILIES['sans'];
  document.documentElement.style.setProperty('--notebook-font-family', cssFont);
  const els = getEls();
  if (els.fmtFontFamily) els.fmtFontFamily.value = key;
}

export function applyFontFamilyToSelection(editable, fontValue) {
  if (!editable) return;
  editable.focus();
  restoreCurrentSelection();
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;

  const cssFont = FONT_FAMILIES[fontValue] || fontValue;

  if (!sel.isCollapsed) {
    // Apply font to selected text
    try {
      const range = sel.getRangeAt(0);
      const span = document.createElement('span');
      span.style.fontFamily = cssFont;
      span.appendChild(range.extractContents());
      range.insertNode(span);
      range.selectNodeContents(span);
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (e) {
      document.execCommand('fontName', false, cssFont);
    }
  } else {
    // No selection — insert a zero-width space in a span with the new font
    // so that subsequent typing uses this font without affecting existing text
    const range = sel.getRangeAt(0);
    const span = document.createElement('span');
    span.style.fontFamily = cssFont;
    span.textContent = '\u200B'; // zero-width space
    range.insertNode(span);

    // Move cursor inside the span, after the zero-width space
    const newRange = document.createRange();
    newRange.setStart(span.firstChild, 1);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
  }
  editable.dispatchEvent(new Event('input', { bubbles: true }));
  scheduleSave();
}
