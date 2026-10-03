/**
 * Emoji Picker & In-Page Quick Insertion Engine
 *
 * Provides a categorized, searchable emoji picker popover
 * that inserts selected emojis directly into the current text cursor
 * in active contenteditable notebook writing areas.
 */

import { getActiveEditableArea, restoreCurrentSelection, saveCurrentSelection } from './formatter.js';

export const EMOJI_CATEGORIES = [
  {
    id: 'notes',
    name: 'Ghi chú',
    icon: '📝',
    emojis: [
      '✍️', '📌', '💡', '⭐', '🎯', '📖', '📚', '🔖', '📑', '🖋️',
      '📝', '✏️', '🔍', '📅', '⏰', '⚡', '🔔', '🏆', '💎', '🔑',
      '📦', '🎨', '🧪', '📈', '💬', '💭', '🗂️', '📋', '🏷️', '📎'
    ]
  },
  {
    id: 'faces',
    name: 'Cảm xúc',
    icon: '😀',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
      '🙂', '😉', '😍', '🥰', '😘', '😋', '😛', '🤔', '🤫', '🤐',
      '🤨', '😐', '😑', '😶', '🥱', '😴', '😌', '🤤', '😷', '🤒',
      '🤯', '🥳', '😎', '🤓', '🧐', '🤩', '😭', '😱', '🥺', '😳'
    ]
  },
  {
    id: 'gestures',
    name: 'Cử chỉ',
    icon: '👍',
    emojis: [
      '👍', '👎', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅',
      '🤳', '💪', '👈', '👉', '👆', '👇', '☝️', '✌️', '🤞', '🤟',
      '🤘', '🤙', '🖐️', '✋', '👌', '👋', '👊', '✊', '🤛', '🤜'
    ]
  },
  {
    id: 'symbols',
    name: 'Ký hiệu',
    icon: '🌟',
    emojis: [
      '✅', '❌', '⚠️', '❓', '❗', '💯', '🔥', '✨', '💥', '💫',
      '💖', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🚀',
      '🏁', '🚩', '⛔', '🚫', '💤', '💢', '🎉', '🎊', '🎁', '🎈'
    ]
  },
  {
    id: 'arrows',
    name: 'Mũi tên & Số',
    icon: '➔',
    emojis: [
      '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟',
      '➔', '➜', '➡️', '⬅️', '⬆️', '⬇️', '🔄', '🔁', '➕', '➖',
      '🟢', '🟡', '🔴', '🟣', '🔵', '⚪', '⚫', '🟤', '🔶', '🔷'
    ]
  }
];

let activeCategory = 'notes';
let searchQuery = '';

/**
 * Inserts emoji character at the active cursor position
 * @param {string} emoji
 */
export function insertEmojiAtCaret(emoji) {
  const editable = getActiveEditableArea();
  if (!editable) return;

  editable.focus();
  restoreCurrentSelection();

  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    if (editable.contains(range.commonAncestorContainer)) {
      range.deleteContents();
      const textNode = document.createTextNode(emoji);
      range.insertNode(textNode);

      // Advance caret after emoji
      const newRange = document.createRange();
      newRange.setStartAfter(textNode);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      saveCurrentSelection();

      editable.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
  }

  // Fallback if no valid range inside editable: append to end
  const textNode = document.createTextNode(emoji);
  editable.appendChild(textNode);
  editable.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Renders the Emoji Picker markup inside a container
 * @param {HTMLElement} container
 */
export function renderEmojiPickerContent(container) {
  if (!container) return;

  const currentCat = EMOJI_CATEGORIES.find(c => c.id === activeCategory) || EMOJI_CATEGORIES[0];
  let visibleEmojis = [];

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    // Search through all categories
    const all = [];
    EMOJI_CATEGORIES.forEach(c => all.push(...c.emojis));
    visibleEmojis = all.filter(e => e.includes(q));
  } else {
    visibleEmojis = currentCat.emojis;
  }

  container.innerHTML = `
    <div class="emoji-picker-header">
      <div class="emoji-search-box">
        <svg class="emoji-search-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" class="emoji-search-input" placeholder="Tìm emoji..." value="${searchQuery}" />
        ${searchQuery ? '<button type="button" class="emoji-search-clear">×</button>' : ''}
      </div>
    </div>

    <div class="emoji-cat-tabs">
      ${EMOJI_CATEGORIES.map(cat => `
        <button type="button" class="emoji-cat-tab ${cat.id === activeCategory ? 'is-active' : ''}" data-cat="${cat.id}" title="${cat.name}">
          <span>${cat.icon}</span>
        </button>
      `).join('')}
    </div>

    <div class="emoji-grid" role="grid">
      ${visibleEmojis.length > 0 ? visibleEmojis.map(emoji => `
        <button type="button" class="emoji-btn" data-emoji="${emoji}" title="${emoji}">${emoji}</button>
      `).join('') : '<div class="emoji-no-results">Không tìm thấy emoji</div>'}
    </div>
  `;

  // Attach search input listener
  const searchInput = container.querySelector('.emoji-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderEmojiPickerContent(container);
      const updatedInput = container.querySelector('.emoji-search-input');
      if (updatedInput) {
        updatedInput.focus();
        updatedInput.setSelectionRange(searchQuery.length, searchQuery.length);
      }
    });
  }

  const clearBtn = container.querySelector('.emoji-search-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchQuery = '';
      renderEmojiPickerContent(container);
    });
  }

  // Category tab clicks
  container.querySelectorAll('.emoji-cat-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.stopPropagation();
      activeCategory = tab.dataset.cat;
      searchQuery = '';
      renderEmojiPickerContent(container);
    });
  });

  // Emoji item clicks
  container.querySelectorAll('.emoji-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const emoji = btn.dataset.emoji;
      if (emoji) {
        insertEmojiAtCaret(emoji);
      }
    });
  });
}
