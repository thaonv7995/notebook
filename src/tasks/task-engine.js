/**
 * Shared Task Engine
 *
 * Tasks are first-class entities. Notes and templates reference tasks by id,
 * while this module remains the single place for task creation and updates.
 */

import {
  createUniqueId,
  getState,
  persistState,
  setState
} from '../state/store.js';

export const TASK_STATUSES = Object.freeze([
  'inbox',
  'todo',
  'in_progress',
  'waiting',
  'done',
  'cancelled'
]);

const ACTIVE_TASK_STATUSES = new Set([
  'inbox',
  'todo',
  'in_progress',
  'waiting'
]);

function cleanText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizeTags(tags) {
  return [...new Set(
    (Array.isArray(tags) ? tags : [])
      .map(tag => cleanText(tag, 50).replace(/^@/, ''))
      .filter(Boolean)
  )].slice(0, 20);
}

function normalizePriority(priority) {
  const value = Number(priority);
  return [1, 2, 3, 4].includes(value) ? value : 4;
}

function findTask(taskId) {
  return (getState().tasks || []).find(task => task.id === taskId) || null;
}

function commitTasks(tasks) {
  setState({ tasks });
  persistState();
  return tasks;
}

export function getTasks({
  status = '',
  notebookId = '',
  pageId = '',
  tag = '',
  includeCompleted = true
} = {}) {
  return (getState().tasks || [])
    .filter(task => !status || task.status === status)
    .filter(task => !notebookId || task.notebookId === notebookId)
    .filter(task => !pageId || task.pageId === pageId)
    .filter(task => !tag || task.tags.includes(tag))
    .filter(task => includeCompleted || ACTIVE_TASK_STATUSES.has(task.status))
    .slice()
    .sort((left, right) => {
      if (left.priority !== right.priority) return left.priority - right.priority;
      if (left.dueDate !== right.dueDate) {
        if (!left.dueDate) return 1;
        if (!right.dueDate) return -1;
        return left.dueDate.localeCompare(right.dueDate);
      }
      return right.updatedAt.localeCompare(left.updatedAt);
    });
}

export function getTask(taskId) {
  return findTask(taskId);
}

export function createTask(input = {}) {
  const title = cleanText(input.title, 500);
  if (!title) {
    throw new Error('Tiêu đề công việc không được để trống.');
  }

  const state = getState();
  const tasks = Array.isArray(state.tasks) ? state.tasks.slice() : [];
  const usedIds = new Set(tasks.map(task => task.id));
  const now = new Date().toISOString();
  const status = TASK_STATUSES.includes(input.status) ? input.status : 'inbox';

  const task = {
    id: createUniqueId('task', usedIds),
    title,
    description: cleanText(input.description, 5000),
    status,
    priority: normalizePriority(input.priority),
    dueDate: cleanText(input.dueDate, 10),
    dueTime: cleanText(input.dueTime, 5),
    reminderAt: cleanText(input.reminderAt, 40),
    recurrence: cleanText(input.recurrence, 100),
    notebookId: cleanText(input.notebookId, 200),
    pageId: cleanText(input.pageId, 200),
    sourceBlockId: cleanText(input.sourceBlockId, 200),
    tags: normalizeTags(input.tags),
    createdAt: now,
    updatedAt: now,
    completedAt: status === 'done' ? now : ''
  };

  tasks.unshift(task);
  commitTasks(tasks);
  return task;
}

export function updateTask(taskId, updates = {}) {
  const existing = findTask(taskId);
  if (!existing) {
    throw new Error('Không tìm thấy công việc.');
  }

  const nextStatus = TASK_STATUSES.includes(updates.status)
    ? updates.status
    : existing.status;
  const now = new Date().toISOString();
  const candidateTitle = updates.title == null
    ? existing.title
    : cleanText(updates.title, 500);

  if (!candidateTitle) {
    throw new Error('Tiêu đề công việc không được để trống.');
  }

  const updatedTask = {
    ...existing,
    title: candidateTitle,
    description: updates.description == null
      ? existing.description
      : cleanText(updates.description, 5000),
    status: nextStatus,
    priority: updates.priority == null
      ? existing.priority
      : normalizePriority(updates.priority),
    dueDate: updates.dueDate == null
      ? existing.dueDate
      : cleanText(updates.dueDate, 10),
    dueTime: updates.dueTime == null
      ? existing.dueTime
      : cleanText(updates.dueTime, 5),
    reminderAt: updates.reminderAt == null
      ? existing.reminderAt
      : cleanText(updates.reminderAt, 40),
    recurrence: updates.recurrence == null
      ? existing.recurrence
      : cleanText(updates.recurrence, 100),
    notebookId: updates.notebookId == null
      ? existing.notebookId
      : cleanText(updates.notebookId, 200),
    pageId: updates.pageId == null
      ? existing.pageId
      : cleanText(updates.pageId, 200),
    sourceBlockId: updates.sourceBlockId == null
      ? existing.sourceBlockId
      : cleanText(updates.sourceBlockId, 200),
    tags: updates.tags == null ? existing.tags : normalizeTags(updates.tags),
    updatedAt: now,
    completedAt: nextStatus === 'done'
      ? (existing.completedAt || now)
      : ''
  };

  const tasks = (getState().tasks || []).map(task => (
    task.id === taskId ? updatedTask : task
  ));
  commitTasks(tasks);
  return updatedTask;
}

export function completeTask(taskId, completed = true) {
  return updateTask(taskId, {
    status: completed ? 'done' : 'todo'
  });
}

export function deleteTask(taskId) {
  const state = getState();
  const tasks = (state.tasks || []).filter(task => task.id !== taskId);
  if (tasks.length === (state.tasks || []).length) return false;
  commitTasks(tasks);
  return true;
}

export function getTaskCounts(referenceDate = new Date()) {
  const localDate = new Date(
    referenceDate.getTime() - referenceDate.getTimezoneOffset() * 60000
  ).toISOString().slice(0, 10);
  const activeTasks = getTasks({ includeCompleted: false });

  return {
    inbox: activeTasks.filter(task => task.status === 'inbox').length,
    today: activeTasks.filter(task => task.dueDate === localDate).length,
    overdue: activeTasks.filter(task => task.dueDate && task.dueDate < localDate).length,
    waiting: activeTasks.filter(task => task.status === 'waiting').length,
    completed: getTasks({ status: 'done' }).length,
    totalActive: activeTasks.length
  };
}
