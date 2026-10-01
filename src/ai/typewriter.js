/**
 * Typewriter Animation Engine for AI Co-pilot
 *
 * Simulates a real-time handwriting/typewriting effect directly on the notebook sheet:
 * - Natural cadence variations (slight pauses on punctuation)
 * - Animated violet ink caret
 * - Non-blocking animation frame scheduling
 * - Instant skip and cancel controls
 * - Auto-scroll to keep active writing line visible
 */

import { formatContentToHtml } from '../editor/sanitizer.js';

let activeController = null;

export function isTypewritingActive() {
  return activeController !== null && activeController.isRunning();
}

export function cancelTypewriting() {
  if (activeController) {
    activeController.cancel();
    activeController = null;
  }
}

export function skipTypewriting() {
  if (activeController) {
    activeController.skip();
    activeController = null;
  }
}

/**
 * Typewrites text into a target contenteditable element or text input.
 *
 * @param {HTMLElement} targetEl - The element to write into (.template-writing-area or input)
 * @param {string} fullText - The text to write
 * @param {Object} options
 * @param {number} [options.speed=16] - Base milliseconds per character
 * @param {'append'|'replace'|'insert'} [options.mode='append'] - Insertion mode
 * @param {Function} [options.onProgress] - Called on each step with progress (0..1)
 * @param {Function} [options.onComplete] - Called when typing completes
 * @returns {{ cancel: Function, skip: Function, isRunning: Function }}
 */
export function typewriteTextIntoElement(targetEl, fullText, options = {}) {
  // Cancel any existing typewriter session
  cancelTypewriting();

  if (!targetEl || !fullText) {
    if (options.onComplete) options.onComplete();
    return { cancel: () => {}, skip: () => {}, isRunning: () => false };
  }

  const {
    speed = 16,
    mode = 'append',
    onProgress = null,
    onComplete = null,
  } = options;

  let isCancelled = false;
  let isDone = false;
  let currentIndex = 0;
  const totalLength = fullText.length;

  // Setup initial content based on mode
  let basePrefix = '';
  if (mode === 'append') {
    const existing = targetEl.isContentEditable ? targetEl.innerText : targetEl.value;
    if (existing && existing.trim()) {
      basePrefix = existing.trimEnd() + '\n\n';
    }
  }

  // Create caret element for contenteditable
  let caretEl = null;
  if (targetEl.isContentEditable) {
    targetEl.focus();
    caretEl = document.createElement('span');
    caretEl.className = 'ai-typewriter-caret';
    caretEl.textContent = '❙';
  }

  function updateDOM(currentText) {
    if (targetEl.isContentEditable) {
      targetEl.innerText = basePrefix + currentText;
      if (caretEl && !isDone) {
        targetEl.appendChild(caretEl);
      }
      // Keep scroll in view
      targetEl.scrollTop = targetEl.scrollHeight;
    } else {
      targetEl.value = basePrefix + currentText;
    }

    if (typeof onProgress === 'function') {
      onProgress(currentIndex / totalLength);
    }
  }

  function finish(finalText) {
    isDone = true;
    if (caretEl && caretEl.parentNode) {
      caretEl.remove();
    }
    if (targetEl.isContentEditable) {
      targetEl.innerHTML = formatContentToHtml(basePrefix + finalText);
    } else {
      targetEl.value = basePrefix + finalText;
    }

    targetEl.dispatchEvent(new Event('input', { bubbles: true }));

    if (activeController && activeController.isRunning()) {
      activeController = null;
    }

    if (typeof onComplete === 'function') {
      onComplete();
    }
  }

  let timeoutId = null;

  function step() {
    if (isCancelled || isDone) return;

    if (currentIndex >= totalLength) {
      finish(fullText);
      return;
    }

    // Determine chunk size: type faster for long texts
    const remaining = totalLength - currentIndex;
    const chunkSize = remaining > 1000 ? 5 : (remaining > 400 ? 3 : 1);
    currentIndex = Math.min(currentIndex + chunkSize, totalLength);

    const currentText = fullText.slice(0, currentIndex);
    updateDOM(currentText);

    if (currentIndex >= totalLength) {
      finish(fullText);
      return;
    }

    // Natural cadence: pause longer on punctuation
    const lastChar = currentText[currentText.length - 1];
    let delay = speed;
    if (['.', '!', '?', '\n'].includes(lastChar)) {
      delay = speed * 4;
    } else if ([',', ';', ':', '—'].includes(lastChar)) {
      delay = speed * 2;
    }

    timeoutId = setTimeout(step, Math.max(8, delay));
  }

  // Start typing
  timeoutId = setTimeout(step, 40);

  const controller = {
    cancel() {
      if (isDone) return;
      isCancelled = true;
      clearTimeout(timeoutId);
      if (caretEl && caretEl.parentNode) caretEl.remove();
      activeController = null;
    },
    skip() {
      if (isDone) return;
      clearTimeout(timeoutId);
      finish(fullText);
    },
    isRunning() {
      return !isDone && !isCancelled;
    }
  };

  activeController = controller;
  return controller;
}
