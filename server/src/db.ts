import { DatabaseSync } from 'node:sqlite';

/**
 * Server storage: only what the challenges need. No e-mail, no password, no
 * loads unless the user chose to share their records.
 */
export function openDatabase(path: string): DatabaseSync {
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS account (
      id TEXT PRIMARY KEY,
      token_hash TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS challenge_group (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS membership (
      group_id TEXT NOT NULL REFERENCES challenge_group (id) ON DELETE CASCADE,
      account_id TEXT NOT NULL REFERENCES account (id) ON DELETE CASCADE,
      PRIMARY KEY (group_id, account_id)
    );
    CREATE TABLE IF NOT EXISTS weekly_stats (
      account_id TEXT NOT NULL REFERENCES account (id) ON DELETE CASCADE,
      week_start TEXT NOT NULL,
      sessions INTEGER NOT NULL,
      weeks_on_pace INTEGER NOT NULL,
      records TEXT,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (account_id, week_start)
    );
    CREATE TABLE IF NOT EXISTS advice_usage (
      account_id TEXT NOT NULL REFERENCES account (id) ON DELETE CASCADE,
      day TEXT NOT NULL,
      count INTEGER NOT NULL,
      PRIMARY KEY (account_id, day)
    );
  `);
  return db;
}
