/**
 * Corner AI FAB — Tiny icon in bottom-right corner
 *
 * Just a small ✨ icon that:
 * - Click → opens Notion AI inline bar (same as ⌘K)
 * - Long-press / right-click → could open AI settings
 * No chat window, no message history.
 */

let fabEl = null;

function ensureFab() {
  if (fabEl) return;
  fabEl = document.createElement('button');
  fabEl.id = 'aiCornerFab';
  fabEl.className = 'ai-corner-fab';
  fabEl.title = 'AI Copilot (⌘K)';
  fabEl.setAttribute('aria-label', 'Mở Trợ lý AI');
  fabEl.innerHTML = '<span class="ai-fab-icon">✨</span>';
  document.body.appendChild(fabEl);

  fabEl.addEventListener('click', () => {
    // Import dynamically to avoid circular deps
    const event = new CustomEvent('ai:open-inline');
    window.dispatchEvent(event);
  });
}

// ─── Public API (kept for backward compat) ───

export function open() {
  // Redirect to inline bar
  window.dispatchEvent(new CustomEvent('ai:open-inline'));
}

export function close() {
  // No-op: no chat to close
}

export function toggle() {
  window.dispatchEvent(new CustomEvent('ai:open-inline'));
}

export function isBarOpen() {
  return false; // No chat window anymore
}

export function updatePageContext() {
  // No-op
}

// Auto mount FAB on load
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ensureFab());
  } else {
    ensureFab();
  }
}
