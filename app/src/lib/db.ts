import Database from "better-sqlite3";
import path from "path";
import bcrypt from "bcryptjs";

const DB_PATH = path.join(process.cwd(), "tokenmesh.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initDb(_db);
  }
  return _db;
}

function initDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT 'New Chat',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    );

    CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
  `);
}

export async function createUser(email: string, password: string, name: string) {
  const db = getDb();
  const { v4: uuidv4 } = await import("uuid");
  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    db.prepare("INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)").run(id, email, passwordHash, name);
    return { id, email, name };
  } catch (err: any) {
    if (err.message?.includes("UNIQUE constraint")) {
      throw new Error("EMAIL_EXISTS");
    }
    throw err;
  }
}

export function verifyUser(email: string, password: string) {
  const db = getDb();
  const row = db.prepare("SELECT id, email, password_hash, name FROM users WHERE email = ?").get(email) as any;
  if (!row) return null;

  const valid = bcrypt.compareSync(password, row.password_hash);
  if (!valid) return null;

  return { id: row.id, email: row.email, name: row.name };
}

export function getUserById(id: string) {
  const db = getDb();
  const row = db.prepare("SELECT id, email, name, created_at FROM users WHERE id = ?").get(id) as any;
  return row || null;
}

export function createConversation(userId: string, title?: string) {
  const db = getDb();
  const { v4: uuidv4 } = require("uuid");
  const id = uuidv4();
  db.prepare("INSERT INTO conversations (id, user_id, title) VALUES (?, ?, ?)").run(id, userId, title || "New Chat");
  return { id, userId, title: title || "New Chat" };
}

export function getConversationsByUserId(userId: string) {
  const db = getDb();
  return db.prepare("SELECT id, title, created_at, updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC").all(userId);
}

export function getConversationById(id: string, userId: string) {
  const db = getDb();
  return db.prepare("SELECT id, user_id, title, created_at, updated_at FROM conversations WHERE id = ? AND user_id = ?").get(id, userId) as any;
}

export function addMessage(conversationId: string, role: string, content: string) {
  const db = getDb();
  const { v4: uuidv4 } = require("uuid");
  const id = uuidv4();
  db.prepare("INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)").run(id, conversationId, role, content);
  db.prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?").run(conversationId);
  return { id, conversationId, role, content };
}

export function getMessagesByConversationId(conversationId: string) {
  const db = getDb();
  return db.prepare("SELECT id, role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC").all(conversationId);
}

export function deleteConversation(id: string, userId: string) {
  const db = getDb();
  const conv = getConversationById(id, userId);
  if (!conv) return false;
  db.prepare("DELETE FROM messages WHERE conversation_id = ?").run(id);
  db.prepare("DELETE FROM conversations WHERE id = ?").run(id);
  return true;
}
