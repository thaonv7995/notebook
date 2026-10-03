/**
 * Page Overflow Guard
 *
 * Prevents content from exceeding the visible area of a notebook page.
 * Like a real physical page — when you reach the bottom, you can't write more.
 *
 * Works by intercepting keydown (Enter, character keys) and input events
 * on all .template-writing-area contenteditable elements. If the content's
 * scrollHeight exceeds clientHeight, further input is blocked.
 *
 * Special handling:
 * - Backspace/Delete are ALWAYS allowed (never blocked, even if overflowing)
 * - AI-generated content bypasses the guard via a temporary flag
 * - CJK/Hanzi wrapped spans use a relaxed tolerance to avoid false positives
 */

const ALLOWED_KEYS = new Set([
  'Backspace', 'Delete',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Home', 'End', 'PageUp', 'PageDown',
  'Escape', 'Tab',
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
]);

// Keys that actively delete/reduce content — these must NEVER be blocked
const DELETION_KEYS = new Set(['Backspace', 'Delete']);

// Flag to temporarily bypass the overflow guard (e.g., during AI generation)
let bypassOverflowGuard = false;

/**
 * Temporarily disable the overflow guard (used during AI content insertion).
 * Call with `true` before programmatic content insertion and `false` after.
 */
export function setOverflowGuardBypass(enabled) {
  bypassOverflowGuard = !!enabled;
}

/**
 * Check if a writing area's content overflows its visible bounds.
 * Uses a tolerance of 6px to avoid sub-pixel and CJK wrapper false positives.
 * CJK text wrapped in <span class="hanzi-cjk"> with position offsets can add
 * a few extra pixels of scroll height — the larger tolerance accounts for this.
 */
function isOverflowing(el) {
  return el.scrollHeight > el.clientHeight + 6;
}

/**
 * Handles keydown on contenteditable writing areas.
 * Blocks input that would add content when the area is already full.
 * NEVER blocks Backspace or Delete.
 */
function handleWritingAreaKeydown(e) {
  const area = e.target.closest('.template-writing-area');
  if (!area) return;

  // Always allow: navigation, deletion, modifier combos (Ctrl+A, Cmd+Z, etc.)
  if (ALLOWED_KEYS.has(e.key)) return;
  if (e.ctrlKey || e.metaKey) return; // Allow copy, paste (paste handled separately), undo, etc.

  // Bypass during AI generation
  if (bypassOverflowGuard) return;

  // If area is already full, block Enter and character input
  if (isOverflowing(area)) {
    // Allow selection-based operations (replacing selected text won't grow content)
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return; // user has text selected, replacing is OK

    e.preventDefault();
    e.stopPropagation();

    // Brief visual flash to indicate page is full
    area.style.transition = 'box-shadow 0.15s ease';
    area.style.boxShadow = 'inset 0 -3px 0 rgba(239, 68, 68, 0.5)';
    setTimeout(() => {
      area.style.boxShadow = '';
    }, 300);
  }
}

/**
 * Handles paste events — trims pasted content if it would overflow.
 */
function handleWritingAreaPaste(e) {
  const area = e.target.closest('.template-writing-area');
  if (!area) return;

  // Bypass during AI generation
  if (bypassOverflowGuard) return;

  if (isOverflowing(area)) {
    // Already full — block paste entirely
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      e.preventDefault();
      return;
    }
  }

  // After paste, trim overflow in next frame
  requestAnimationFrame(() => {
    trimOverflow(area);
  });
}

/**
 * After an input event, check if we overflowed and undo the last action if so.
 * CRITICAL: Only undo for additive input (insertText, insertParagraph, etc.),
 * NEVER undo deletions (deleteContentBackward, deleteContentForward, etc.).
 */
function handleWritingAreaInput(e) {
  const area = e.target.closest('.template-writing-area');
  if (!area) return;

  // Bypass during AI generation
  if (bypassOverflowGuard) return;

  // Never interfere with deletion operations — user must always be able to delete
  const inputType = e.inputType || '';
  if (inputType.startsWith('delete') || inputType === 'historyUndo' || inputType === 'historyRedo') {
    return;
  }

  // Small delay to let DOM update and indicate overflow if necessary
  requestAnimationFrame(() => {
    if (isOverflowing(area)) {
      // Flash red indicator to notify user that page has reached capacity
      area.style.transition = 'box-shadow 0.15s ease';
      area.style.boxShadow = 'inset 0 -3px 0 rgba(239, 68, 68, 0.5)';
      setTimeout(() => {
        area.style.boxShadow = '';
      }, 300);
    }
  });
}

/**
 * Trim overflowing content by removing trailing elements/text.
 */
function trimOverflow(area) {
  let iterations = 0;
  while (isOverflowing(area) && iterations < 50) {
    // Remove last child node or trim last text
    const lastChild = area.lastChild;
    if (!lastChild) break;

    if (lastChild.nodeType === Node.TEXT_NODE) {
      if (lastChild.textContent.length > 0) {
        lastChild.textContent = lastChild.textContent.slice(0, -1);
      } else {
        area.removeChild(lastChild);
      }
    } else {
      area.removeChild(lastChild);
    }
    iterations++;
  }
}

/**
 * Initialize the overflow guard on all current and future writing areas.
 */
export function initPageOverflowGuard() {
  // Use event delegation on document for efficiency
  document.addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('.template-writing-area')) {
      handleWritingAreaKeydown(e);
    }
  }, true); // capture phase to intercept before other handlers

  document.addEventListener('paste', (e) => {
    if (e.target.closest && e.target.closest('.template-writing-area')) {
      handleWritingAreaPaste(e);
    }
  }, true);

  document.addEventListener('input', (e) => {
    if (e.target.closest && e.target.closest('.template-writing-area')) {
      handleWritingAreaInput(e);
    }
  });
}
