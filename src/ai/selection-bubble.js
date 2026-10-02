/**
 * Selection Floating Toolbar
 *
 * When the user selects text in a writing area, a compact floating
 * toolbar appears with:
 *   1. Text formatting: Bold, Italic, Underline, Strikethrough, Highlight
 *   2. AI actions (collapsed under ✨ button): Grammar, Summarize, Translate
 */

import { processAI } from './ai-service.js';

let bubbleEl = null;
let isVisible = false;
let isProcessing = false;
let currentEditable = null;
let currentSelectedText = '';
let currentTemplate = 'ruled';
let aiMenuOpen = false;

const AI_ACTIONS = [
  { id: 'grammar',      icon: '✏️', label: 'Sửa chính tả' },
  { id: 'professional', icon: '👔', label: 'Chuyên nghiệp' },
  { id: 'summarize',    icon: '✂️', label: 'Tóm tắt' },
  { id: 'expand',       icon: '📖', label: 'Mở rộng' },
  { id: 'translate-en', icon: '🇬🇧', label: 'Dịch EN' },
  { id: 'translate-vi', icon: '🇻🇳', label: 'Dịch VI' },
];

// Highlight colors for quick pick
const HIGHLIGHT_COLORS = [
  { color: '#fef08a', label: 'Vàng' },
  { color: '#bbf7d0', label: 'Xanh lá' },
  { color: '#bfdbfe', label: 'Xanh dương' },
  { color: '#fecaca', label: 'Đỏ' },
  { color: '#e9d5ff', label: 'Tím' },
  { color: 'transparent', label: 'Xóa' },
];

function createBubbleHTML() {
  return `
    <div class="sel-toolbar" id="selToolbar" role="toolbar" aria-label="Selection Toolbar">
      <div class="sel-toolbar-arrow"></div>

      <!-- Formatting buttons -->
      <div class="sel-toolbar-row sel-toolbar-main">
        <button class="sel-tb-btn" data-fmt="bold" title="In đậm (⌘B)">
          <svg viewBox="0 0 24 24" width="14" height="14"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>
        </button>
        <button class="sel-tb-btn" data-fmt="italic" title="In nghiêng (⌘I)">
          <svg viewBox="0 0 24 24" width="14" height="14"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
        </button>
        <button class="sel-tb-btn" data-fmt="underline" title="Gạch chân (⌘U)">
          <svg viewBox="0 0 24 24" width="14" height="14"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>
        </button>
        <button class="sel-tb-btn" data-fmt="strikethrough" title="Gạch ngang">
          <svg viewBox="0 0 24 24" width="14" height="14"><path d="M16 4H9a3 3 0 0 0-2.83 4M14 12a4 4 0 0 1 0 8H6"/><line x1="4" y1="12" x2="20" y2="12"/></svg>
        </button>

        <span class="sel-tb-sep"></span>

        <!-- Highlight picker toggle -->
        <button class="sel-tb-btn sel-tb-btn--highlight" data-action="highlight" title="Bôi màu nền">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          <span class="sel-tb-highlight-dot" id="selHighlightDot"></span>
        </button>

        <span class="sel-tb-sep"></span>

        <!-- AI dropdown toggle -->
        <button class="sel-tb-btn sel-tb-btn--ai" data-action="ai-toggle" title="AI ✨">
          <span style="font-size:13px">✨</span>
        </button>
      </div>

      <!-- Highlight color row (hidden by default) -->
      <div class="sel-toolbar-row sel-toolbar-colors" id="selHighlightRow" hidden>
        ${HIGHLIGHT_COLORS.map(c => `
          <button class="sel-hl-swatch" data-hl-color="${c.color}" title="${c.label}" style="background:${c.color === 'transparent' ? 'repeating-conic-gradient(#ccc 0% 25%, transparent 0% 50%) 50% / 8px 8px' : c.color}">
            ${c.color === 'transparent' ? '✕' : ''}
          </button>
        `).join('')}
      </div>

      <!-- AI actions dropdown (hidden by default) -->
      <div class="sel-toolbar-row sel-toolbar-ai-menu" id="selAiMenu" hidden>
        ${AI_ACTIONS.map(a => `
          <button class="sel-ai-btn" data-ai-action="${a.id}" title="${a.label}">
            <span class="sel-ai-icon">${a.icon}</span>
            <span class="sel-ai-label">${a.label}</span>
          </button>
        `).join('')}
      </div>

      <!-- Loading indicator -->
      <div class="sel-toolbar-row sel-toolbar-loading" id="selLoading" hidden>
        <div class="ai-loading-spinner ai-loading-spinner--sm"></div>
        <span>Đang xử lý...</span>
      </div>

      <!-- AI Result -->
      <div class="sel-toolbar-row sel-toolbar-result" id="selResult" hidden>
        <div class="sel-result-text" id="selResultText"></div>
        <div class="sel-result-btns">
          <button class="sel-result-accept" id="selAccept" title="Thay thế đoạn chọn">✓ Áp dụng</button>
          <button class="sel-result-dismiss" id="selDismiss" title="Bỏ qua">✕</button>
        </div>
      </div>
    </div>
  `;
}

function ensureBubble() {
  if (bubbleEl) return;
  bubbleEl = document.createElement('div');
  bubbleEl.id = 'selectionToolbarContainer';
  bubbleEl.className = 'sel-toolbar-container';
  bubbleEl.innerHTML = createBubbleHTML();
  document.body.appendChild(bubbleEl);
  bindBubbleEvents();
}

