/**
 * Notion AI Inline Prompt & Review Engine
 *
 * Implements Notion AI inline experience:
 * - Triggers directly on the active notebook page line (via Cmd+J, toolbar button, or Space on empty line)
 * - Appears right at the caret position inside the page sheet
 * - Quick prompt chips (Viết tiếp, Tóm tắt, Lên ý tưởng, Điền mẫu trang, Sửa ngữ pháp, Dịch EN)
 * - Directly streams/inserts formatted HTML into the proper column/writing area (no raw markdown asterisks)
 * - Inline Notion-style review bar ([✓ Giữ lại], [↺ Thử lại], [➕ Dài hơn], [✂️ Ngắn hơn], [✕ Hủy bỏ])
 * - Intelligent element targeting: never dumps notes into Cornell cues column
 */

import { processAI, getPreferredModel } from './ai-service.js';
import { formatContentToHtml } from '../editor/sanitizer.js';
import { getActivePageInfo, applyAiAutofillToCurrentPage, saveActivePages, applyPaperTone, applyPaperTexture } from '../components/reader.js';
import { applyFontSize, applyFontFamily, applyLineHeight } from '../editor/formatter.js';
import { getState, setState, persistState, getActiveNotebook } from '../state/store.js';

let inlineContainerEl = null;
let currentTargetEditable = null;
let currentTargetSheet = null;
let snapshotHtml = null;
let snapshotPageData = null;
let snapshotStyles = null;
let currentAppliedStyles = null;
let lastPromptText = '';
let lastActionType = 'write';
let isGenerating = false;

const NOTION_QUICK_ACTIONS = [
  { id: 'continue',   icon: '✍️', label: 'Viết tiếp',              prompt: 'Hãy đọc nội dung trước đó trên trang và viết tiếp các ý tiếp theo một cách liền mạch, súc tích.' },
  { id: 'summarize',  icon: '📝', label: 'Tóm tắt trang',          prompt: 'Tóm tắt các điểm cốt lõi nhất của trang này thành các gạch đầu dòng ngắn gọn.' },
  { id: 'brainstorm', icon: '💡', label: 'Lên ý tưởng ghi chép',   prompt: 'Lên dàn ý và các ý tưởng quan trọng cho chủ đề của trang này.' },
  { id: 'style',      icon: '🎨', label: 'Tối ưu cỡ chữ & phong cách', prompt: 'Hãy đọc nội dung trang hiện tại và đề xuất chỉnh cỡ chữ (fontSize), phông chữ (fontFamily) và tone giấy (paperTone) phù hợp nhất để vừa khít và đẹp mắt.' },
  { id: 'autofill',   icon: '🎯', label: 'Điền toàn bộ trang mẫu', prompt: 'Tạo nội dung mẫu hoàn chỉnh và điền vào toàn bộ các ô của template này.' },
  { id: 'grammar',    icon: '✏️', label: 'Sửa chính tả & hành văn', prompt: 'Sửa toàn bộ lỗi chính tả, câu từ, diễn đạt cho đoạn văn bản này mượt mà hơn.' },
  { id: 'translate',  icon: '🌐', label: 'Dịch sang Tiếng Anh',    prompt: 'Dịch toàn bộ đoạn văn bản này sang tiếng Anh tự nhiên, chuẩn văn phong ghi chép.' }
];

export function applyPageStyles(styles = {}, persist = true) {
  if (!styles) return;

  if (styles.fontSize) {
    const size = parseInt(styles.fontSize, 10);
    if (!isNaN(size) && size >= 11 && size <= 28) {
      applyFontSize(size);
    }
  }

  if (styles.fontFamily && ['sans', 'vietnam', 'serif', 'kaiti', 'mono', 'dancing', 'caveat', 'patrickhand', 'kalam', 'indieflower'].includes(styles.fontFamily)) {
    applyFontFamily(styles.fontFamily);
  }

  if (styles.lineHeight && ['24', '28', '32', '36', '42', 'none'].includes(String(styles.lineHeight))) {
    applyLineHeight(String(styles.lineHeight));
  }

  if (styles.paperTone && ['cream', 'white', 'ivory', 'aged', 'mint', 'rose', 'lavender'].includes(styles.paperTone)) {
    applyPaperTone(styles.paperTone, persist);
  }

  if (styles.paperTexture && ['grain', 'smooth', 'kraft', 'linen', 'washi', 'vellum'].includes(styles.paperTexture)) {
    applyPaperTexture(styles.paperTexture, persist);
  }
}

