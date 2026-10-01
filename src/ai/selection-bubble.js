/**
 * AI Selection Bubble — Text Selection AI Actions
 *
 * When the user selects text in a writing area, a floating
 * bubble appears with AI transformation options:
 *   Grammar fix, Summarize, Expand, Professional, Translate
 */

import { processAI } from './ai-service.js';

let bubbleEl = null;
let isVisible = false;
let isProcessing = false;
let currentEditable = null;
let currentSelectedText = '';
let currentTemplate = 'ruled';

const BUBBLE_ACTIONS = [
  { id: 'grammar',      icon: '🛠️', label: 'Sửa lỗi',    short: 'Sửa chính tả & ngữ pháp' },
  { id: 'summarize',    icon: '✂️', label: 'Tóm tắt',     short: 'Rút gọn ý chính' },
  { id: 'expand',       icon: '📖', label: 'Mở rộng',     short: 'Viết sâu hơn' },
  { id: 'professional', icon: '👔', label: 'Chuyên nghiệp', short: 'Đổi văn phong' },
  { id: 'translate-en', icon: '🇬🇧', label: 'EN',          short: 'Dịch sang Tiếng Anh' },
  { id: 'translate-vi', icon: '🇻🇳', label: 'VI',          short: 'Dịch sang Tiếng Việt' },
  { id: 'translate-ja', icon: '🇯🇵', label: 'JA',          short: 'Dịch sang Tiếng Nhật' },
];

function createBubbleHTML() {
  return `
    <div class="ai-bubble" id="aiBubble" role="toolbar" aria-label="AI Selection Actions">
      <div class="ai-bubble-arrow"></div>
      <div class="ai-bubble-actions">
        ${BUBBLE_ACTIONS.map(a => `
          <button class="ai-bubble-btn" data-action="${a.id}" title="${a.short}">
            <span class="ai-bubble-btn-icon">${a.icon}</span>
            <span class="ai-bubble-btn-label">${a.label}</span>
          </button>
        `).join('')}
      </div>
      <div class="ai-bubble-loading" id="aiBubbleLoading" hidden>
        <div class="ai-loading-spinner ai-loading-spinner--sm"></div>
        <span>Đang xử lý...</span>
      </div>
      <div class="ai-bubble-result" id="aiBubbleResult" hidden>
        <div class="ai-bubble-result-text" id="aiBubbleResultText"></div>
        <div class="ai-bubble-result-btns">
          <button class="ai-bubble-accept" id="aiBubbleAccept" title="Thay thế đoạn chọn">✓ Áp dụng</button>
          <button class="ai-bubble-dismiss" id="aiBubbleDismiss" title="Bỏ qua">✕</button>
        </div>
      </div>
    </div>
  `;
}

function ensureBubble() {
  if (bubbleEl) return;
  bubbleEl = document.createElement('div');
  bubbleEl.id = 'aiSelectionBubbleContainer';
  bubbleEl.className = 'ai-selection-bubble-container';
  bubbleEl.innerHTML = createBubbleHTML();
  document.body.appendChild(bubbleEl);
  bindBubbleEvents();
}

function bindBubbleEvents() {
  const actionBtns = bubbleEl.querySelectorAll('.ai-bubble-btn');
  const acceptBtn = bubbleEl.querySelector('#aiBubbleAccept');
  const dismissBtn = bubbleEl.querySelector('#aiBubbleDismiss');

  actionBtns.forEach(btn => {
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault(); // Prevent losing selection
      e.stopPropagation();
    });
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const actionId = btn.dataset.action;
      handleBubbleAction(actionId);
    });
  });

  acceptBtn.addEventListener('click', () => {
    const resultText = bubbleEl.querySelector('#aiBubbleResultText')?.textContent || '';
    if (resultText && currentEditable) {
      replaceSelectedText(resultText);
    }
    hideBubble();
  });

  dismissBtn.addEventListener('click', () => {
    hideBubbleResult();
  });
}

