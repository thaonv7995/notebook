/**
 * Caret Positioning & Line Measurement Helpers
 */

export function getElementScale(el, fallbackZoom = 1.0) {
  if (!el) return fallbackZoom;
  const rect = el.getBoundingClientRect();
  const offsetW = el.offsetWidth;
  if (offsetW > 0 && rect.width > 0) {
    return rect.width / offsetW;
  }
  return fallbackZoom;
}

export function placeCaretAtLine(targetLine, colOffset = 0) {
  if (!targetLine) return;
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();

  if (targetLine.childNodes.length === 0) {
    targetLine.appendChild(document.createElement('br'));
  }

  let textNode = null;
  for (let i = 0; i < targetLine.childNodes.length; i++) {
    if (targetLine.childNodes[i].nodeType === Node.TEXT_NODE) {
      textNode = targetLine.childNodes[i];
      break;
    }
  }

  if (textNode) {
    const len = textNode.textContent.length;
    const offset = Math.max(0, Math.min(colOffset, len));
    range.setStart(textNode, offset);
    range.setEnd(textNode, offset);
  } else {
    range.setStart(targetLine, 0);
    range.setEnd(targetLine, 0);
  }

  sel.removeAllRanges();
  sel.addRange(range);
}

export function placeCaretAtStart(el) {
  if (!el) return;
  el.focus();
  try {
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  } catch (e) {
    console.warn('Could not place caret at start:', e);
  }
}

export function placeCaretAtEnd(el) {
  if (!el) return;
  el.focus();
  try {
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  } catch (e) {
    console.warn('Could not place caret at end:', e);
  }
}

export function isCaretAtPageBottom(editable, zoom = 1.0) {
  if (!editable) return false;
  const lh = parseFloat(getComputedStyle(editable).lineHeight) || 28;
  const scale = getElementScale(editable, zoom) || 1;
  const editableRect = editable.getBoundingClientRect();

  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return false;
  const range = sel.getRangeAt(0);
  if (!range.collapsed) return false;

  let caretBottom = null;
  const rects = range.getClientRects();
  if (rects && rects.length > 0 && rects[0].height > 0) {
    caretBottom = rects[0].bottom;
  } else {
    const r = range.getBoundingClientRect();
    if (r && r.height > 0) {
      caretBottom = r.bottom;
    } else {
      const node = range.startContainer;
      const el = (node && node.nodeType === Node.ELEMENT_NODE) ? node : (node ? node.parentElement : null);
      if (el && el !== editable) {
        const elRect = el.getBoundingClientRect();
        if (elRect && elRect.height > 0) {
          caretBottom = elRect.bottom;
        }
      }
    }
  }

  if (caretBottom !== null) {
    const distToBottom = (editableRect.bottom - caretBottom) / scale;
    return distToBottom < (lh * 0.85);
  }

  return false;
}

export function getMatchingSelector(editable) {
  if (editable.classList.contains('cornell-notes-text')) return '.cornell-notes-text';
  if (editable.classList.contains('cornell-cues-text')) return '.cornell-cues-text';
  if (editable.classList.contains('cornell-summary-text')) return '.cornell-summary-text';
  if (editable.classList.contains('work-notes-text')) return '.work-notes-text';
  if (editable.classList.contains('work-agenda-text')) return '.work-agenda-text';
  return '.template-writing-area';
}