function bindBubbleEvents() {
  // Prevent selection loss
  bubbleEl.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  // Format buttons
  bubbleEl.querySelectorAll('[data-fmt]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const fmt = btn.dataset.fmt;
      if (currentEditable) {
        currentEditable.focus();
        document.execCommand(fmt, false, null);
        currentEditable.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  });

  // Highlight toggle
  bubbleEl.querySelector('[data-action="highlight"]')?.addEventListener('click', (e) => {
    e.preventDefault();
    const row = bubbleEl.querySelector('#selHighlightRow');
    const aiMenu = bubbleEl.querySelector('#selAiMenu');
    if (aiMenu) { aiMenu.hidden = true; aiMenuOpen = false; }
    if (row) row.hidden = !row.hidden;
  });

  // Highlight color swatches
  bubbleEl.querySelectorAll('.sel-hl-swatch').forEach(swatch => {
    swatch.addEventListener('click', (e) => {
      e.preventDefault();
      const color = swatch.dataset.hlColor;
      if (currentEditable) {
        currentEditable.focus();
        if (color === 'transparent') {
          document.execCommand('removeFormat', false, null);
        } else {
          document.execCommand('hiliteColor', false, color);
        }
        currentEditable.dispatchEvent(new Event('input', { bubbles: true }));
        // Update dot color
        const dot = bubbleEl.querySelector('#selHighlightDot');
        if (dot) dot.style.background = color === 'transparent' ? '#fef08a' : color;
      }
      bubbleEl.querySelector('#selHighlightRow').hidden = true;
    });
  });

  // AI toggle
  bubbleEl.querySelector('[data-action="ai-toggle"]')?.addEventListener('click', (e) => {
    e.preventDefault();
    const menu = bubbleEl.querySelector('#selAiMenu');
    const hlRow = bubbleEl.querySelector('#selHighlightRow');
    if (hlRow) hlRow.hidden = true;
    if (menu) {
      aiMenuOpen = !aiMenuOpen;
      menu.hidden = !aiMenuOpen;
    }
  });

  // AI action buttons
  bubbleEl.querySelectorAll('[data-ai-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const actionId = btn.dataset.aiAction;
      handleAiAction(actionId);
    });
  });

  // Result accept/dismiss
  bubbleEl.querySelector('#selAccept')?.addEventListener('click', () => {
    const resultText = bubbleEl.querySelector('#selResultText')?.textContent || '';
    if (resultText && currentEditable) {
      replaceSelectedText(resultText);
    }
    hideResult();
  });

  bubbleEl.querySelector('#selDismiss')?.addEventListener('click', () => {
    hideResult();
  });
}

async function handleAiAction(actionId) {
  if (isProcessing || !currentSelectedText) return;

  let action = actionId;
  let targetLang = '';

  if (actionId.startsWith('translate-')) {
    action = 'translate';
    const langMap = { 'translate-en': 'English', 'translate-vi': 'Vietnamese' };
    targetLang = langMap[actionId] || 'English';
  }

  isProcessing = true;
  showLoading();
  hideResult();
  // Close AI menu
  const menu = bubbleEl.querySelector('#selAiMenu');
  if (menu) { menu.hidden = true; aiMenuOpen = false; }

  try {
    const data = await processAI({
      action,
      selectedText: currentSelectedText,
      template: currentTemplate,
      targetLang,
    });
    showResult(data.result || '');
  } catch (err) {
    showResult(`⚠ Lỗi: ${err.message}`);
  } finally {
    isProcessing = false;
    hideLoading();
  }
}

function replaceSelectedText(newText) {
  if (!currentEditable) return;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!currentEditable.contains(range.commonAncestorContainer)) return;

  range.deleteContents();
  const textNode = document.createTextNode(newText);
  range.insertNode(textNode);
  range.setStartAfter(textNode);
  range.setEndAfter(textNode);
  sel.removeAllRanges();
  sel.addRange(range);
  currentEditable.dispatchEvent(new Event('input', { bubbles: true }));
}

function showLoading() {
  const el = bubbleEl.querySelector('#selLoading');
  if (el) el.hidden = false;
}
function hideLoading() {
  const el = bubbleEl.querySelector('#selLoading');
  if (el) el.hidden = true;
}
function showResult(text) {
  const container = bubbleEl.querySelector('#selResult');
  const textEl = bubbleEl.querySelector('#selResultText');
  if (container && textEl) {
    textEl.textContent = text;
    container.hidden = false;
  }
}
function hideResult() {
  const container = bubbleEl.querySelector('#selResult');
  if (container) container.hidden = true;
}

// ─── Position and Show ───

function positionBubble(rect) {
  const toolbar = bubbleEl.querySelector('#selToolbar');
  if (!toolbar) return;

  const toolbarWidth = 280;
  let left = rect.left + (rect.width / 2) - (toolbarWidth / 2);
  let top = rect.top - 10; // Above selection

  if (left < 8) left = 8;
  if (left + toolbarWidth > window.innerWidth - 8) left = window.innerWidth - toolbarWidth - 8;
  if (top < 8) {
    top = rect.bottom + 8;
    toolbar.classList.add('sel-toolbar--below');
  } else {
    toolbar.classList.remove('sel-toolbar--below');
  }

  toolbar.style.left = `${left}px`;
  toolbar.style.top = `${top}px`;
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

  // Reset sub-panels
  const hlRow = bubbleEl.querySelector('#selHighlightRow');
  const aiMenu = bubbleEl.querySelector('#selAiMenu');
  if (hlRow) hlRow.hidden = true;
  if (aiMenu) { aiMenu.hidden = true; aiMenuOpen = false; }
  hideResult();
  hideLoading();

  bubbleEl.classList.add('is-visible');
  isVisible = true;
}

export function hideBubble() {
  if (!bubbleEl) return;
  bubbleEl.classList.remove('is-visible');
  isVisible = false;
  isProcessing = false;
  aiMenuOpen = false;
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
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        hideBubble();
      }
    }, 100);
  });
}
