/**
 * Digital Ruled Notebook Application
 *
 * Architecture: Modular Vanilla ES Modules & Vite
 * Entry Point: Bootstraps state, views, toolbar, templates, full-screen rail,
 * global keyboard shortcuts, and deep-link routing.
 */

import { getState, setState, persistState, replaceState, normalizeState, setOnPersist } from './state/store.js';
import { INITIAL_LIBRARY_DATA } from './config/initial-data.js';
import { getEls } from './utils/dom.js';
import { checkAndRenderPdfExport } from './export/export-view.js';

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
  applyPaperTone,
  applyPaperTexture,
  togglePageDrawer,
  closePageDrawer,
  zoomIn,
  zoomOut,
  resetZoom,
  handleFitPage,
  handleFitWidth,
  saveActivePages,
  getActivePageInfo,
  applyAiAutofillToCurrentPage
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
  closeNewNotebookModal,
  closeChangePasswordModal
} from './components/modal.js';

import './ai/floating-bar.js'; // Mounts tiny corner FAB

import { setupSelectionListener as setupAiSelectionListener } from './ai/selection-bubble.js';
import { toggleSettings as toggleAiSettings, closeSettings as closeAiSettings, openSettings as openAiSettings } from './ai/ai-settings.js';
import { typewriteTextIntoElement } from './ai/typewriter.js';
import {
  openNotionAiBar,
  closeNotionAiBar,
  setupNotionAiListeners,
  getPrimaryWritingArea
} from './ai/notion-inline.js';
import { formatContentToHtml } from './editor/sanitizer.js';
import { initPageOverflowGuard } from './editor/page-overflow-guard.js';

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
      // Close AI inline bar first
      if (document.getElementById('aiNotionInlineBar') && !document.getElementById('aiNotionInlineBar').hidden) {
        closeNotionAiBar();
        return;
      }
      const aiContainer = document.getElementById('aiSettingsContainer');
      if (aiContainer && aiContainer.classList.contains('is-open')) {
        closeAiSettings();
        return;
      }
      if (els.changePasswordModal && els.changePasswordModal.classList.contains('open')) {
        closeChangePasswordModal();
        return;
      }
      if (els.pageNavDrawer && els.pageNavDrawer.classList.contains('is-open')) {
        closePageDrawer();
        return;
      }
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

    // Cmd+K / Ctrl+K — Open AI Command Bar
    if (isMod && e.key === 'k') {
      e.preventDefault();
      openAiCommandBar();
      return;
    }

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

import { login, logout, checkSession, fetchNotebooks, syncNotebooks } from './api/client.js';

let isAuthenticated = false;
let syncTimer = null;
let lastSyncedAt = null;      // Tracks server's last sync timestamp
let serverLoadComplete = false; // Prevents push before first pull completes
const SYNC_DEBOUNCE_MS = 800;

// ─── Auth UI helpers ───

function showLoginScreen() {
  const loginView = document.getElementById('loginView');
  const libraryView = document.getElementById('libraryView');
  const notebookView = document.getElementById('notebookView');
  if (loginView) loginView.classList.remove('hidden');
  if (libraryView) libraryView.classList.add('hidden');
  if (notebookView) notebookView.classList.add('hidden');
}

function hideLoginScreen() {
  const loginView = document.getElementById('loginView');
  const libraryView = document.getElementById('libraryView');
  if (loginView) loginView.classList.add('hidden');
  if (libraryView) libraryView.classList.remove('hidden');
}

function setupLoginForm() {
  const form = document.getElementById('loginForm');
  const errorEl = document.getElementById('loginError');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername')?.value?.trim();
    const password = document.getElementById('loginPassword')?.value;
    if (!username || !password) return;

    const btn = document.getElementById('loginBtn');
    if (btn) btn.disabled = true;
    if (errorEl) errorEl.hidden = true;

    try {
      await login(username, password);
      isAuthenticated = true;
      await loadFromServer();
      hideLoginScreen();
      renderLibraryGrid();
      handleRouteFromUrl(true);
      startSyncListeners();  // Enable cross-device sync
      showToast('Đăng nhập thành công');
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = err.message || 'Sai tên đăng nhập hoặc mật khẩu';
        errorEl.hidden = false;
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}

function setupLogoutButton() {
  const btn = document.getElementById('btnLogout');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    try {
      await logout();
    } catch {}
    isAuthenticated = false;
    serverLoadComplete = false;
    lastSyncedAt = null;
    showLoginScreen();
    showToast('Đã đăng xuất');
  });
}

