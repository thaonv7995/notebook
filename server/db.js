/**
 * JSON File Database
 * 
 * Simple, reliable JSON file store for single-user.
 * Data stored in data/db.json with atomic writes.
 * 
 * Schema:
 * {
 *   users: [{ id, username, password_hash, created_at }],
 *   notebooks: { [userId]: [...notebookData] }
 * }
 */

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync
} from 'fs';
import { randomUUID } from 'crypto';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const DB_PATH = join(DATA_DIR, 'db.json');
const DB_BACKUP_PATH = join(DATA_DIR, 'db.backup.json');

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

// ─── Load / Save ───

function loadDb() {
  let primaryDatabaseError = null;

  try {
    if (existsSync(DB_PATH)) {
      const parsed = JSON.parse(readFileSync(DB_PATH, 'utf-8'));
      if (
        !parsed
        || typeof parsed !== 'object'
        || !Array.isArray(parsed.users)
        || !parsed.notebooks
        || typeof parsed.notebooks !== 'object'
        || Array.isArray(parsed.notebooks)
      ) {
        throw new Error('Database schema is invalid');
      }

      if (!parsed.syncMeta || typeof parsed.syncMeta !== 'object' || Array.isArray(parsed.syncMeta)) {
        parsed.syncMeta = {};
      }

      return parsed;
    }
  } catch (e) {
    primaryDatabaseError = e;
    console.error('Error reading database:', e.message);

    try {
      if (existsSync(DB_BACKUP_PATH)) {
        const backup = JSON.parse(readFileSync(DB_BACKUP_PATH, 'utf-8'));
        if (
          backup
          && typeof backup === 'object'
          && Array.isArray(backup.users)
          && backup.notebooks
          && typeof backup.notebooks === 'object'
          && !Array.isArray(backup.notebooks)
        ) {
          if (!backup.syncMeta || typeof backup.syncMeta !== 'object' || Array.isArray(backup.syncMeta)) {
            backup.syncMeta = {};
          }
          console.warn('Recovered database from backup file.');
          return backup;
        }
      }
    } catch (backupError) {
      console.error('Error reading database backup:', backupError.message);
    }
  }

  // Never silently replace an existing but unreadable database with an empty
  // one. Doing so could make the next write permanently overwrite recoverable
  // user data. Fail startup and require recovery from the primary or backup.
  if (primaryDatabaseError) {
    throw new Error(
      `Database recovery failed. Check ${DB_PATH} and ${DB_BACKUP_PATH}: ${primaryDatabaseError.message}`
    );
  }

  return { users: [], notebooks: {}, syncMeta: {} };
}

function saveDb(data) {
  // Atomic write: write to unique temp file then rename (prevents collision during concurrent writes)
  const tempPath = join(
    DATA_DIR,
    `db.${process.pid}.${Date.now()}.${randomUUID()}.tmp`
  );
  try {
    const serialized = JSON.stringify(data, null, 2);
    writeFileSync(tempPath, serialized, {
      encoding: 'utf-8',
      mode: 0o600
    });

    if (existsSync(DB_PATH)) {
      copyFileSync(DB_PATH, DB_BACKUP_PATH);
    }

    renameSync(tempPath, DB_PATH);
  } catch (error) {
    try {
      if (existsSync(tempPath)) unlinkSync(tempPath);
    } catch {
      // Preserve the original database error.
    }
    throw error;
  }
}

// In-memory cache
let db = loadDb();

function persist() {
  saveDb(db);
}

// ─── User Operations ───

export function findUserByUsername(username) {
  return db.users.find(u => u.username === username) || null;
}

export function findUserById(id) {
  return db.users.find(u => u.id === id) || null;
}

export function createUser(username, passwordHash) {
  const id = db.users.length > 0 ? Math.max(...db.users.map(u => u.id)) + 1 : 1;
  const user = {
    id,
    username,
    password_hash: passwordHash,
    created_at: new Date().toISOString()
  };
  db.users.push(user);
  persist();
  return user;
}

export function updateUserPassword(userId, newPasswordHash) {
  const user = db.users.find(u => u.id === userId);
  if (user) {
    user.password_hash = newPasswordHash;
    user.updated_at = new Date().toISOString();
    persist();
    return true;
  }
  return false;
}

// ─── Notebook Operations ───

export function loadFullState(userId) {
  return db.notebooks[userId] || [];
}

export function getLastSyncedAt(userId) {
  if (!db.syncMeta) db.syncMeta = {};
  return db.syncMeta[userId]?.lastSyncedAt || null;
}

export function getDeletedNotebookIds(userId) {
  if (!db.syncMeta) db.syncMeta = {};
  return db.syncMeta[userId]?.deletedNotebookIds || [];
}

/**
 * Deep-merge two notebooks at the PAGE level.
 * For pages on both sides, keeps the one with newer updatedAt.
 * Pages only on one side are always preserved.
 */
