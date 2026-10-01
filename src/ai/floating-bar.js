/**
 * Corner AI Chat Copilot — Box Chat AI ở góc nhỏ màn hình
 *
 * Sits elegantly in the bottom-right corner of the screen:
 * - Floating trigger button (FAB) + Collapsible Glassmorphic Chat Window
 * - Chat history with interactive messages
 * - 1-Click direct actions on the notebook page:
 *   • ✍️ Gõ máy vào trang (Typewriter animation)
 *   • ✨ Điền toàn bộ trang (Template Autofill)
 *   • ✓ Chèn nhanh vào trang (Insert at caret)
 *   • 📝 Thay thế đoạn chọn (Replace)
 * - Quick action chips (Autofill, Write, Summarize, Grammar fix, Translate)
 * - NO full-screen backdrop so notebook pages remain 100% visible and interactive!
 */

import { processAI, getPreferredModel } from './ai-service.js';

let containerEl = null;
let isOpen = false;
let isProcessing = false;
let onInsertCallback = null;
let getContextCallback = null;

let currentTemplate = 'ruled';
let currentContext = '';

// Chat history state
const messages = [];

const QUICK_ACTIONS = [
  { id: 'autofill', icon: '✨', label: 'Tự điền trang', prompt: 'Hãy điền toàn bộ mẫu trang này với nội dung chất lượng, đầy đủ' },
  { id: 'write',    icon: '✍️', label: 'Viết tiếp',    prompt: 'Hãy viết tiếp các ý sâu sắc và chi tiết cho nội dung trang này' },
  { id: 'summarize',icon: '✂️', label: 'Tóm tắt',     prompt: 'Tóm tắt nội dung chính của trang sổ này thành các gạch đầu dòng súc tích' },
  { id: 'grammar',  icon: '🛠️', label: 'Sửa chính tả', prompt: 'Sửa toàn bộ lỗi chính tả, ngữ pháp và dấu câu trên trang này' },
  { id: 'translate',icon: '🇬🇧', label: 'Dịch EN',      prompt: 'Dịch toàn bộ nội dung của trang này sang Tiếng Anh chuẩn tự nhiên' },
];

function createWidgetHTML() {
  return `
    <!-- Floating Corner Button (FAB) -->
    <button class="ai-corner-fab" id="aiCornerFab" title="Trợ lý AI Copilot (⌘K)" aria-label="Mở Trợ lý AI">
      <span class="ai-fab-icon">✨</span>
      <span class="ai-fab-label">AI Copilot</span>
      <span class="ai-fab-badge"></span>
    </button>

    <!-- Corner Chat Box Window -->
    <div class="ai-corner-chat" id="aiCornerChat" role="dialog" aria-label="AI Chat Copilot" hidden>
      <!-- Header -->
      <div class="ai-chat-header">
        <div class="ai-chat-header-left">
          <span class="ai-chat-icon">✨</span>
          <div class="ai-chat-titles">
            <span class="ai-chat-title">AI Copilot</span>
            <span class="ai-chat-subtitle" id="aiChatPageHint">Trang: ruled</span>
          </div>
          <button class="ai-chat-model-pill" id="aiChatModelPill" title="Nhấp để đổi Model hoặc cấu hình Base URL">
            <span id="aiChatModelLabel">${getPreferredModel()}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
          </button>
        </div>
        <div class="ai-chat-header-actions">
          <button class="ai-chat-action-btn" id="aiChatClearBtn" title="Xóa lịch sử trò chuyện" aria-label="Xóa chat">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
          <button class="ai-chat-action-btn" id="aiChatMinimizeBtn" title="Thu nhỏ (Esc)" aria-label="Thu nhỏ">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
        </div>
      </div>

      <!-- Quick Action Chips -->
      <div class="ai-chat-chips" id="aiChatChips">
        ${QUICK_ACTIONS.map(a => `
          <button type="button" class="ai-chip" data-action="${a.id}" data-prompt="${a.prompt}">
            <span class="ai-chip-icon">${a.icon}</span>
            <span class="ai-chip-text">${a.label}</span>
          </button>
        `).join('')}
      </div>

      <!-- Messages Body -->
      <div class="ai-chat-body" id="aiChatBody">
        <!-- Rendered messages -->
      </div>

      <!-- Thinking Indicator -->
      <div class="ai-chat-thinking" id="aiChatThinking" hidden>
        <div class="ai-thinking-dots">
          <span></span><span></span><span></span>
        </div>
        <span class="ai-thinking-text">AI đang soạn thảo...</span>
      </div>

      <!-- Input Bar -->
      <div class="ai-chat-footer">
        <div class="ai-chat-input-row">
          <textarea id="aiChatInput" class="ai-chat-input"
                    rows="1"
                    placeholder="Nhập yêu cầu viết/sửa trên trang..."
                    autocomplete="off" spellcheck="false"></textarea>
          <button id="aiChatSend" class="ai-chat-send-btn" title="Gửi (Enter)">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
        <div class="ai-chat-hint-row">
          <span>Enter gửi · Shift+Enter xuống dòng · ⌘K ẩn/hiện</span>
        </div>
      </div>
    </div>
  `;
}

