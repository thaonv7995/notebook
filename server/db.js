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

// ─── Notebook Operations ───

export function loadFullState(userId) {
  return db.notebooks[userId] || [];
}

export function saveFullState(userId, notebooks) {
  db.notebooks[userId] = notebooks;
  persist();
}

export function deleteNotebookById(userId, notebookId) {
  const userNotebooks = db.notebooks[userId] || [];
  db.notebooks[userId] = userNotebooks.filter(nb => nb.id !== notebookId);
  persist();
}

export default db;
