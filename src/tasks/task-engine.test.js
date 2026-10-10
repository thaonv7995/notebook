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

async function loadFreshModules() {
  vi.resetModules();
  const store = await import('../state/store.js');
  const taskEngine = await import('./task-engine.js');
  store.setState({ tasks: [] });
  return { store, taskEngine };
}

describe('shared task engine', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: createMemoryStorage()
    });
  });

  it('creates and persists a normalized task', async () => {
    const { store, taskEngine } = await loadFreshModules();
    const task = taskEngine.createTask({
      title: '  Chuẩn bị bản trình bày  ',
      status: 'todo',
      priority: 1,
      dueDate: '2026-10-12',
      tags: ['meeting', '@meeting', 'client'],
      notebookId: 'nb-work',
      pageId: 'page-one'
    });

    expect(task.id).toMatch(/^task-/);
    expect(task.title).toBe('Chuẩn bị bản trình bày');
    expect(task.tags).toEqual(['meeting', 'client']);
    expect(store.getState().tasks).toHaveLength(1);

    const saved = JSON.parse(
      globalThis.localStorage.getItem('thao_digital_notebooks_v7')
    );
    expect(saved.tasks[0].id).toBe(task.id);
  });

  it('rejects a task without a title', async () => {
    const { taskEngine } = await loadFreshModules();
    expect(() => taskEngine.createTask({ title: '   ' }))
      .toThrow('Tiêu đề công việc không được để trống.');
  });

  it('updates completion metadata consistently', async () => {
    const { taskEngine } = await loadFreshModules();
    const task = taskEngine.createTask({
      title: 'Hoàn thiện tài liệu',
      status: 'todo'
    });

    const completed = taskEngine.completeTask(task.id);
    expect(completed.status).toBe('done');
    expect(completed.completedAt).not.toBe('');

    const reopened = taskEngine.completeTask(task.id, false);
    expect(reopened.status).toBe('todo');
    expect(reopened.completedAt).toBe('');
  });

  it('filters active tasks and sorts by priority then due date', async () => {
    const { taskEngine } = await loadFreshModules();
    taskEngine.createTask({
      title: 'Không có hạn',
      status: 'todo',
      priority: 3
    });
    taskEngine.createTask({
      title: 'Ưu tiên cao',
      status: 'todo',
      priority: 1,
      dueDate: '2026-10-12'
    });
    taskEngine.createTask({
      title: 'Đã xong',
      status: 'done',
      priority: 1
    });

    const active = taskEngine.getTasks({ includeCompleted: false });
    expect(active.map(task => task.title)).toEqual([
      'Ưu tiên cao',
      'Không có hạn'
    ]);
  });

  it('reports today, overdue, waiting, and completed counts', async () => {
    const { taskEngine } = await loadFreshModules();
    taskEngine.createTask({
      title: 'Việc hôm nay',
      status: 'todo',
      dueDate: '2026-10-10'
    });
    taskEngine.createTask({
      title: 'Việc quá hạn',
      status: 'todo',
      dueDate: '2026-10-09'
    });
    taskEngine.createTask({
      title: 'Đang chờ',
      status: 'waiting'
    });
    taskEngine.createTask({
      title: 'Đã hoàn tất',
      status: 'done'
    });

    const counts = taskEngine.getTaskCounts(
      new Date('2026-10-10T12:00:00+07:00')
    );
    expect(counts).toMatchObject({
      today: 1,
      overdue: 1,
      waiting: 1,
      completed: 1,
      totalActive: 3
    });
  });
});