function ensureWidget() {
  if (containerEl) return;
  containerEl = document.createElement('div');
  containerEl.id = 'aiCornerCopilotContainer';
  containerEl.className = 'ai-corner-copilot-container';
  containerEl.innerHTML = createWidgetHTML();
  document.body.appendChild(containerEl);

  // Initialize with greeting if empty
  if (messages.length === 0) {
    initGreeting();
  }

  bindWidgetEvents();
}

function initGreeting() {
  messages.push({
    id: 'm-greeting',
    role: 'assistant',
    text: `Chào bạn! Tôi là **AI Copilot** đồng hành cùng trang sổ của bạn. 

Bạn có thể yêu cầu tôi viết ý tưởng, tóm tắt, hoặc bấm **Tự điền trang** phía trên để tôi điền trọn vẹn mẫu sổ này.

Mỗi câu trả lời đều có nút **Gõ máy vào trang ✍️** hoặc **Điền vào trang ✨** để thao tác trực tiếp lên trang giấy ngay bên cạnh!`,
    parsedJson: null,
    time: formatTime(new Date())
  });
}

function formatTime(d) {
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function renderMessages() {
  const body = containerEl.querySelector('#aiChatBody');
  if (!body) return;

  body.innerHTML = messages.map(m => {
    if (m.role === 'user') {
      return `
        <div class="ai-msg ai-msg--user">
          <div class="ai-msg-bubble">${escapeHTML(m.text)}</div>
          <span class="ai-msg-time">${m.time}</span>
        </div>
      `;
    }

    const hasAutofill = Boolean(m.parsedJson);

    return `
      <div class="ai-msg ai-msg--assistant" data-msg-id="${m.id}">
        <div class="ai-msg-header">
          <span class="ai-msg-avatar">✨</span>
          <span class="ai-msg-author">AI Copilot</span>
          <span class="ai-msg-time">${m.time}</span>
        </div>
        <div class="ai-msg-bubble">${formatAssistantText(m.text)}</div>

        <!-- Direct Actions on Page -->
        <div class="ai-msg-actions">
          ${hasAutofill ? `
            <button class="ai-action-btn ai-action-btn--primary" data-action="autofill" data-msg-id="${m.id}" title="Điền toàn bộ các ô của template này">
              ✨ Điền vào trang
            </button>
          ` : ''}
          <button class="ai-action-btn ai-action-btn--typewriter" data-action="typewriter" data-msg-id="${m.id}" title="Gõ chữ từng ký tự mượt mà vào trang sổ">
            ✍️ Gõ máy vào trang
          </button>
          <button class="ai-action-btn" data-action="insert" data-msg-id="${m.id}" title="Chèn nhanh vào con trỏ">
            ✓ Chèn vào trang
          </button>
          <button class="ai-action-btn" data-action="replace" data-msg-id="${m.id}" title="Thay thế đoạn bôi đen">
            📝 Thay thế
          </button>
          <button class="ai-action-btn" data-action="copy" data-msg-id="${m.id}" title="Sao chép văn bản">
            📋 Copy
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Scroll to bottom
  requestAnimationFrame(() => {
    body.scrollTop = body.scrollHeight;
  });

  // Attach action button handlers
  body.querySelectorAll('.ai-action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const msgId = btn.dataset.msgId;
      const msg = messages.find(m => m.id === msgId);
      if (!msg) return;

      if (action === 'copy') {
        navigator.clipboard.writeText(msg.text).then(() => {
          const original = btn.textContent;
          btn.textContent = '✓ Đã copy!';
          setTimeout(() => { btn.textContent = original; }, 1500);
        });
        return;
      }

      if (onInsertCallback) {
        onInsertCallback(action, msg.text, {
          parsedJson: msg.parsedJson,
          template: currentTemplate,
          action
        });

        const original = btn.innerHTML;
        btn.innerHTML = '✓ Đã thao tác trên trang!';
        btn.classList.add('ai-action-btn--success');
        setTimeout(() => {
          btn.innerHTML = original;
          btn.classList.remove('ai-action-btn--success');
        }, 1800);
      }
    });
  });
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatAssistantText(text) {
  if (!text) return '';
  // Basic markdown formatting: bold, code blocks, bullet points, line breaks
  let formatted = escapeHTML(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br/>');
  return formatted;
}

function bindWidgetEvents() {
  const fab = containerEl.querySelector('#aiCornerFab');
  const chat = containerEl.querySelector('#aiCornerChat');
  const minimizeBtn = containerEl.querySelector('#aiChatMinimizeBtn');
  const clearBtn = containerEl.querySelector('#aiChatClearBtn');
  const modelPill = containerEl.querySelector('#aiChatModelPill');
  const input = containerEl.querySelector('#aiChatInput');
  const sendBtn = containerEl.querySelector('#aiChatSend');
  const chips = containerEl.querySelectorAll('.ai-chip');

  // Toggle FAB
  fab.addEventListener('click', () => {
    toggle();
  });

  // Minimize
  minimizeBtn.addEventListener('click', () => {
    close();
  });

  // Clear Chat History
  clearBtn.addEventListener('click', () => {
    messages.length = 0;
    initGreeting();
    renderMessages();
  });

  // Open Settings on Model Pill click
  modelPill.addEventListener('click', () => {
    const settingsBtn = document.getElementById('btnAiSettings');
    if (settingsBtn) settingsBtn.click();
  });

  // Quick Action Chips
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const action = chip.dataset.action;
      const prompt = chip.dataset.prompt;
      submitUserPrompt(prompt, action);
    });
  });

  // Send button
  sendBtn.addEventListener('click', () => {
    const text = input.value.trim();
    if (text) {
      submitUserPrompt(text, 'write');
      input.value = '';
      adjustTextareaHeight(input);
    }
  });

  // Textarea Enter to send
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = input.value.trim();
      if (text) {
        submitUserPrompt(text, 'write');
        input.value = '';
        adjustTextareaHeight(input);
      }
    }
  });

  input.addEventListener('input', () => {
    adjustTextareaHeight(input);
  });
}

function adjustTextareaHeight(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}

async function submitUserPrompt(promptText, action = 'write') {
  if (isProcessing || !promptText.trim()) return;

  let constraints = null;
  // Refresh context from callback if available
  if (typeof getContextCallback === 'function') {
    const pageCtx = getContextCallback();
    if (pageCtx) {
      if (pageCtx.template) currentTemplate = pageCtx.template;
      if (pageCtx.context) currentContext = pageCtx.context;
      if (pageCtx.constraints) constraints = pageCtx.constraints;
      updatePageHint(currentTemplate, constraints);
    }
  }

  // Add user message
  messages.push({
    id: 'm-' + Date.now(),
    role: 'user',
    text: promptText,
    time: formatTime(new Date())
  });

  renderMessages();
  showThinking();

  isProcessing = true;

  try {
    const data = await processAI({
      action,
      prompt: promptText,
      selectedText: action !== 'write' && action !== 'autofill' ? currentContext : '',
      fullContext: currentContext,
      template: currentTemplate,
      constraints,
    });

    let resultText = data.result || '';
    if (action === 'autofill' && data.parsedJson) {
      resultText = formatAutofillPreview(data.parsedJson);
    }

    messages.push({
      id: 'm-' + Date.now(),
      role: 'assistant',
      text: resultText,
      parsedJson: data.parsedJson || null,
      time: formatTime(new Date())
    });

    renderMessages();
  } catch (err) {
    messages.push({
      id: 'm-' + Date.now(),
      role: 'assistant',
      text: `⚠️ **Lỗi**: ${err.message || 'Không thể nhận phản hồi từ AI'}`,
      parsedJson: null,
      time: formatTime(new Date())
    });
    renderMessages();
  } finally {
    isProcessing = false;
    hideThinking();
  }
}

function formatAutofillPreview(json) {
  if (!json) return '';
  const parts = [];
  if (json.topic) parts.push(`📌 **Chủ đề**: ${json.topic}`);
  for (const [key, value] of Object.entries(json)) {
    if (key === 'topic') continue;
    if (typeof value === 'string') {
      parts.push(`【${key.toUpperCase()}】\n${value}`);
    } else if (Array.isArray(value)) {
      parts.push(`【${key.toUpperCase()}】\n` + value.map(v => typeof v === 'object' ? `• ${v.text || JSON.stringify(v)}` : `• ${v}`).join('\n'));
    } else if (typeof value === 'object') {
      parts.push(`【${key.toUpperCase()}】\n` + Object.entries(value).map(([k, v]) => `• ${k}: ${v}`).join('\n'));
    }
  }
  return parts.join('\n\n');
}

function showThinking() {
  const el = containerEl.querySelector('#aiChatThinking');
  if (el) el.hidden = false;
  const body = containerEl.querySelector('#aiChatBody');
  if (body) body.scrollTop = body.scrollHeight;
}

function hideThinking() {
  const el = containerEl.querySelector('#aiChatThinking');
  if (el) el.hidden = true;
}

function updatePageHint(template, constraints) {
  if (!containerEl) return;
  const pageHint = containerEl.querySelector('#aiChatPageHint');
  if (!pageHint) return;
  const t = template || currentTemplate || 'ruled';
  if (constraints) {
    const rem = constraints.remainingLines ?? 15;
    const size = constraints.sheetSize || '480x680px';
    pageHint.textContent = `${t} · ~${rem} dòng · ${size}`;
    pageHint.title = `Mẫu: ${t} | Sức chứa: ~${constraints.totalLineCapacity || 18} dòng | Còn trống: ~${rem} dòng | Cỡ chữ: ${constraints.fontSize || '16px'} | Cỡ giấy: ${size} (${constraints.pageMode || '2-page'})`;
  } else {
    pageHint.textContent = `Trang: ${t}`;
    pageHint.title = `Mẫu trang: ${t}`;
  }
}

// ─── Public API ───

export function updatePageContext(ctx) {
  if (!ctx) return;
  if (ctx.template) currentTemplate = ctx.template;
  if (ctx.context) currentContext = ctx.context;
  updatePageHint(currentTemplate, ctx.constraints);
}

export function open(opts = {}) {
  ensureWidget();

  if (opts.template) currentTemplate = opts.template;
  if (opts.context) currentContext = opts.context;
  if (opts.onInsert) onInsertCallback = opts.onInsert;
  if (opts.getContext) getContextCallback = opts.getContext;

  let constraints = opts.constraints || null;
  if (typeof getContextCallback === 'function') {
    try {
      const pageCtx = getContextCallback();
      if (pageCtx) {
        if (pageCtx.template) currentTemplate = pageCtx.template;
        if (pageCtx.context) currentContext = pageCtx.context;
        if (pageCtx.constraints) constraints = pageCtx.constraints;
      }
    } catch (_) {}
  }

  const chat = containerEl.querySelector('#aiCornerChat');
  const fab = containerEl.querySelector('#aiCornerFab');
  const modelLabel = containerEl.querySelector('#aiChatModelLabel');
  const input = containerEl.querySelector('#aiChatInput');

  updatePageHint(currentTemplate, constraints);
  if (modelLabel) modelLabel.textContent = getPreferredModel();

  chat.hidden = false;
  chat.classList.add('is-open');
  fab.classList.add('is-active');
  isOpen = true;

  renderMessages();

  requestAnimationFrame(() => {
    if (input) input.focus();
  });
}

export function close() {
  if (!containerEl) return;
  const chat = containerEl.querySelector('#aiCornerChat');
  const fab = containerEl.querySelector('#aiCornerFab');
  if (chat) {
    chat.classList.remove('is-open');
    chat.hidden = true;
  }
  if (fab) fab.classList.remove('is-active');
  isOpen = false;
}

export function toggle(opts = {}) {
  if (isOpen) {
    close();
  } else {
    open(opts);
  }
}

export function isBarOpen() {
  return isOpen;
}

// Auto mount corner FAB on load
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ensureWidget());
  } else {
    ensureWidget();
  }
}
