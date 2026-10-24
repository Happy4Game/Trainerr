import type { SqlDatabase, SqlValue } from '../sqlite/database';
import { latestSchemaVersion } from '../sqlite/migrations';
import { sqlLiteral as q } from '../sqlite/sqlLiteral';

/** User data only: the exercise catalog is rebuilt from the app itself. */
const USER_TABLES = [
  'gym',
  'gym_machine',
  'session',
  'set_log',
  'reference_load',
  'availability',
  'badge',
  'body_measurement',
  'training_cycle',
] as const;
/** Settings and other per-user values kept in app_meta. */
const USER_META_KEYS = ['settings'];

export interface Backup {
  readonly app: 'trainerr';
  readonly schemaVersion: number;
  readonly exportedAt: string;
  readonly tables: Readonly<Record<string, readonly Record<string, SqlValue>[]>>;
  readonly meta: Readonly<Record<string, string>>;
}

export async function exportBackup(db: SqlDatabase, now = new Date()): Promise<Backup> {
  const tables: Record<string, Record<string, SqlValue>[]> = {};
  for (const table of USER_TABLES) {
    tables[table] = await db.query<Record<string, SqlValue>>(
      `SELECT * FROM ${table} ORDER BY rowid`,
    );
  }
  const metaRows = await db.query<{ key: string; value: string }>(
    `SELECT key, value FROM app_meta WHERE key IN (${USER_META_KEYS.map(q).join(', ')})`,
  );
  return {
    app: 'trainerr',
    schemaVersion: latestSchemaVersion,
    exportedAt: now.toISOString(),
    tables,
    meta: Object.fromEntries(metaRows.map((r) => [r.key, r.value])),
  };
}

/** Removes every piece of user data (sessions, sets, body, settings) in one transaction. */
export async function deleteAllUserData(db: SqlDatabase): Promise<void> {
  await db.executeScript(deleteStatements().join('\n'));
}

/**
 * Replaces the user data by a backup, in one transaction: a broken file
 * leaves the phone data untouched.
 */
export async function importBackup(db: SqlDatabase, backup: Backup): Promise<void> {
  if (backup.app !== 'trainerr') throw new Error('Ce fichier n’est pas une sauvegarde Trainerr.');
  if (backup.schemaVersion > latestSchemaVersion) {
    throw new Error(
      'Cette sauvegarde vient d’une version plus récente de l’appli : mets-la à jour.',
    );
  }
  const statements = deleteStatements();
  for (const table of USER_TABLES) {
    for (const row of backup.tables[table] ?? []) {
      const columns = Object.keys(row);
      if (!columns.every((c) => /^\w+$/.test(c))) throw new Error('Sauvegarde invalide.');
      statements.push(
        `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map((c) => q(row[c])).join(', ')});`,
      );
    }
  }
  for (const [key, value] of Object.entries(backup.meta)) {
    if (!USER_META_KEYS.includes(key)) continue;
    statements.push(`INSERT INTO app_meta (key, value) VALUES (${q(key)}, ${q(value)});`);
  }
  await db.executeScript(statements.join('\n'));
}

function deleteStatements(): string[] {
  // Children first, because of the foreign keys.
  return [
    ...[...USER_TABLES].reverse().map((table) => `DELETE FROM ${table};`),
    `DELETE FROM app_meta WHERE key IN (${USER_META_KEYS.map(q).join(', ')});`,
  ];
}

/** CSV of every set, for spreadsheets or other apps. */
export async function exportSetsCsv(db: SqlDatabase): Promise<string> {
  const rows = await db.query<Record<string, SqlValue>>(
    `SELECT s.date, s.template, l.exercise_id, e.name AS exercise, l.load_kg, l.reps, l.difficulty,
            l.warmup, l.slow_tempo, l.complete_reps
       FROM set_log l JOIN session s ON s.id = l.session_id
       LEFT JOIN exercise e ON e.id = l.exercise_id
      ORDER BY s.date, l.position`,
  );
  const header = [
    'date',
    'template',
    'exercise_id',
    'exercise',
    'load_kg',
    'reps',
    'difficulty',
    'warmup',
    'slow_tempo',
    'complete_reps',
  ];
  const cell = (value: SqlValue | undefined) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [header.join(','), ...rows.map((r) => header.map((h) => cell(r[h])).join(','))].join('\n');
}
