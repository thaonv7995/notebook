/**
 * Quick Capture Parser
 *
 * Parses a concise capture string without AI or network access.
 *
 * Supported syntax:
 *   #Notebook      target notebook
 *   @tag           task tag
 *   p1..p4         priority
 *   /task          force task
 *   /note          force note
 *   /inbox         save as inbox task
 *   today          due today
 *   tomorrow       due tomorrow
 *   hôm nay        due today
 *   ngày mai       due tomorrow
 *   dd/mm          due date in the current year
 *   dd/mm/yyyy     explicit due date
 *   HH:mm          due time
 */

const COMMANDS = new Set(['/task', '/note', '/inbox']);
const PRIORITY_PATTERN = /^p([1-4])$/i;
const TIME_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)$/;
const DATE_PATTERN = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/;

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatLocalDate(date) {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join('-');
}

function addLocalDays(date, days) {
  const result = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  result.setDate(result.getDate() + days);
  return result;
}

function isValidDateParts(year, month, day) {
  const candidate = new Date(year, month - 1, day);
  return (
    candidate.getFullYear() === year
    && candidate.getMonth() === month - 1
    && candidate.getDate() === day
  );
}

function parseNumericDate(token, referenceDate) {
  const match = token.match(DATE_PATTERN);
  if (!match) return '';

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = match[3]
    ? Number(match[3])
    : referenceDate.getFullYear();

  if (!isValidDateParts(year, month, day)) return '';
  return `${year}-${pad(month)}-${pad(day)}`;
}

function normalizeNotebookToken(value) {
  return String(value || '')
    .replace(/^#/, '')
    .replace(/_/g, ' ')
    .trim();
}

function normalizeTagToken(value) {
  return String(value || '')
    .replace(/^@/, '')
    .trim();
}

/**
 * Resolve a parsed notebook query against the current notebook collection.
 * Exact title/id matches win; partial title matches are used as fallback.
 */
export function resolveNotebook(query, notebooks = []) {
  const normalizedQuery = normalizeNotebookToken(query).toLocaleLowerCase('vi');
  if (!normalizedQuery) return null;

  const candidates = (Array.isArray(notebooks) ? notebooks : [])
    .filter(notebook => notebook && notebook.id);

  return candidates.find(notebook => (
    String(notebook.id).toLocaleLowerCase('vi') === normalizedQuery
    || String(notebook.title || '').toLocaleLowerCase('vi') === normalizedQuery
  )) || candidates.find(notebook => (
    String(notebook.title || '')
      .toLocaleLowerCase('vi')
      .includes(normalizedQuery)
  )) || null;
}

/**
 * Parse a Quick Capture entry into stable metadata and a clean title.
 */
export function parseQuickCapture(input, {
  referenceDate = new Date(),
  notebooks = []
} = {}) {
  const raw = String(input || '').trim();
  const tokens = raw ? raw.split(/\s+/) : [];
  const titleTokens = [];
  const tags = [];

  let type = 'task';
  let status = 'inbox';
  let priority = 4;
  let dueDate = '';
  let dueTime = '';
  let notebookQuery = '';
  let command = '';

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const lowerToken = token.toLocaleLowerCase('vi');

    if (COMMANDS.has(lowerToken)) {
      command = lowerToken;
      if (lowerToken === '/note') type = 'note';
      if (lowerToken === '/task') {
        type = 'task';
        status = 'todo';
      }
      if (lowerToken === '/inbox') {
        type = 'task';
        status = 'inbox';
      }
      continue;
    }

    const priorityMatch = token.match(PRIORITY_PATTERN);
    if (priorityMatch) {
      priority = Number(priorityMatch[1]);
      continue;
    }

    const timeMatch = token.match(TIME_PATTERN);
    if (timeMatch) {
      dueTime = `${pad(timeMatch[1])}:${timeMatch[2]}`;
      continue;
    }

    const numericDate = parseNumericDate(token, referenceDate);
    if (numericDate) {
      dueDate = numericDate;
      continue;
    }

    if (lowerToken === 'today') {
      dueDate = formatLocalDate(referenceDate);
      continue;
    }

    if (lowerToken === 'tomorrow') {
      dueDate = formatLocalDate(addLocalDays(referenceDate, 1));
      continue;
    }

    if (
      lowerToken === 'hôm'
      && tokens[index + 1]?.toLocaleLowerCase('vi') === 'nay'
    ) {
      dueDate = formatLocalDate(referenceDate);
      index += 1;
      continue;
    }

    if (
      lowerToken === 'ngày'
      && tokens[index + 1]?.toLocaleLowerCase('vi') === 'mai'
    ) {
      dueDate = formatLocalDate(addLocalDays(referenceDate, 1));
      index += 1;
      continue;
    }

    if (token.startsWith('#') && token.length > 1 && !notebookQuery) {
      notebookQuery = normalizeNotebookToken(token);
      continue;
    }

    if (token.startsWith('@') && token.length > 1) {
      const tag = normalizeTagToken(token);
      if (tag && !tags.includes(tag)) tags.push(tag);
      continue;
    }

    titleTokens.push(token);
  }

  const notebook = resolveNotebook(notebookQuery, notebooks);
  const title = titleTokens.join(' ').trim();

  return {
    raw,
    type,
    command,
    title,
    status,
    priority,
    dueDate,
    dueTime,
    tags: tags.slice(0, 20),
    notebookQuery,
    notebookId: notebook?.id || '',
    notebookTitle: notebook?.title || '',
    isValid: Boolean(title),
    unresolvedNotebook: Boolean(notebookQuery && !notebook)
  };
}