function getPageStylesSnapshot() {
  const state = getState();
  const nb = getActiveNotebook();
  return {
    fontSize: state.fontSize || 16,
    fontFamily: (nb && nb.fontFamily) || state.fontFamily || 'sans',
    lineHeight: (nb && nb.lineHeight) || state.lineHeight || '28',
    paperTone: state.paperTone || 'cream',
    paperTexture: state.paperTexture || 'grain'
  };
}

/**
 * Finds the best primary writing area for a given template
 */
export function getPrimaryWritingArea(targetSheet, template) {
  if (!targetSheet) return document.querySelector('.template-writing-area');

  // If user already clicked or focused an editable area in this sheet, honor it!
  const active = document.activeElement;
  if (active && targetSheet.contains(active) && active.classList.contains('template-writing-area')) {
    return active;
  }

  // Intelligently pick the main notes area for structured templates
  switch (template) {
    case 'cornell':
      return targetSheet.querySelector('.cornell-notes-text') || targetSheet.querySelector('.template-writing-area');
    case 'work':
      return targetSheet.querySelector('.work-notes-text') || targetSheet.querySelector('.template-writing-area');
    case 'reading':
      return targetSheet.querySelector('.reading-quotes-text') || targetSheet.querySelector('.reading-ideas-text') || targetSheet.querySelector('.template-writing-area');
    case 'vocab':
      return targetSheet.querySelector('.vocab-example-text') || targetSheet.querySelector('.vocab-word-text') || targetSheet.querySelector('.template-writing-area');
    case 'charting':
      return targetSheet.querySelector('.charting-notes-text') || targetSheet.querySelector('.charting-col1-text') || targetSheet.querySelector('.template-writing-area');
    case 'quadrant':
      return targetSheet.querySelector('.quadrant-q1-text') || targetSheet.querySelector('.template-writing-area');
    default:
      return targetSheet.querySelector('.template-writing-area');
  }
}

/**
 * Auto-calculates optimal font size so content fits within the page's remaining lines.
 * Returns the adjusted font size (px), or null if no adjustment is needed.
 */
function autoFitFontSize(contentText, constraints, areaEl) {
  if (!contentText?.trim()) return null;

  const currentFontSize = parseInt(constraints.fontSize, 10) || 16;
  const remainingLines = constraints.remainingLines || 15;

  // Get actual area width from DOM for accuracy
  let areaWidth = parseInt(constraints.areaWidth, 10) || 440;
  if (areaEl) {
    const w = areaEl.clientWidth;
    if (w > 0) areaWidth = w - 24; // subtract padding
  }

  const lines = contentText.split('\n');

  // Count how many visual lines this content will take at a given font size
  function countVisualLines(fontSize) {
    const avgCharWidth = fontSize * 0.55;
    const charsPerVisualLine = Math.max(15, Math.floor(areaWidth / avgCharWidth));
    let total = 0;
    for (const line of lines) {
      if (!line.trim()) { total += 1; continue; }
      total += Math.max(1, Math.ceil(line.length / charsPerVisualLine));
    }
    return total;
  }

  // Check if it fits at current font size
  if (countVisualLines(currentFontSize) <= remainingLines) {
    return null; // fits fine, no change
  }

  // Find the largest font size that makes content fit (search downward)
  for (let testSize = currentFontSize - 1; testSize >= 11; testSize--) {
    if (countVisualLines(testSize) <= remainingLines) {
      return testSize;
    }
  }

  return 11; // minimum readable size
}