// ─── Server Sync ───

let pullTimer = null;                 // Periodic background pull
const PULL_INTERVAL_MS = 15_000;      // Poll server every 15 seconds
let isPulling = false;                // Guard against concurrent pulls

/**
 * Deep-merge two notebooks at the PAGE level.
 * For pages that exist on both sides, keeps the one with newer updatedAt.
 * Pages only on one side are always preserved.
 * Notebook-level metadata (title, cover, etc.) comes from whichever side
 * has the newer top-level updatedAt.
 */
function mergeNotebookPages(localNb, serverNb) {
  const localTime = localNb.updatedAt || '';
  const serverTime = serverNb.updatedAt || '';

  // Start from the notebook shell with newer metadata
  const base = serverTime > localTime
    ? JSON.parse(JSON.stringify(serverNb))
    : JSON.parse(JSON.stringify(localNb));

  // Build page maps
  const localPages = new Map();
  (localNb.pages || []).forEach(p => localPages.set(p.id, p));

  const serverPages = new Map();
  (serverNb.pages || []).forEach(p => serverPages.set(p.id, p));

  const allPageIds = new Set([...localPages.keys(), ...serverPages.keys()]);
  const mergedPages = [];

  for (const pid of allPageIds) {
    const lp = localPages.get(pid);
    const sp = serverPages.get(pid);

    if (lp && sp) {
      // Both sides have this page — keep the newer one
      const lpTime = lp.updatedAt || '';
      const spTime = sp.updatedAt || '';
      mergedPages.push(spTime > lpTime ? sp : lp);
    } else if (sp) {
      mergedPages.push(sp);
    } else if (lp) {
      mergedPages.push(lp);
    }
  }

  base.pages = mergedPages;

  // Update the notebook's updatedAt to be the latest of any page
  const latestPage = mergedPages.reduce((latest, p) => {
    return (p.updatedAt && p.updatedAt > latest) ? p.updatedAt : latest;
  }, base.updatedAt || '');
  if (latestPage) base.updatedAt = latestPage;

  return base;
}

/**
 * Load notebooks from server and perform smart per-PAGE merge
 * using updatedAt timestamps. Prevents server data from being lost
 * when a stale client connects.
 */
async function loadFromServer() {
  try {
    const data = await fetchNotebooks();
    if (data.ok && Array.isArray(data.notebooks)) {
      // Track server's sync timestamp
      if (data.lastSyncedAt) lastSyncedAt = data.lastSyncedAt;

      const serverNotebooks = data.notebooks;
      const localState = getState();
      const localNotebooks = localState.notebooks || [];

      let mergedNotebooks;

      if (localNotebooks.length === 0) {
        // No local data — use server data as-is
        mergedNotebooks = serverNotebooks;
      } else if (serverNotebooks.length === 0) {
        // No server data — keep local data (will be pushed on next sync)
        mergedNotebooks = localNotebooks;
      } else {
        // Both sides have data — merge per-notebook, then per-page
        const serverMap = new Map();
        serverNotebooks.forEach(nb => serverMap.set(nb.id, nb));

        const localMap = new Map();
        localNotebooks.forEach(nb => localMap.set(nb.id, nb));

        const allIds = new Set([...serverMap.keys(), ...localMap.keys()]);
        mergedNotebooks = [];

        for (const id of allIds) {
          const serverNb = serverMap.get(id);
          const localNb = localMap.get(id);

          if (serverNb && localNb) {
            // Both exist — deep-merge at page level
            mergedNotebooks.push(mergeNotebookPages(localNb, serverNb));
          } else if (serverNb) {
            // Only on server — include it
            mergedNotebooks.push(serverNb);
          } else if (localNb) {
            // Only on local — include it (new notebook created locally)
            mergedNotebooks.push(localNb);
          }
        }
      }

      const normalized = normalizeState({
        ...localState,
        notebooks: mergedNotebooks
      });
      replaceState(normalized);
      serverLoadComplete = true;
    }
  } catch (err) {
    console.warn('Could not load from server, using local data:', err.message);
    // Still mark as complete so we don't block sync forever
    serverLoadComplete = true;
  }
}

/**
 * Pull latest data from server (used by visibility change & polling).
 * Only updates UI if data actually changed. Returns true if changes were applied.
 */