async function handleBubbleAction(actionId) {
  if (isProcessing || !currentSelectedText) return;

  let action = actionId;
  let targetLang = '';

  if (actionId.startsWith('translate-')) {
    action = 'translate';
    const langMap = { 'translate-en': 'English', 'translate-vi': 'Vietnamese', 'translate-ja': 'Japanese' };
    targetLang = langMap[actionId] || 'English';
  }

  isProcessing = true;
  showBubbleLoading();
  hideBubbleResult();

  try {
    const data = await processAI({
      action,
      selectedText: currentSelectedText,
      template: currentTemplate,
      targetLang,
    });

    showBubbleResult(data.result || '');
  } catch (err) {
    showBubbleResult(`⚠ Lỗi: ${err.message}`);
  } finally {
    isProcessing = false;
    hideBubbleLoading();
  }
}

function replaceSelectedText(newText) {
  if (!currentEditable) return;

  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  const range = sel.getRangeAt(0);

  // Only replace if range is still inside our editable
  if (!currentEditable.contains(range.commonAncestorContainer)) return;

  range.deleteContents();
  const textNode = document.createTextNode(newText);
  range.insertNode(textNode);

  // Move cursor to end of inserted text
  range.setStartAfter(textNode);
  range.setEndAfter(textNode);
  sel.removeAllRanges();
  sel.addRange(range);

  // Trigger input event so state persists
  currentEditable.dispatchEvent(new Event('input', { bubbles: true }));
}

function showBubbleLoading() {
  const el = bubbleEl.querySelector('#aiBubbleLoading');
  if (el) el.hidden = false;
}

function hideBubbleLoading() {
  const el = bubbleEl.querySelector('#aiBubbleLoading');
  if (el) el.hidden = true;
}

function showBubbleResult(text) {
  const container = bubbleEl.querySelector('#aiBubbleResult');
  const textEl = bubbleEl.querySelector('#aiBubbleResultText');
  if (container && textEl) {
    textEl.textContent = text;
    container.hidden = false;
  }
}

function hideBubbleResult() {
  const container = bubbleEl.querySelector('#aiBubbleResult');
  if (container) container.hidden = true;
}

// ─── Position and Show ───

function positionBubble(rect) {
  const bubble = bubbleEl.querySelector('#aiBubble');
  if (!bubble) return;

  const bubbleWidth = 420;
  let left = rect.left + (rect.width / 2) - (bubbleWidth / 2);
  let top = rect.top - 12; // Above selection

  // Keep within viewport
  if (left < 8) left = 8;
  if (left + bubbleWidth > window.innerWidth - 8) left = window.innerWidth - bubbleWidth - 8;
  if (top < 8) {
    top = rect.bottom + 8; // Below if not enough space above
    bubble.classList.add('ai-bubble--below');
  } else {
    bubble.classList.remove('ai-bubble--below');
  }

  bubble.style.left = `${left}px`;
  bubble.style.top = `${top}px`;
}

export function showBubble(editable, template) {
  ensureBubble();

  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.toString().trim()) {
    hideBubble();
    return;
  }

  currentSelectedText = sel.toString().trim();
  currentEditable = editable;
  currentTemplate = template || 'ruled';

  if (currentSelectedText.length < 2) {
    hideBubble();
    return;
  }

  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  positionBubble(rect);

  hideBubbleResult();
  hideBubbleLoading();

  bubbleEl.classList.add('is-visible');
  isVisible = true;
}

export function hideBubble() {
  if (!bubbleEl) return;
  bubbleEl.classList.remove('is-visible');
  isVisible = false;
  isProcessing = false;
}

export function isBubbleVisible() {
  return isVisible;
}

// ─── Auto-detect Text Selection ───

let selectionDebounce = null;

export function setupSelectionListener() {
  document.addEventListener('selectionchange', () => {
    clearTimeout(selectionDebounce);
    selectionDebounce = setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        hideBubble();
        return;
      }

      // Only show for writing areas
      const anchor = sel.anchorNode;
      if (!anchor) return;
      const editable = anchor.nodeType === Node.ELEMENT_NODE
        ? anchor.closest('.template-writing-area')
        : anchor.parentElement?.closest('.template-writing-area');

      if (!editable) {
        hideBubble();
        return;
      }

      // Detect template from the page context
      const page = editable.closest('.page');
      let template = 'ruled';
      if (page) {
        const ds = page.dataset;
        template = ds.template || 'ruled';
      }

      showBubble(editable, template);
    }, 350);
  });

  // Hide on click outside
  document.addEventListener('mousedown', (e) => {
    if (!isVisible) return;
    if (bubbleEl && bubbleEl.contains(e.target)) return;
    // Give a small delay to allow selection events
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        hideBubble();
      }
    }, 100);
  });
}