/**
 * Calculates page spatial constraints for the current active sheet
 */
function getSheetConstraints(sheetEl, template) {
  const state = getState();
  const fontSize = state.fontSize || 16;
  const lineHeight = parseInt(state.lineHeight || '28', 10) || 28;
  const pageMode = state.pageMode || '2-page';

  let sheetWidth = 480;
  let sheetHeight = 680;
  if (sheetEl) {
    const rect = sheetEl.getBoundingClientRect();
    if (rect.width > 0) sheetWidth = Math.round(rect.width);
    if (rect.height > 0) sheetHeight = Math.round(rect.height);
  }

  const primaryArea = getPrimaryWritingArea(sheetEl, template);
  let areaWidth = sheetWidth - 48; // default padding
  let areaHeight = pageMode === '1-page' ? 620 : 480;
  let currentTextLines = 0;
  if (primaryArea) {
    areaWidth = primaryArea.clientWidth || areaWidth;
    areaHeight = primaryArea.clientHeight || areaHeight;
    const txt = primaryArea.innerText || '';
    if (txt.trim()) {
      currentTextLines = txt.split('\n').filter(Boolean).length;
    }
  }

  const totalLineCapacity = Math.max(10, Math.floor(areaHeight / lineHeight));
  const remainingLines = Math.max(3, totalLineCapacity - currentTextLines);

  // Calculate approx chars that fit per line (average char width ≈ 0.55 * fontSize for Latin/Vietnamese)
  const avgCharWidth = fontSize * 0.55;
  const charsPerLine = Math.max(20, Math.floor(areaWidth / avgCharWidth));

  return {
    pageMode,
    sheetSize: `${sheetWidth}x${sheetHeight}px`,
    fontSize: `${fontSize}px`,
    lineHeight: `${lineHeight}px`,
    areaWidth: `${areaWidth}px`,
    charsPerLine,
    totalLineCapacity,
    currentTextLines,
    remainingLines,
    template
  };
}

/**
 * Creates the Notion AI inline bar container
 */
function ensureInlineBar() {
  if (inlineContainerEl) return;

  inlineContainerEl = document.createElement('div');
  inlineContainerEl.id = 'aiNotionInlineBar';
  inlineContainerEl.className = 'ai-notion-bar-wrapper';
  inlineContainerEl.hidden = true;

  inlineContainerEl.innerHTML = `
    <div class="ai-notion-card" role="dialog" aria-label="Notion AI Inline Bar">
      <!-- Input State -->
      <div class="ai-notion-input-section" id="aiNotionInputSection">
        <div class="ai-notion-input-row">
          <span class="ai-notion-sparkle-icon" title="Notion AI Co-pilot">✨</span>
          <input type="text"
                 id="aiNotionInput"
                 class="ai-notion-input"
                 placeholder="Hỏi AI viết tiếp, tóm tắt, hoặc chọn thao tác bên dưới..."
                 autocomplete="off"
                 spellcheck="false" />
          <button type="button" class="ai-notion-btn-submit" id="aiNotionSubmit" title="Chạy AI (Enter)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
          <button type="button" class="ai-notion-btn-close" id="aiNotionClose" title="Đóng (Esc)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <!-- Quick Action Menu -->
        <div class="ai-notion-actions-menu" id="aiNotionActionsMenu">
          ${NOTION_QUICK_ACTIONS.map((a, idx) => `
            <button type="button" class="ai-notion-action-item" data-action="${a.id}" data-prompt="${a.prompt}" data-index="${idx}">
              <span class="ai-notion-action-icon">${a.icon}</span>
              <span class="ai-notion-action-label">${a.label}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Generating Shimmer State -->
      <div class="ai-notion-generating-section" id="aiNotionGeneratingSection" hidden>
        <div class="ai-notion-shimmer-bar">
          <div class="ai-notion-shimmer-line"></div>
        </div>
        <div class="ai-notion-generating-status">
          <span class="ai-notion-sparkle-spin">✨</span>
          <span class="ai-notion-generating-text">AI đang viết trực tiếp vào trang...</span>
          <button type="button" class="ai-notion-cancel-btn" id="aiNotionCancelBtn">Dừng (Esc)</button>
        </div>
      </div>

      <!-- Review State (After generation) -->
      <div class="ai-notion-review-section" id="aiNotionReviewSection" hidden>
        <div class="ai-notion-review-header">
          <span class="ai-notion-review-badge">✨ AI đã điền xong</span>
          <span class="ai-notion-review-hint">Bạn có muốn giữ lại nội dung này?</span>
        </div>
        <div class="ai-notion-review-actions">
          <button type="button" class="ai-notion-review-btn ai-notion-review-btn--accept" id="aiNotionAccept" title="Giữ lại nội dung (Enter)">
            ✓ Giữ lại
          </button>
          <button type="button" class="ai-notion-review-btn" id="aiNotionRetry" title="AI viết lại cách khác">
            ↺ Thử lại
          </button>
          <button type="button" class="ai-notion-review-btn" id="aiNotionLonger" title="Viết dài hơn & sâu hơn">
            ➕ Dài hơn
          </button>
          <button type="button" class="ai-notion-review-btn" id="aiNotionShorter" title="Rút gọn súc tích">
            ✂️ Ngắn hơn
          </button>
          <button type="button" class="ai-notion-review-btn ai-notion-review-btn--discard" id="aiNotionDiscard" title="Hủy bỏ và khôi phục nội dung cũ (Esc)">
            ✕ Hủy bỏ
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(inlineContainerEl);
  bindInlineBarEvents();
}