async function pullFromServer() {
  if (!isAuthenticated || isPulling) return false;
  isPulling = true;

  try {
    const data = await fetchNotebooks();
    if (!data.ok || !Array.isArray(data.notebooks)) return false;

    if (data.lastSyncedAt) lastSyncedAt = data.lastSyncedAt;

    const serverNotebooks = data.notebooks;
    const currentState = getState();
    const localNotebooks = currentState.notebooks || [];

    // Quick check — if server data is identical to local, skip
    const serverJson = JSON.stringify(serverNotebooks);
    const localJson = JSON.stringify(localNotebooks);
    if (serverJson === localJson) return false;

    // Deep merge at page level
    const serverMap = new Map();
    serverNotebooks.forEach(nb => serverMap.set(nb.id, nb));

    const localMap = new Map();
    localNotebooks.forEach(nb => localMap.set(nb.id, nb));

    const allIds = new Set([...serverMap.keys(), ...localMap.keys()]);
    const mergedNotebooks = [];

    for (const id of allIds) {
      const serverNb = serverMap.get(id);
      const localNb = localMap.get(id);

      if (serverNb && localNb) {
        mergedNotebooks.push(mergeNotebookPages(localNb, serverNb));
      } else if (serverNb) {
        mergedNotebooks.push(serverNb);
      } else if (localNb) {
        mergedNotebooks.push(localNb);
      }
    }

    const mergedJson = JSON.stringify(mergedNotebooks);
    if (mergedJson === localJson) return false;

    // Apply merged data
    const normalized = normalizeState({
      ...currentState,
      notebooks: mergedNotebooks
    });
    replaceState(normalized);

    // Refresh visible UI
    const libraryView = document.getElementById('libraryView');
    const notebookView = document.getElementById('notebookView');

    if (libraryView && !libraryView.classList.contains('hidden')) {
      renderLibraryGrid();
    }
    if (notebookView && !notebookView.classList.contains('hidden')) {
      // Re-render the currently open notebook
      const activeNb = currentState.activeNotebookId;
      if (activeNb) {
        renderBookPages();
      }
    }

    console.log('📥 Synced changes from server');
    return true;
  } catch (err) {
    console.warn('Pull from server failed:', err.message);
    return false;
  } finally {
    isPulling = false;
  }
}

/**
 * Push local state to server with smart merge.
 * Guards against pushing empty/stale data.
 * Skips push if data hasn't changed since last successful push.
 */
let lastPushedJson = '';   // Track last pushed data to avoid duplicate pushes
let isSyncing = false;     // Prevent concurrent pushes

async function doSyncToServer() {
  if (!isAuthenticated || !serverLoadComplete || isSyncing) return;

  const state = getState();

  // Safety: never push empty notebooks if there was server data
  if (!state.notebooks || state.notebooks.length === 0) {
    console.warn('Sync skipped: local notebooks are empty');
    return;
  }

  // Skip if data hasn't changed since last push
  const currentJson = JSON.stringify(state.notebooks);
  if (currentJson === lastPushedJson) return;

  isSyncing = true;
  try {
    const result = await syncNotebooks(state.notebooks, lastSyncedAt);

    // Update lastSyncedAt from server response
    if (result.savedAt) lastSyncedAt = result.savedAt;

    // Mark as pushed
    lastPushedJson = currentJson;

    // If server returned merged notebooks, apply them locally
    // (server may have kept notebooks from other devices)
    if (result.notebooks && Array.isArray(result.notebooks)) {
      const currentState = getState();
      const normalized = normalizeState({
        ...currentState,
        notebooks: result.notebooks
      });
      // Only replace if different to avoid unnecessary re-renders
      const mergedJson = JSON.stringify(normalized.notebooks);
      if (mergedJson !== JSON.stringify(currentState.notebooks)) {
        replaceState(normalized);
        lastPushedJson = mergedJson;
      }
    }
  } catch (err) {
    // If server blocked empty sync, force reload from server
    if (err.message && err.message.includes('EMPTY_SYNC_BLOCKED')) {
      console.warn('Server blocked empty sync, reloading from server...');
      await loadFromServer();
      renderLibraryGrid();
    } else {
      console.warn('Sync to server failed:', err.message);
    }
  } finally {
    isSyncing = false;
  }
}

function scheduleSyncToServer() {
  if (!isAuthenticated || !serverLoadComplete) return;

  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => doSyncToServer(), SYNC_DEBOUNCE_MS);
}

