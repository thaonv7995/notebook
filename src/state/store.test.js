// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

function createMemoryStorage() {
  const values = new Map();

  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key) {
      return values.has(String(key)) ? values.get(String(key)) : null;
    },
    key(index) {
      return [...values.keys()][index] ?? null;
    },
    removeItem(key) {
      values.delete(String(key));
    },
    setItem(key, value) {
      values.set(String(key), String(value));
    }
  };
}

async function loadFreshStore() {
  vi.resetModules();
  return import('./store.js');
}

describe('state store', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: createMemoryStorage()
    });
  });

  it('normalizes invalid display settings to safe defaults', async () => {
    const { normalizeState } = await loadFreshStore();
    const state = normalizeState({
      notebooks: [],
      pageMode: 'invalid',
      zoomLevel: 99,
      fontSize: 500,
      lineHeight: 'invalid',
      paperTone: 'invalid',
      paperTexture: 'invalid'
    });

    expect(state.pageMode).toBe('2-page');
    expect(state.zoomLevel).toBe(3.5);
    expect(state.fontSize).toBe(16);
    expect(state.lineHeight).toBe('28');
    expect(state.paperTone).toBe('cream');
    expect(state.paperTexture).toBe('grain');
  });

  it('filters deleted notebooks and creates an active notebook id', async () => {
    const { normalizeState } = await loadFreshStore();
    const state = normalizeState({
      deletedNotebookIds: ['deleted-notebook'],
      notebooks: [
        {
          id: 'deleted-notebook',
          title: 'Đã xóa',
          pages: [{ id: 'deleted-page', template: 'ruled' }]
        },
        {
          id: 'active-notebook',
          title: 'Đang sử dụng',
          pages: [{ id: 'active-page', template: 'ruled' }]
        }
      ]
    });

    expect(state.notebooks).toHaveLength(1);
    expect(state.notebooks[0].id).toBe('active-notebook');
    expect(state.activeNotebookId).toBe('active-notebook');
  });

  it('repairs duplicate notebook and page identifiers', async () => {
    const { normalizeState } = await loadFreshStore();
    const state = normalizeState({
      notebooks: [
        {
          id: 'duplicate',
          title: 'Sổ thứ nhất',
          pages: [{ id: 'same-page', template: 'ruled' }]
        },
        {
          id: 'duplicate',
          title: 'Sổ thứ hai',
          pages: [{ id: 'same-page', template: 'ruled' }]
        }
      ]
    });

    const notebookIds = state.notebooks.map(notebook => notebook.id);
    const pageIds = state.notebooks.flatMap(notebook => notebook.pages.map(page => page.id));

    expect(new Set(notebookIds).size).toBe(notebookIds.length);
    expect(new Set(pageIds).size).toBe(pageIds.length);
  });

  it('persists state and invokes the server-sync callback', async () => {
    const { persistState, setOnPersist, setState } = await loadFreshStore();
    const onPersist = vi.fn();

    setOnPersist(onPersist);
    setState({ fontSize: 18 });

    expect(persistState()).toBe(true);
    expect(onPersist).toHaveBeenCalledTimes(1);
    expect(JSON.parse(globalThis.localStorage.getItem('thao_digital_notebooks_v7')).fontSize).toBe(18);
  });

  it('returns false when both full and compact local caches fail', async () => {
    const { persistState, setOnPersist } = await loadFreshStore();
    const onPersist = vi.fn();
    const quotaError = Object.assign(new Error('Storage quota exceeded'), {
      name: 'QuotaExceededError'
    });

    setOnPersist(onPersist);
    vi.spyOn(globalThis.localStorage, 'setItem').mockImplementation(() => {
      throw quotaError;
    });

    expect(persistState()).toBe(false);
    expect(onPersist).toHaveBeenCalledTimes(1);
  });
});