/**
 * Binds DOM events for the inline bar
 */
function bindInlineBarEvents() {
  const input = inlineContainerEl.querySelector('#aiNotionInput');
  const submitBtn = inlineContainerEl.querySelector('#aiNotionSubmit');
  const closeBtn = inlineContainerEl.querySelector('#aiNotionClose');
  const cancelBtn = inlineContainerEl.querySelector('#aiNotionCancelBtn');
  const acceptBtn = inlineContainerEl.querySelector('#aiNotionAccept');
  const retryBtn = inlineContainerEl.querySelector('#aiNotionRetry');
  const longerBtn = inlineContainerEl.querySelector('#aiNotionLonger');
  const shorterBtn = inlineContainerEl.querySelector('#aiNotionShorter');
  const discardBtn = inlineContainerEl.querySelector('#aiNotionDiscard');
  const actionItems = inlineContainerEl.querySelectorAll('.ai-notion-action-item');

  // Submit on Enter
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = input.value.trim();
      if (val) {
        handleExecutePrompt(val, 'write');
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeNotionAiBar();
    }
  });

  submitBtn.addEventListener('click', () => {
    const val = input.value.trim();
    if (val) {
      handleExecutePrompt(val, 'write');
    }
  });

  closeBtn.addEventListener('click', () => {
    closeNotionAiBar();
  });

  cancelBtn.addEventListener('click', () => {
    handleDiscard();
  });

  // Action chips
  actionItems.forEach(item => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      const prompt = item.dataset.prompt;
      handleExecutePrompt(prompt, action);
    });
  });

  // Review Buttons
  acceptBtn.addEventListener('click', () => handleAccept());
  retryBtn.addEventListener('click', () => handleRetry());
  longerBtn.addEventListener('click', () => handleLonger());
  shorterBtn.addEventListener('click', () => handleShorter());
  discardBtn.addEventListener('click', () => handleDiscard());

  // Global keydown handler when review section is visible
  window.addEventListener('keydown', (e) => {
    if (inlineContainerEl.hidden) return;
    const reviewSec = inlineContainerEl.querySelector('#aiNotionReviewSection');
    if (!reviewSec || reviewSec.hidden) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      handleDiscard();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAccept();
    }
  });
}

/**
 * Positions the inline bar directly below current caret or target line
 */