function mergeNotebookPages(localNb, serverNb) {
  const localTime = localNb.updatedAt || '';
  const serverTime = serverNb.updatedAt || '';

  // Merge tombstones from both sides
  const deletedPageIds = new Set([
    ...(Array.isArray(localNb.deletedPageIds) ? localNb.deletedPageIds : []),
    ...(Array.isArray(serverNb.deletedPageIds) ? serverNb.deletedPageIds : [])
  ]);

  // Base metadata from whichever notebook is newer
  const base = serverTime > localTime
    ? JSON.parse(JSON.stringify(serverNb))
    : JSON.parse(JSON.stringify(localNb));

  const localPages = new Map();
  (localNb.pages || []).forEach(p => {
    if (p && p.id && !deletedPageIds.has(p.id)) localPages.set(p.id, p);
  });

  const serverPages = new Map();
  (serverNb.pages || []).forEach(p => {
    if (p && p.id && !deletedPageIds.has(p.id)) serverPages.set(p.id, p);
  });

  const allPageIds = new Set([...localPages.keys(), ...serverPages.keys()]);
  const mergedPages = [];

  for (const pid of allPageIds) {
    const lp = localPages.get(pid);
    const sp = serverPages.get(pid);

    if (lp && sp) {
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
  base.deletedPageIds = Array.from(deletedPageIds).slice(-200);

  // Update notebook updatedAt to the latest page time
  const latestPage = mergedPages.reduce((latest, p) => {
    return (p.updatedAt && p.updatedAt > latest) ? p.updatedAt : latest;
  }, base.updatedAt || '');
  if (latestPage) base.updatedAt = latestPage;

  return base;
}

/**
 * Smart merge: for each notebook, deep-merge at the PAGE level using
 * updatedAt timestamps. Individual page edits from different devices
 * are preserved instead of one device overwriting the other.
 * New notebooks from either side are always preserved.
 * Notebooks deleted on one side (missing from incoming) are kept if they
 * were updated on server after the client's last known sync.
 */
export function mergeAndSaveState(userId, incomingNotebooks, clientLastSyncedAt, clientDeletedNotebookIds = []) {
  const existing = db.notebooks[userId] || [];
  const now = new Date().toISOString();

  if (!db.syncMeta) db.syncMeta = {};
  if (!db.syncMeta[userId]) db.syncMeta[userId] = {};
  const serverDeletedSet = new Set([
    ...(Array.isArray(db.syncMeta[userId].deletedNotebookIds) ? db.syncMeta[userId].deletedNotebookIds : []),
    ...(Array.isArray(clientDeletedNotebookIds) ? clientDeletedNotebookIds : [])
  ]);

  // Build maps keyed by notebook id
  const serverMap = new Map();
  existing.forEach(nb => {
    if (!serverDeletedSet.has(nb.id)) serverMap.set(nb.id, nb);
  });

  const incomingMap = new Map();
  incomingNotebooks.forEach(nb => {
    if (!serverDeletedSet.has(nb.id)) incomingMap.set(nb.id, nb);
  });

  const merged = [];
  const allIds = new Set([...serverMap.keys(), ...incomingMap.keys()]);

  for (const id of allIds) {
    const serverNb = serverMap.get(id);
    const clientNb = incomingMap.get(id);

    if (serverNb && clientNb) {
      // Both exist — deep-merge at page level
      merged.push(mergeNotebookPages(clientNb, serverNb));
    } else if (clientNb && !serverNb) {
      // Only on client — new notebook, add it
      merged.push(clientNb);
    } else if (serverNb && !clientNb) {
      // Only on server — preserve it unless explicitly marked deleted in tombstones
      if (!serverDeletedSet.has(id)) {
        merged.push(serverNb);
      }
    }
  }

  const finalDeletedIds = Array.from(serverDeletedSet).slice(-200);
  db.notebooks[userId] = merged;
  db.syncMeta[userId] = {
    ...db.syncMeta[userId],
    lastSyncedAt: now,
    deletedNotebookIds: finalDeletedIds
  };
  persist();

  return { merged, savedAt: now, deletedNotebookIds: finalDeletedIds };
}

export function saveFullState(userId, notebooks) {
  db.notebooks[userId] = notebooks;
  if (!db.syncMeta) db.syncMeta = {};
  if (!db.syncMeta[userId]) db.syncMeta[userId] = {};
  db.syncMeta[userId].lastSyncedAt = new Date().toISOString();
  persist();
}

export function deleteNotebookById(userId, notebookId) {
  const userNotebooks = db.notebooks[userId] || [];
  db.notebooks[userId] = userNotebooks.filter(nb => nb.id !== notebookId);

  if (!db.syncMeta) db.syncMeta = {};
  if (!db.syncMeta[userId]) db.syncMeta[userId] = {};
  const deletedSet = new Set(Array.isArray(db.syncMeta[userId].deletedNotebookIds) ? db.syncMeta[userId].deletedNotebookIds : []);
  deletedSet.add(notebookId);
  db.syncMeta[userId].deletedNotebookIds = Array.from(deletedSet).slice(-200);
  db.syncMeta[userId].lastSyncedAt = new Date().toISOString();
  persist();
}

export function updateNotebookProgress(userId, notebookId, lastPageIndex) {
  const userNotebooks = db.notebooks[userId] || [];
  const nb = userNotebooks.find(n => n.id === notebookId);
  if (!nb) {
    return { ok: false, reason: 'not_found' };
  }

  const pageCount = Array.isArray(nb.pages) ? nb.pages.length : 0;
  if (
    !Number.isSafeInteger(lastPageIndex)
    || lastPageIndex < 0
    || pageCount === 0
    || lastPageIndex >= pageCount
  ) {
    return {
      ok: false,
      reason: 'out_of_range',
      pageCount
    };
  }

  const now = new Date().toISOString();
  nb.lastPageIndex = lastPageIndex;
  nb.updatedAt = now;
  if (!db.syncMeta) db.syncMeta = {};
  if (!db.syncMeta[userId]) db.syncMeta[userId] = {};
  db.syncMeta[userId].lastSyncedAt = now;
  persist();

  return {
    ok: true,
    lastPageIndex,
    pageCount
  };
}

export default db;