/**
 * Push to server immediately (no debounce).
 * Used when leaving the tab or closing the page.
 */
function pushToServerNow() {
  clearTimeout(syncTimer);
  doSyncToServer();
}

/**
 * Start periodic background polling and visibility-change listener
 * to keep data in sync across devices (iPad ↔ Web).
 *
 * Strategy:
 *  - On tab hide  → save + push immediately (so other devices get it fast)
 *  - On tab show  → save + pull (to get changes from other devices)
 *  - On focus     → pull (covers mobile Safari/Chrome edge cases)
 *  - beforeunload → save + push via sendBeacon as last resort
 *  - Every 15s    → pull if tab is visible
 */
function startSyncListeners() {
  document.addEventListener('visibilitychange', () => {
    if (!isAuthenticated) return;

    if (document.visibilityState === 'hidden') {
      // Leaving tab → save current work and push to server immediately
      saveActivePages();
      pushToServerNow();
    } else {
      // Returning to tab → save any local edits, then pull latest from server
      saveActivePages();
      pullFromServer();
    }
  });

  // Also pull on window focus (covers more cases on mobile)
  window.addEventListener('focus', () => {
    if (isAuthenticated) {
      pullFromServer();
    }
  });

  // Last-resort: push on page close via sendBeacon
  window.addEventListener('beforeunload', () => {
    if (!isAuthenticated || !serverLoadComplete) return;

    saveActivePages();

    const state = getState();
    if (!state.notebooks || state.notebooks.length === 0) return;

    const currentJson = JSON.stringify(state.notebooks);
    if (currentJson === lastPushedJson) return;

    // sendBeacon is fire-and-forget — guaranteed to be sent even if page closes
    try {
      const payload = JSON.stringify({
        notebooks: state.notebooks,
        lastSyncedAt
      });
      navigator.sendBeacon('/api/notebooks/sync-beacon', payload);
    } catch {
      // Fallback: try regular push (may be killed by browser)
      pushToServerNow();
    }
  });

  // Periodic polling every 15 seconds
  clearInterval(pullTimer);
  pullTimer = setInterval(() => {
    if (isAuthenticated && document.visibilityState === 'visible') {
      pullFromServer();
    }
  }, PULL_INTERVAL_MS);
}


async function init() {
  // Register server sync on every persistState call
  setOnPersist(() => scheduleSyncToServer());

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
    onChangeTone: (tone) => applyPaperTone(tone),
    onChangeTexture: (texture) => applyPaperTexture(texture),
    onTogglePageDrawer: () => togglePageDrawer(),
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
  setupLoginForm();
  setupLogoutButton();

  // ─── AI Co-pilot Setup ───
  setupAiToolbarButtons();
  setupAiSelectionListener();
  setupNotionAiListeners();
  initPageOverflowGuard();

  // Apply visual configurations from persisted state
  const state = getState();
  applyFontSize(state.fontSize || 16);
  applyFontFamily(state.fontFamily || 'sans');
  applyLineHeight(state.lineHeight || '28');
  applyPaperTone(state.paperTone || 'cream', false);
  applyPaperTexture(state.paperTexture || 'grain', false);
  applyToolbarCollapse(Boolean(state.toolbarCollapsed), false);

  // ─── Auth check on boot ───
  const session = await checkSession();
  if (session && session.ok) {
    isAuthenticated = true;
    hideLoginScreen();
    await loadFromServer();
    persistState();
    startSyncListeners();  // Enable cross-device sync (polling + visibility)

    if (checkAndRenderPdfExport()) {
      return;
    }

    renderLibraryGrid();
    handleRouteFromUrl(true);
  } else {
    showLoginScreen();
  }

  // Listen for auth:required events (401 from API client)
  window.addEventListener('auth:required', () => {
    isAuthenticated = false;
    showLoginScreen();
  });

  // Register service worker if available
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('./sw.js').catch(error => {
      console.warn('Không thể bật chế độ offline:', error);
    });
  }
}

// ─── AI Helper Functions ───

