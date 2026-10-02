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
  const validPaperTones = ['cream', 'white', 'ivory', 'aged', 'mint', 'rose', 'lavender'];
  state.paperTone = validPaperTones.includes(String(state.paperTone)) ? String(state.paperTone) : 'cream';
  const validPaperTextures = ['grain', 'smooth', 'kraft', 'linen', 'washi', 'vellum'];
  state.paperTexture = validPaperTextures.includes(String(state.paperTexture)) ? String(state.paperTexture) : 'grain';

  const notebookIds = new Set();
  const pageIds = new Set();
  state.notebooks.forEach((nb, nbIndex) => {
    const requestedNotebookId = typeof nb.id === 'string' ? nb.id.trim() : '';
    nb.id = requestedNotebookId && !notebookIds.has(requestedNotebookId)
      ? requestedNotebookId
      : createUniqueId('nb', notebookIds);
    notebookIds.add(nb.id);
    nb.deletedPageIds = Array.isArray(nb.deletedPageIds) ? nb.deletedPageIds.slice(-200) : [];
    const tombstoneSet = new Set(nb.deletedPageIds);
    nb.pages = (Array.isArray(nb.pages) ? nb.pages : []).filter(p => p && p.id && !tombstoneSet.has(p.id));
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
      if (!['cornell', 'work', 'ruled', 'vocab', 'charting', 'reading', 'dotgrid', 'grid', 'blank', 'quadrant'].includes(page.template)) page.template = 'ruled';
      ['title', 'topic', 'project', 'date', 'no', 'deadline', 'status', 'lang', 'cues', 'notes', 'summary', 'agenda', 'discussions', 'content',
       'vocabWord', 'vocabMeaning', 'vocabExample', 'vocabReview']
        .forEach(key => {
          if (page[key] != null && typeof page[key] !== 'string') page[key] = String(page[key]);
        });
      if (page.actions != null) {
        page.actions = Array.isArray(page.actions) ? page.actions.slice(0, 50).map(action => ({
          checked: Boolean(action && action.checked),
          text: String((action && action.text) || '')
        })) : [];
      }
      // Normalize quadrant data
      if (page.quadrants != null) {
        if (typeof page.quadrants === 'object' && !Array.isArray(page.quadrants)) {
          page.quadrants = {
            q1: String(page.quadrants.q1 || ''),
            q2: String(page.quadrants.q2 || ''),
            q3: String(page.quadrants.q3 || ''),
            q4: String(page.quadrants.q4 || '')
          };
        } else {
          page.quadrants = { q1: '', q2: '', q3: '', q4: '' };
        }
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
    const isQuota = e && (
      e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      e.code === 22 ||
      e.code === 1014
    );
    if (isQuota) {
      console.warn('[Storage] LocalStorage quota exceeded. Saving compact cache...');
      try {
        // Build a compact representation for localStorage:
        // Keep active notebook full, for other notebooks keep up to 3 pages
        const compactState = {
          ...state,
          notebooks: (state.notebooks || []).map(nb => {
            if (nb.id === state.activeNotebookId) return nb;
            return {
              ...nb,
              pages: (nb.pages || []).slice(0, 3)
            };
          })
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(compactState));
      } catch (compactErr) {
        console.warn('[Storage] Even compact cache failed:', compactErr);
      }
    } else {
      console.error('Error saving state:', e);
    }
    // CRITICAL: Always trigger server sync with FULL state even if localStorage quota failed!
    if (onPersistCallback) {
      try { onPersistCallback(state); } catch {}
    }
    return true;
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
  } else if (template === 'vocab') {
    const wordText = sheetEl.querySelector('.vocab-word-text');
    const meaningText = sheetEl.querySelector('.vocab-meaning-text');
    const exampleText = sheetEl.querySelector('.vocab-example-text');
    const reviewText = sheetEl.querySelector('.vocab-review-text');
    if (wordText) page.vocabWord = getEditableContent(wordText);
    if (meaningText) page.vocabMeaning = getEditableContent(meaningText);
    if (exampleText) {
      page.vocabExample = getEditableContent(exampleText);
      page.content = getEditableContent(exampleText);
    }
    if (reviewText) page.vocabReview = getEditableContent(reviewText);
  } else if (template === 'charting') {
    const col1 = sheetEl.querySelector('.charting-col1-text');
    const col2 = sheetEl.querySelector('.charting-col2-text');
    const col3 = sheetEl.querySelector('.charting-col3-text');
    const notesText = sheetEl.querySelector('.charting-notes-text');
    if (!page.chartData) page.chartData = { col1: '', col2: '', col3: '' };
    if (col1) page.chartData.col1 = getEditableContent(col1);
    if (col2) page.chartData.col2 = getEditableContent(col2);
    if (col3) page.chartData.col3 = getEditableContent(col3);
    if (notesText) {
      page.summary = getEditableContent(notesText);
      page.content = getEditableContent(notesText);
    }
  } else if (template === 'reading') {
    const ideasText = sheetEl.querySelector('.reading-ideas-text');
    const quotesText = sheetEl.querySelector('.reading-quotes-text');
    const summaryText = sheetEl.querySelector('.reading-summary-text');
    if (ideasText) page.cues = getEditableContent(ideasText);
    if (quotesText) {
      page.notes = getEditableContent(quotesText);
      page.content = getEditableContent(quotesText);
    }
    if (summaryText) page.summary = getEditableContent(summaryText);
  } else if (template === 'dotgrid') {
    const dotText = sheetEl.querySelector('.dotgrid-canvas-text');
    if (dotText) page.content = getEditableContent(dotText);
  } else if (template === 'grid') {
    const gridText = sheetEl.querySelector('.grid-canvas-text');
    if (gridText) page.content = getEditableContent(gridText);
  } else if (template === 'blank') {
    const blankText = sheetEl.querySelector('.blank-canvas-text');
    if (blankText) page.content = getEditableContent(blankText);
  } else if (template === 'quadrant') {
    const q1 = sheetEl.querySelector('.quadrant-q1-text');
    const q2 = sheetEl.querySelector('.quadrant-q2-text');
    const q3 = sheetEl.querySelector('.quadrant-q3-text');
    const q4 = sheetEl.querySelector('.quadrant-q4-text');
    if (!page.quadrants) page.quadrants = { q1: '', q2: '', q3: '', q4: '' };
    if (q1) page.quadrants.q1 = getEditableContent(q1);
    if (q2) page.quadrants.q2 = getEditableContent(q2);
    if (q3) page.quadrants.q3 = getEditableContent(q3);
    if (q4) page.quadrants.q4 = getEditableContent(q4);
    page.content = [page.quadrants.q1, page.quadrants.q2, page.quadrants.q3, page.quadrants.q4].filter(Boolean).join('\n');
  }
}

export function scheduleSave(onSaveCallback) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (onSaveCallback) onSaveCallback();
  }, SAVE_DEBOUNCE_MS);
}
