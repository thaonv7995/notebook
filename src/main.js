/**
 * Digital Ruled Notebook Application
 *
 * Architecture: Modular Vanilla ES Modules & Vite
 * Entry Point: Bootstraps state, views, toolbar, templates, full-screen rail,
 * global keyboard shortcuts, and deep-link routing.
 */

import { getState, setState, persistState, replaceState, normalizeState } from './state/store.js';
import { INITIAL_LIBRARY_DATA } from './config/initial-data.js';
import { getEls } from './utils/dom.js';

import {
  applyFontSize,
  applyFontFamily,
  applyLineHeight,
  saveCurrentSelection,
  setLastActiveEditable,
  applyFormattingToTextarea
} from './editor/formatter.js';

import {
  renderBookPages,
  openNotebook,
  returnToLibrary,
  setupReaderListeners,
  setReaderCallbacks,
  turnPageForward,
  turnPageBackward,
  jumpToPage,
  addPageToCurrentBook,
  changePageTemplate,
  applyPageMode,
  zoomIn,
  zoomOut,
  resetZoom,
  handleFitPage,
  handleFitWidth,
  saveActivePages
} from './components/reader.js';

import {
  renderLibraryGrid,
  setupLibraryListeners,
  setLibraryCallbacks
} from './components/library.js';

import {
  setupToolbarListeners,
  applyToolbarCollapse,
  closeAllPopoverMenus
} from './components/toolbar.js';

import {
  setupFullscreenListeners,
  updateFullscreenRailControls,
  isFullscreenActive,
  toggleFullscreen,
  exitFullscreen,
  closeFullscreenToolsPanel
} from './components/fullscreen.js';

import {
  setupModalListeners,
  showToast,
  closeNewNotebookModal
} from './components/modal.js';

import {
  setupRouting,
  handleRouteFromUrl,
  updateUrl,
  copyCurrentBookUrl
} from './router/router.js';

/**
 * Setup Cross-Component Callback Contracts
 */
function setupComponentCallbacks() {
  setLibraryCallbacks({
    onOpenNotebook: (id) => openNotebook(id),
    onCopyLink: () => copyCurrentBookUrl()
  });

  setReaderCallbacks({
    onUrlUpdate: (route, replace) => updateUrl(route, replace),
    onFullscreenUpdate: () => updateFullscreenRailControls()
  });
}

/**
 * Global Keyboard Shortcuts & Event Handlers
 */