function positionInlineBar(targetEl, sheetEl) {
  if (!inlineContainerEl || !sheetEl) return;

  const sheetRect = sheetEl.getBoundingClientRect();
  const sel = window.getSelection();

  let top = sheetRect.top + 60;
  let left = sheetRect.left + 24;
  let width = Math.min(sheetRect.width - 48, 420);

  if (targetEl) {
    const targetRect = targetEl.getBoundingClientRect();
    width = Math.min(targetRect.width, 420);
    left = targetRect.left;

    // Check if caret has active position inside targetEl
    if (sel && sel.rangeCount > 0 && targetEl.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      const rangeRect = range.getBoundingClientRect();
      if (rangeRect && rangeRect.bottom > 0) {
        top = rangeRect.bottom + 8;
      } else {
        top = targetRect.top + 30;
      }
    } else {
      // Place near top of target element
      top = targetRect.top + 16;
    }
  }

  // Prevent overflowing bottom of viewport
  const maxTop = window.innerHeight - 340;
  if (top > maxTop) top = maxTop;
  if (top < 70) top = 70;

  // Prevent overflowing right of viewport
  if (left + width > window.innerWidth - 20) {
    left = window.innerWidth - width - 20;
  }
  if (left < 20) left = 20;

  inlineContainerEl.style.top = `${Math.round(top)}px`;
  inlineContainerEl.style.left = `${Math.round(left)}px`;
  inlineContainerEl.style.width = `${Math.round(width)}px`;
}

/**
 * Opens Notion AI inline bar at current line
 */
export function openNotionAiBar(opts = {}) {
  ensureInlineBar();

  const pageInfo = getActivePageInfo();
  if (!pageInfo || !pageInfo.targetSheet) {
    console.warn('No active page sheet found for Notion AI inline');
    return;
  }

  currentTargetSheet = pageInfo.targetSheet;
  const template = pageInfo.template || 'ruled';

  // Determine target editable element
  currentTargetEditable = opts.targetEl || getPrimaryWritingArea(currentTargetSheet, template);
  if (!currentTargetEditable) {
    currentTargetEditable = currentTargetSheet.querySelector('.template-writing-area');
  }

  // Snapshot original state for discard
  if (currentTargetEditable) {
    snapshotHtml = currentTargetEditable.innerHTML;
  }
  if (pageInfo.page) {
    snapshotPageData = JSON.parse(JSON.stringify(pageInfo.page));
  }
  snapshotStyles = getPageStylesSnapshot();
  currentAppliedStyles = null;

  // Reset UI sections
  inlineContainerEl.querySelector('#aiNotionInputSection').hidden = false;
  inlineContainerEl.querySelector('#aiNotionGeneratingSection').hidden = true;
  inlineContainerEl.querySelector('#aiNotionReviewSection').hidden = true;

  const input = inlineContainerEl.querySelector('#aiNotionInput');
  input.value = opts.initialPrompt || '';

  positionInlineBar(currentTargetEditable, currentTargetSheet);
  inlineContainerEl.hidden = false;
  inlineContainerEl.classList.add('is-active');

  requestAnimationFrame(() => {
    input.focus();
    if (input.value) input.select();
  });
}

/**
 * Closes Notion AI inline bar
 */
export function closeNotionAiBar() {
  if (!inlineContainerEl) return;
  inlineContainerEl.hidden = true;
  inlineContainerEl.classList.remove('is-active');
  isGenerating = false;
}

/**
 * Executes an AI prompt directly into the page
 */
