/**
 * Corner AI FAB — Tiny icon in bottom-right corner
 *
 * Just a small ✨ icon that:
 * - Click → opens Notion AI inline bar (same as ⌘K)
 * - Long-press / right-click → could open AI settings
 * No chat window, no message history.
 */

let fabEl = null;

export function ensureFab() {
  if (fabEl) return fabEl;
  fabEl = document.createElement('button');
  fabEl.id = 'aiCornerFab';
  fabEl.className = 'ai-corner-fab';
  fabEl.title = 'AI Copilot (⌘K)';
  fabEl.setAttribute('aria-label', 'Mở Trợ lý AI');
  fabEl.innerHTML = '<span class="ai-fab-icon">✨</span>';
  document.body.appendChild(fabEl);

  fabEl.addEventListener('click', () => {
    if (fabEl.classList.contains('is-generating')) {
      window.dispatchEvent(new CustomEvent('ai:stop-generation'));
      return;
    }
    const event = new CustomEvent('ai:open-inline');
    window.dispatchEvent(event);
  });

  return fabEl;
}

export function setCornerFabGenerating(isGenerating) {
  const el = ensureFab();
  if (!el) return;
  if (isGenerating) {
    el.classList.add('is-generating');
    el.title = 'AI đang viết vào trang... Bấm để dừng (Esc)';
    el.setAttribute('aria-label', 'AI đang viết. Bấm để dừng');
  } else {
    el.classList.remove('is-generating');
    el.title = 'AI Copilot (⌘K)';
    el.setAttribute('aria-label', 'Mở Trợ lý AI');
  }
}

export function setFabVisible(visible) {
  const el = ensureFab();
  if (!el) return;
  if (visible) {
    el.classList.add('is-visible');
    el.style.display = 'flex';
  } else {
    el.classList.remove('is-visible');
    el.style.display = 'none';
  }
}

export function updateFabVisibility() {
  const nbView = document.getElementById('notebookView');
  const isNotebookActive = nbView && !nbView.classList.contains('hidden');
  setFabVisible(isNotebookActive);
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

// Auto mount FAB on load and sync visibility with #notebookView
if (typeof document !== 'undefined') {
  const init = () => {
    ensureFab();
    updateFabVisibility();
    const nbView = document.getElementById('notebookView');
    if (nbView) {
      const observer = new MutationObserver(() => updateFabVisibility());
      observer.observe(nbView, { attributes: true, attributeFilter: ['class'] });
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
