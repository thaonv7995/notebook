/**
 * Central State Store & Persistence Engine
 *
 * Manages reactive state, localStorage load/save, migrations,
 * and auto-save timers.
 */

import { STORAGE_KEY, BACKUP_STORAGE_KEY, STATE_VERSION, SAVE_DEBOUNCE_MS } from '../config/constants.js';
import { INITIAL_LIBRARY_DATA } from '../config/initial-data.js';

let generatedIdCounter = 0;
let saveTimer = null;
let listeners = new Set();

export function createUniqueId(prefix, usedIds = new Set()) {
  let id = '';
  do {
    generatedIdCounter += 1;
    const randomPart = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${generatedIdCounter}-${Math.random().toString(16).slice(2)}`;
    id = `${prefix}-${randomPart}`;
  } while (usedIds.has(id));
  usedIds.add(id);
  return id;
}

export function normalizeState(rawState) {
  const state = rawState && typeof rawState === 'object' ? rawState : {};
  const previousVersion = Number(state.version) || 0;
  state.version = STATE_VERSION;
  state.notebooks = Array.isArray(state.notebooks) ? state.notebooks : [];
  delete state.trash;
  state.pageMode = state.pageMode === '1-page' ? '1-page' : '2-page';
  state.zoomLevel = Number.isFinite(state.zoomLevel) ? Math.max(0.3, Math.min(state.zoomLevel, 3.5)) : 1;
  state.toolbarCollapsed = Boolean(state.toolbarCollapsed);
  state.toolbarAdvanced = Boolean(state.toolbarAdvanced);
  if (previousVersion < 3 && state.zoomLevel <= 0.3) state.zoomLevel = 1;
  state.fontSize = Number.isInteger(state.fontSize) && state.fontSize >= 10 && state.fontSize <= 200 ? state.fontSize : 16;
  state.fontFamily = typeof state.fontFamily === 'string' && state.fontFamily ? state.fontFamily : 'sans';
  const validLineHeights = ['24', '28', '32', '36', '42', 'none'];
  state.lineHeight = validLineHeights.includes(String(state.lineHeight)) ? String(state.lineHeight) : '28';

  const notebookIds = new Set();
  const pageIds = new Set();
  state.notebooks.forEach((nb, nbIndex) => {
    const requestedNotebookId = typeof nb.id === 'string' ? nb.id.trim() : '';
    nb.id = requestedNotebookId && !notebookIds.has(requestedNotebookId)
      ? requestedNotebookId
      : createUniqueId('nb', notebookIds);
    notebookIds.add(nb.id);
    nb.pages = Array.isArray(nb.pages) ? nb.pages : [];
    nb.title = String(nb.title || 'Cuốn sổ chưa đặt tên')
      .replace(/\s*•\s*Sổ\s+Kẻ\s+Ngang\s+A4\s*—\s*Bản\s+sao/gi, '')
      .replace(/\s*Sổ\s+Kẻ\s+Ngang\s+A4\s*—\s*Bản\s+sao\s*/gi, '')
      .replace(/\s*•\s*Sổ\s+Kẻ\s+Ngang\s+A4/gi, '')
      .replace(/\s*Sổ\s+Kẻ\s+Ngang\s+A4/gi, '')
      .trim();
    if (!nb.title) nb.title = 'Ruled Notebook';
    nb.author = String(nb.author || 'Cá nhân');
    nb.category = String(nb.category || 'Ghi chép');
    nb.lang = String(nb.lang || 'VI');
    nb.fontFamily = typeof nb.fontFamily === 'string' && nb.fontFamily ? nb.fontFamily : state.fontFamily;
    nb.lineHeight = validLineHeights.includes(String(nb.lineHeight)) ? String(nb.lineHeight) : state.lineHeight;
    if (typeof nb.coverGradient !== 'string' || !/^linear-gradient\([^;{}]+\)$/.test(nb.coverGradient)) {
      nb.coverGradient = 'linear-gradient(135deg, #1e3a8a, #0f172a)';
    }
    if (typeof nb.coverTextColor !== 'string' || !/^#[0-9a-f]{6}$/i.test(nb.coverTextColor)) nb.coverTextColor = '#ffffff';
    if (nb.pages.length === 0) {
      nb.pages.push({
        id: `p-${Date.now()}-${nbIndex}-1`,
        title: '',
        topic: '',
        date: new Date().toLocaleDateString('vi-VN'),
        no: '01',
        lang: 'VI',
        template: 'ruled',
        content: ''
      });
    }
    nb.createdAt = nb.createdAt || `2026-09-29T00:00:${String(nbIndex).padStart(2, '0')}.000Z`;
    nb.updatedAt = nb.updatedAt || nb.pages.reduce((latest, page) => {
      return page.updatedAt && page.updatedAt > latest ? page.updatedAt : latest;
    }, nb.createdAt);
    nb.isPinned = Boolean(nb.isPinned);
    nb.lastPageIndex = Math.max(0, Math.min(Number(nb.lastPageIndex) || 0, Math.max(0, nb.pages.length - 1)));
    delete nb.pagesCount;
    delete nb.currentProgress;
    delete nb.progressPct;
    nb.pages.forEach((page) => {
      const requestedPageId = typeof page.id === 'string' ? page.id.trim() : '';
      page.id = requestedPageId && !pageIds.has(requestedPageId)
        ? requestedPageId
        : createUniqueId('p', pageIds);
      pageIds.add(page.id);
      if (page.template === 'book') page.template = 'ruled';
      if (!['cornell', 'work', 'ruled'].includes(page.template)) page.template = 'ruled';
      ['title', 'topic', 'project', 'date', 'no', 'deadline', 'status', 'lang', 'cues', 'notes', 'summary', 'agenda', 'discussions', 'content']
        .forEach(key => {
          if (page[key] != null && typeof page[key] !== 'string') page[key] = String(page[key]);
        });
      if (page.actions != null) {
        page.actions = Array.isArray(page.actions) ? page.actions.slice(0, 50).map(action => ({
          checked: Boolean(action && action.checked),
          text: String((action && action.text) || '')
        })) : [];
      }
      if (page.textBoxes) delete page.textBoxes;
    });
  });

  if (!state.activeNotebookId && state.notebooks[0]) state.activeNotebookId = state.notebooks[0].id;
  return state;
}

export function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.notebooks)) {
        const state = normalizeState(parsed);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (_) {}
        return state;
      }
    }
  } catch (e) {
    console.warn('Error loading state:', e);
  }
  return normalizeState(JSON.parse(JSON.stringify(INITIAL_LIBRARY_DATA)));
}

// Global active store instance
let state = loadState();

export function getState() {
  return state;
}

export function setState(updater) {
  if (typeof updater === 'function') {
    state = updater(state);
  } else if (updater && typeof updater === 'object') {
    state = { ...state, ...updater };
  }
  listeners.forEach(fn => fn(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

let onPersistCallback = null;

export function setOnPersist(fn) {
  onPersistCallback = fn;
}

export function persistState() {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serialized);
    if (localStorage.getItem(STORAGE_KEY) !== serialized) {
      throw new Error('Không thể xác minh dữ liệu vừa lưu.');
    }
    // Trigger server sync callback if registered
    if (onPersistCallback) {
      try { onPersistCallback(state); } catch {}
    }
    return true;
  } catch (e) {
    console.error('Error saving state:', e);
    return false;
  }
}

export function replaceState(nextState) {
  const previousSerialized = JSON.stringify(state);
  const nextSerialized = JSON.stringify(nextState);
  const previousBackup = localStorage.getItem(BACKUP_STORAGE_KEY);
  try {
    localStorage.setItem(BACKUP_STORAGE_KEY, previousSerialized);
    if (localStorage.getItem(BACKUP_STORAGE_KEY) !== previousSerialized) throw new Error('Không thể tạo bản sao an toàn.');
    localStorage.setItem(STORAGE_KEY, nextSerialized);
    if (localStorage.getItem(STORAGE_KEY) !== nextSerialized) throw new Error('Không thể xác minh dữ liệu khôi phục.');
  } catch (error) {
    try {
      localStorage.setItem(STORAGE_KEY, previousSerialized);
      if (previousBackup == null) localStorage.removeItem(BACKUP_STORAGE_KEY);
      else localStorage.setItem(BACKUP_STORAGE_KEY, previousBackup);
    } catch (rollbackError) {
      console.error('Không thể rollback dữ liệu sau lỗi import:', rollbackError);
    }
    throw error;
  }

  state = nextState;
  listeners.forEach(fn => fn(state));
  return state;
}

export function getActiveNotebook() {
  if (!state.notebooks || state.notebooks.length === 0) {
    return null;
  }
  let nb = state.notebooks.find(n => n.id === state.activeNotebookId);
  if (!nb) {
    nb = state.notebooks[0];
    state.activeNotebookId = nb.id;
  }
  return nb;
}

export function getEditableContent(el) {
  if (!el) return '';
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return el.value;
  return el.innerHTML.replace(/<span class="hanzi-cjk">([\s\S]*?)<\/span>/gi, '$1');
}

export function extractTemplateDataFromSheet(sheetEl, page) {
  if (!sheetEl || !page) return;
  const template = page.template || 'cornell';

  const topicInput = sheetEl.querySelector('.topic-input');
  if (topicInput) {
    page.topic = topicInput.value;
    page.title = topicInput.value || page.title;
  }
  const projectInput = sheetEl.querySelector('.project-input');
  if (projectInput) {
    page.project = projectInput.value;
    page.title = projectInput.value || page.title;
  }
  const dateInput = sheetEl.querySelector('.date-input');
  if (dateInput) page.date = dateInput.value;
  const noInput = sheetEl.querySelector('.no-input');
  if (noInput) page.no = noInput.value;
  const deadlineInput = sheetEl.querySelector('.deadline-input');
  if (deadlineInput) page.deadline = deadlineInput.value;

  if (template === 'cornell') {
    const cuesText = sheetEl.querySelector('.cornell-cues-text');
    if (cuesText) page.cues = getEditableContent(cuesText);
    const notesText = sheetEl.querySelector('.cornell-notes-text');
    if (notesText) {
      page.notes = getEditableContent(notesText);
      page.content = getEditableContent(notesText);
    }
    const summaryText = sheetEl.querySelector('.cornell-summary-text');
    if (summaryText) page.summary = getEditableContent(summaryText);
  } else if (template === 'work') {
    const agendaText = sheetEl.querySelector('.work-agenda-text');
    if (agendaText) page.agenda = getEditableContent(agendaText);
    const notesText = sheetEl.querySelector('.work-notes-text');
    if (notesText) {
      page.discussions = getEditableContent(notesText);
      page.content = getEditableContent(notesText);
    }
    const actionRows = sheetEl.querySelectorAll('.action-row');
    if (actionRows && actionRows.length > 0) {
      if (!page.actions) page.actions = [];
      actionRows.forEach((row, idx) => {
        const chk = row.querySelector('.action-check-square');
        const input = row.querySelector('.action-line-input');
        page.actions[idx] = {
          checked: chk ? chk.classList.contains('checked') : false,
          text: input ? input.value : ''
        };
      });
    }
  } else if (template === 'ruled') {
    const ruledText = sheetEl.querySelector('.ruled-canvas-text');
    if (ruledText) page.content = getEditableContent(ruledText);
  }
}

export function scheduleSave(onSaveCallback) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (onSaveCallback) onSaveCallback();
  }, SAVE_DEBOUNCE_MS);
}