async function handleExecutePrompt(promptText, actionType = 'write') {
  if (isGenerating || !promptText.trim()) return;
  isGenerating = true;
  lastPromptText = promptText;
  lastActionType = actionType;

  // Show generating UI
  inlineContainerEl.querySelector('#aiNotionInputSection').hidden = true;
  inlineContainerEl.querySelector('#aiNotionGeneratingSection').hidden = false;
  inlineContainerEl.querySelector('#aiNotionReviewSection').hidden = true;

  const pageInfo = getActivePageInfo();
  const template = pageInfo?.template || 'ruled';
  const sheetEl = currentTargetSheet || pageInfo?.targetSheet;
  const constraints = getSheetConstraints(sheetEl, template);

  // Collect existing text context
  let currentContext = '';
  if (currentTargetEditable) {
    currentContext = currentTargetEditable.innerText || '';
  }

  try {
    const res = await processAI({
      action: actionType,
      prompt: promptText,
      selectedText: '',
      fullContext: currentContext.slice(0, 1200),
      template,
      constraints
    });

    if (!res.ok) {
      throw new Error(res.error || 'Lỗi khi gọi AI');
    }

    // 1. If Autofill JSON returned
    if (res.parsedJson && actionType === 'autofill') {
      applyAiAutofillToCurrentPage(res.parsedJson);
    } else if (res.parsedJson?.type !== 'style_update') {
      const rawText = res.result || '';

      // ── Auto-fit font size BEFORE insertion ──
      // If content would overflow page at current font size, auto-reduce
      const fittedSize = autoFitFontSize(rawText, constraints, currentTargetEditable);
      if (fittedSize !== null) {
        const autoStyles = { fontSize: fittedSize };
        // Track for discard rollback
        if (!currentAppliedStyles) currentAppliedStyles = {};
        currentAppliedStyles.fontSize = fittedSize;
        applyPageStyles(autoStyles, false);
      }

      // ── Try to extract inline styles JSON from AI text ──
      // Some models embed {"styles": {...}} at the end of their response
      let cleanedText = rawText;
      const stylesMatch = rawText.match(/\{[\s\S]*"styles"\s*:\s*\{[^}]+\}[\s\S]*\}\s*$/);
      if (stylesMatch) {
        try {
          const extracted = JSON.parse(stylesMatch[0]);
          if (extracted.styles) {
            if (!currentAppliedStyles) currentAppliedStyles = {};
            Object.assign(currentAppliedStyles, extracted.styles);
            applyPageStyles(extracted.styles, false);
          }
          // Remove the JSON block from content text
          cleanedText = rawText.replace(stylesMatch[0], '').trim();
        } catch { /* ignore parse errors */ }
      }

      // 2. Direct text insertion formatted as clean HTML
      const formattedHtml = formatContentToHtml(cleanedText);
      if (currentTargetEditable) {
        const existingHtml = currentTargetEditable.innerHTML.trim();
        if (!existingHtml || existingHtml === '<br>') {
          currentTargetEditable.innerHTML = formattedHtml;
        } else {
          // Each line is already inside a <div> from formatContentToHtml,
          // so just concatenate — no bare <br> that would break grid alignment
          currentTargetEditable.innerHTML = existingHtml + formattedHtml;
        }
        currentTargetEditable.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    // 3. Apply style updates if suggested or requested
    if (res.parsedJson?.styles) {
      if (!currentAppliedStyles) currentAppliedStyles = {};
      Object.assign(currentAppliedStyles, res.parsedJson.styles);
      applyPageStyles(res.parsedJson.styles, false);
      const hint = inlineContainerEl.querySelector('.ai-notion-review-hint');
      if (hint) {
        const parts = [];
        if (res.parsedJson.styles.fontSize) parts.push(`Cỡ ${res.parsedJson.styles.fontSize}px`);
        if (res.parsedJson.styles.fontFamily) parts.push(`Font ${res.parsedJson.styles.fontFamily}`);
        if (res.parsedJson.styles.paperTone) parts.push(`Giấy ${res.parsedJson.styles.paperTone}`);
        hint.textContent = `Đã tự chỉnh style: ${parts.join(' · ')}. Bạn có muốn giữ lại?`;
      }
    } else if (res.parsedJson?.type === 'style_update') {
      const hint = inlineContainerEl.querySelector('.ai-notion-review-hint');
      if (hint) hint.textContent = res.parsedJson.message || 'Đã áp dụng các điều chỉnh giao diện.';
    } else if (currentAppliedStyles?.fontSize) {
      // Auto-fit was applied — notify user
      const hint = inlineContainerEl.querySelector('.ai-notion-review-hint');
      if (hint) {
        hint.textContent = `Tự động giảm cỡ chữ → ${currentAppliedStyles.fontSize}px để vừa trang. Bạn có muốn giữ lại?`;
      }
    }

    // Move to Review State
    isGenerating = false;
    inlineContainerEl.querySelector('#aiNotionGeneratingSection').hidden = true;
    inlineContainerEl.querySelector('#aiNotionReviewSection').hidden = false;

    // Reposition bar right below the newly inserted content
    positionInlineBar(currentTargetEditable, currentTargetSheet);
  } catch (err) {
    console.error('Notion AI execution error:', err);
    alert(`Không thể hoàn thành yêu cầu: ${err.message}`);
    handleDiscard();
  }
}

/**
 * Review Action: Keep content and save
 */
function handleAccept() {
  if (currentAppliedStyles) {
    applyPageStyles(currentAppliedStyles, true);
    currentAppliedStyles = null;
    snapshotStyles = null;
  }
  saveActivePages();
  closeNotionAiBar();
}

/**
 * Review Action: Discard and restore previous state
 */
function handleDiscard() {
  if (snapshotStyles) {
    applyPageStyles(snapshotStyles, true);
    snapshotStyles = null;
    currentAppliedStyles = null;
  }

  if (snapshotHtml !== null && currentTargetEditable) {
    currentTargetEditable.innerHTML = snapshotHtml;
    currentTargetEditable.dispatchEvent(new Event('input', { bubbles: true }));
  }

  if (snapshotPageData && lastActionType === 'autofill') {
    const pageInfo = getActivePageInfo();
    if (pageInfo && pageInfo.page) {
      Object.assign(pageInfo.page, snapshotPageData);
      saveActivePages();
    }
  }

  closeNotionAiBar();
}

/**
 * Review Action: Try again
 */
function handleRetry() {
  // Revert first
  if (snapshotHtml !== null && currentTargetEditable) {
    currentTargetEditable.innerHTML = snapshotHtml;
  }
  handleExecutePrompt(lastPromptText, lastActionType);
}

/**
 * Review Action: Make longer
 */
function handleLonger() {
  const followUpPrompt = `${lastPromptText}. Hãy viết chi tiết hơn, mở rộng các luận điểm sâu sắc hơn nhưng vừa vặn với kích thước trang.`;
  handleExecutePrompt(followUpPrompt, 'expand');
}

/**
 * Review Action: Make shorter
 */
function handleShorter() {
  const followUpPrompt = `${lastPromptText}. Hãy rút gọn lại thật súc tích, cô đọng, loại bỏ từ thừa để vừa khít trang.`;
  handleExecutePrompt(followUpPrompt, 'summarize');
}

/**
 * Sets up global listeners for Notion AI shortcuts
 */
export function setupNotionAiListeners() {
  // Shortcut: Cmd+J or Ctrl+J to toggle Notion AI
  window.addEventListener('keydown', (e) => {
    const isMod = e.metaKey || e.ctrlKey;
    if (isMod && (e.key === 'j' || e.key === 'J')) {
      e.preventDefault();
      if (!inlineContainerEl || inlineContainerEl.hidden) {
        openNotionAiBar();
      } else {
        closeNotionAiBar();
      }
    }
  });

  // Space on empty line trigger inside any .template-writing-area
  document.addEventListener('keydown', (e) => {
    if (e.key !== ' ' && e.key !== 'Spacebar') return;
    const active = document.activeElement;
    if (!active || !active.classList.contains('template-writing-area')) return;

    // Check if the current line/text is empty
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    const fullText = (active.innerText || '').trim();
    if (fullText.length === 0) {
      // Empty document: pressing space triggers AI!
      e.preventDefault();
      openNotionAiBar({ targetEl: active });
    }
  });
}