function setupGlobalKeyAndWindowListeners() {
  const els = getEls();

  // Selection change tracking for active editable area
  document.addEventListener('selectionchange', () => {
    const act = document.activeElement;
    if (act && act.classList && act.classList.contains('template-writing-area')) {
      setLastActiveEditable(act);
      saveCurrentSelection();
    }
  });

  // Close popovers and floating panels on click outside
  document.addEventListener('click', (e) => {
    const isInsideColor = (els.fmtColorPalette && els.fmtColorPalette.contains(e.target)) || (els.fmtColorBtn && els.fmtColorBtn.contains(e.target));
    const isInsideBg = (els.fmtBgPalette && els.fmtBgPalette.contains(e.target)) || (els.fmtBgBtn && els.fmtBgBtn.contains(e.target));
    const isInsidePdfExport = (els.pdfExportMenu && els.pdfExportMenu.contains(e.target)) || (els.exportPrintBtn && els.exportPrintBtn.contains(e.target));
    const isInsideLh = (els.lineHeightMenu && els.lineHeightMenu.contains(e.target)) || (els.btnLineHeightSettings && els.btnLineHeightSettings.contains(e.target));
    const isInsideMore = (els.toolbarMoreMenu && els.toolbarMoreMenu.contains(e.target)) || (els.btnToolbarMore && els.btnToolbarMore.contains(e.target));

    if (!isInsideColor && !isInsideBg && !isInsidePdfExport && !isInsideLh && !isInsideMore) {
      closeAllPopoverMenus();
    }

    if (els.fullscreenToolsPanel && !els.fullscreenToolsPanel.hidden && els.fullscreenToolsPanel.classList.contains('is-open')) {
      const isInsideFsTools = els.fullscreenToolsPanel.contains(e.target) || (els.btnFullscreenChrome && els.btnFullscreenChrome.contains(e.target));
      if (!isInsideFsTools) {
        closeFullscreenToolsPanel();
      }
    }
  });

  // Global keydown listeners
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (els.newNotebookModal && els.newNotebookModal.classList.contains('open')) {
        closeNewNotebookModal();
        return;
      }
      if (els.fullscreenToolsPanel && !els.fullscreenToolsPanel.hidden && els.fullscreenToolsPanel.classList.contains('is-open')) {
        closeFullscreenToolsPanel();
        return;
      }
      if (isFullscreenActive()) {
        exitFullscreen();
        return;
      }
    }

    if (e.key === 'F11' || (e.altKey && e.key === 'Enter')) {
      e.preventDefault();
      toggleFullscreen();
      return;
    }

    const isMod = e.ctrlKey || e.metaKey;
    if (isMod && e.key === '\\') {
      e.preventDefault();
      const state = getState();
      applyToolbarCollapse(!state.toolbarCollapsed, true);
      return;
    }
  });

  // Save on blur & unload
  window.addEventListener('blur', saveActivePages);
  window.addEventListener('beforeunload', saveActivePages);

  // Arrow keys for page turning and Zoom shortcuts
  window.addEventListener('keydown', (e) => {
    if (els.notebookView.classList.contains('hidden')) return;

    const activeEl = document.activeElement;
    const isMod = e.ctrlKey || e.metaKey;

    // Ctrl/Cmd + / - / 0 Zoom shortcuts
    if (isMod && (e.key === '=' || e.key === '+' || e.key === '-' || e.key === '_' || e.key === '0')) {
      e.preventDefault();
      if (e.key === '=' || e.key === '+') {
        zoomIn();
      } else if (e.key === '-' || e.key === '_') {
        zoomOut();
      } else if (e.key === '0') {
        resetZoom();
      }
      return;
    }

    // Handle Cmd/Ctrl shortcuts in textareas & inputs
    if (isMod && activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT')) {
      const k = e.key.toLowerCase();
      if (k === 'b') {
        e.preventDefault();
        applyFormattingToTextarea(activeEl, 'bold');
        return;
      } else if (k === 'i') {
        e.preventDefault();
        applyFormattingToTextarea(activeEl, 'italic');
        return;
      } else if (k === 'u') {
        e.preventDefault();
        applyFormattingToTextarea(activeEl, 'underline');
        return;
      } else if (k === 's') {
        e.preventDefault();
        saveActivePages();
        return;
      }
    }

    if (activeEl) {
      const tag = activeEl.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT' || activeEl.isContentEditable || activeEl.classList.contains('ProseMirror')) {
        return;
      }
    }

    if (e.key === 'ArrowRight') turnPageForward();
    if (e.key === 'ArrowLeft') turnPageBackward();
  });
}

/**
 * Main Application Bootstrapper
 */
function init() {
  setupComponentCallbacks();

  // Setup module listeners
  setupLibraryListeners({
    onReturnToLibrary: () => returnToLibrary()
  });

  setupReaderListeners({
    onCopyBookLink: () => copyCurrentBookUrl()
  });

  setupToolbarListeners();

  setupFullscreenListeners({
    onTurnBackward: () => turnPageBackward(),
    onTurnForward: () => turnPageForward(),
    onAddPage: () => addPageToCurrentBook(),
    onJumpToPage: (p) => jumpToPage(p),
    onPageModeChange: (m) => applyPageMode(m),
    onChangeTemplate: (t) => changePageTemplate(t),
    onZoomIn: () => zoomIn(),
    onZoomOut: () => zoomOut(),
    onResetZoom: () => resetZoom(),
    onFitPage: () => handleFitPage(),
    onFitWidth: () => handleFitWidth()
  });

  setupModalListeners({
    onNotebookCreated: (newId) => openNotebook(newId)
  });

  setupGlobalKeyAndWindowListeners();
  setupRouting();

  // Apply visual configurations from persisted state
  const state = getState();
  persistState();
  applyFontSize(state.fontSize || 16);
  applyFontFamily(state.fontFamily || 'sans');
  applyLineHeight(state.lineHeight || '28');
  applyToolbarCollapse(Boolean(state.toolbarCollapsed), false);

  renderLibraryGrid();

  // Route recovery
  handleRouteFromUrl(true);

  // Register service worker if available
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('./sw.js').catch(error => {
      console.warn('Không thể bật chế độ offline:', error);
    });
  }
}

// Launch application
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
