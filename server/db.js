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

import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const DB_PATH = join(DATA_DIR, 'db.json');
const DB_TEMP = join(DATA_DIR, 'db.tmp.json');

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

// ─── Load / Save ───

function loadDb() {
  try {
    if (existsSync(DB_PATH)) {
      return JSON.parse(readFileSync(DB_PATH, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading database:', e.message);
  }
  return { users: [], notebooks: {} };
}

function saveDb(data) {
  // Atomic write: write to temp file then rename
  writeFileSync(DB_TEMP, JSON.stringify(data, null, 2), 'utf-8');
  renameSync(DB_TEMP, DB_PATH);
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

/**
 * Smart merge: for each notebook, keep the version with the newer updatedAt.
 * New notebooks from either side are always preserved.
 * Notebooks deleted on one side (missing from incoming) are kept if they
 * were updated on server after the client's last known sync.
 */
export function mergeAndSaveState(userId, incomingNotebooks, clientLastSyncedAt) {
  const existing = db.notebooks[userId] || [];
  const now = new Date().toISOString();

  // Build maps keyed by notebook id
  const serverMap = new Map();
  existing.forEach(nb => serverMap.set(nb.id, nb));

  const incomingMap = new Map();
  incomingNotebooks.forEach(nb => incomingMap.set(nb.id, nb));

  const merged = [];
  const allIds = new Set([...serverMap.keys(), ...incomingMap.keys()]);

  for (const id of allIds) {
    const serverNb = serverMap.get(id);
    const clientNb = incomingMap.get(id);

    if (serverNb && clientNb) {
      // Both exist — keep the one with newer updatedAt
      const serverTime = serverNb.updatedAt || '';
      const clientTime = clientNb.updatedAt || '';
      merged.push(clientTime >= serverTime ? clientNb : serverNb);
    } else if (clientNb && !serverNb) {
      // Only on client — new notebook, add it
      merged.push(clientNb);
    } else if (serverNb && !clientNb) {
      // Only on server — client may have deleted it, or client never had it
      // If client provided a lastSyncedAt and the server notebook was updated
      // AFTER that timestamp, keep it (client didn't know about the update).
      // Otherwise, the client intentionally deleted it.
      if (clientLastSyncedAt && serverNb.updatedAt && serverNb.updatedAt > clientLastSyncedAt) {
        merged.push(serverNb);
      }
      // else: client explicitly deleted it — omit from merged result
    }
  }

  db.notebooks[userId] = merged;
  if (!db.syncMeta) db.syncMeta = {};
  db.syncMeta[userId] = { lastSyncedAt: now };
  persist();

  return { merged, savedAt: now };
}

export function saveFullState(userId, notebooks) {
  db.notebooks[userId] = notebooks;
  if (!db.syncMeta) db.syncMeta = {};
  db.syncMeta[userId] = { lastSyncedAt: new Date().toISOString() };
  persist();
}

export function deleteNotebookById(userId, notebookId) {
  const userNotebooks = db.notebooks[userId] || [];
  db.notebooks[userId] = userNotebooks.filter(nb => nb.id !== notebookId);
  persist();
}

export default db;