function getCurrentPageContext() {
  const pageInfo = getActivePageInfo();
  const template = pageInfo?.template || 'ruled';

  let context = '';
  if (pageInfo?.page) {
    const p = pageInfo.page;
    if (p.topic || p.title) context += `Chủ đề: ${p.topic || p.title}\n`;
    if (p.notes || p.content) context += `${p.notes || p.content}\n`;
    if (p.cues) context += `Cues: ${p.cues}\n`;
    if (p.summary) context += `Summary: ${p.summary}\n`;
    if (p.agenda) context += `Agenda: ${p.agenda}\n`;
    if (p.discussions) context += `Discussions: ${p.discussions}\n`;
    if (p.vocabWord) context += `Vocab: ${p.vocabWord}\n`;
  }
  if (!context.trim()) {
    const areas = document.querySelectorAll('.template-writing-area');
    areas.forEach(a => {
      const text = a.innerText?.trim();
      if (text) context += text + '\n';
    });
  }

  // Calculate physical page spatial constraints from active sheet & store
  const state = getState();
  const fontSize = state.fontSize || 16;
  const lineHeight = parseInt(state.lineHeight || '28', 10) || 28;
  const pageMode = state.pageMode || '2-page';
  const sheetEl = pageInfo?.targetSheet;

  let sheetWidth = 480;
  let sheetHeight = 680;
  if (sheetEl) {
    const rect = sheetEl.getBoundingClientRect();
    if (rect.width > 0) sheetWidth = Math.round(rect.width);
    if (rect.height > 0) sheetHeight = Math.round(rect.height);
  } else if (pageMode === '1-page') {
    sheetWidth = 660;
    sheetHeight = 820;
  }

  // Active or main writing area height and line capacity
  const mainArea = sheetEl?.querySelector('.template-writing-area:focus') ||
                   sheetEl?.querySelector('.template-writing-area') ||
                   document.querySelector('.template-writing-area');

  let areaHeight = pageMode === '1-page' ? 620 : 480;
  let currentTextLines = 0;
  if (mainArea) {
    areaHeight = mainArea.clientHeight || areaHeight;
    const existingText = mainArea.innerText || '';
    if (existingText.trim()) {
      currentTextLines = existingText.split('\n').filter(Boolean).length;
    }
  }

  const totalLineCapacity = Math.max(10, Math.floor(areaHeight / lineHeight));
  const remainingLines = Math.max(3, totalLineCapacity - currentTextLines);

  const constraints = {
    pageMode,
    sheetSize: `${sheetWidth}x${sheetHeight}px`,
    fontSize: `${fontSize}px`,
    lineHeight: `${lineHeight}px`,
    totalLineCapacity,
    currentTextLines,
    remainingLines,
    template,
  };

  return {
    template,
    context: context.slice(0, 2000),
    constraints
  };
}

function handleAiPageInsert(mode, text, extra) {
  // 1. Template Autofill Mode
  if (mode === 'autofill' && extra?.parsedJson) {
    applyAiAutofillToCurrentPage(extra.parsedJson);
    return;
  }

  // 2. Intelligently find primary active area
  const pageInfo = getActivePageInfo();
  const targetSheet = pageInfo?.targetSheet;
  const template = pageInfo?.template || 'ruled';
  const activeArea = getPrimaryWritingArea(targetSheet, template);
  if (!activeArea) return;

  const formattedHtml = formatContentToHtml(text || '');

  if (mode === 'typewriter') {
    typewriteTextIntoElement(activeArea, text, {
      mode: 'append',
      speed: 15,
      onComplete: () => {
        saveActivePages();
      }
    });
    return;
  }

  if (mode === 'replace') {
    activeArea.innerHTML = formattedHtml;
  } else {
    // Insert at cursor or append
    const existing = activeArea.innerHTML.trim();
    if (!existing || existing === '<br>') {
      activeArea.innerHTML = formattedHtml;
    } else {
      // Each line is already inside a <div>, so just concatenate
      activeArea.innerHTML = existing + formattedHtml;
    }
  }
  activeArea.dispatchEvent(new Event('input', { bubbles: true }));
  saveActivePages();
}

function openAiCommandBar() {
  openNotionAiBar();
}

function setupAiToolbarButtons() {
  const btnAi = document.getElementById('btnAiCommandBar');
  const btnSettingsList = document.querySelectorAll('#btnAiSettings, [data-action="ai-settings"]');

  if (btnAi) {
    btnAi.addEventListener('click', () => openAiCommandBar());
  }
  btnSettingsList.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openAiSettings();
    });
  });

  // Wire up corner FAB event to open inline bar
  window.addEventListener('ai:open-inline', () => openAiCommandBar());
  // Wire up global open AI settings event
  window.addEventListener('ai:open-settings', () => openAiSettings());
}

// Launch application
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
