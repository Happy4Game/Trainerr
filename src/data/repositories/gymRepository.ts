import { normalizeSteps } from '@/domain/loadSteps';
import type { SqlDatabase, SqlValue } from '../sqlite/database';

/** One gym for now; several gyms come with the "Plusieurs salles" feature. */
export const DEFAULT_GYM_ID = 'default';

export interface GymMachine {
  readonly favorite: boolean;
  readonly loadSteps: readonly number[];
  /** Free text: seat height, backrest, handle… */
  readonly note?: string;
}

export interface Gym {
  readonly id: string;
  readonly name: string;
}

export async function listGyms(db: SqlDatabase): Promise<Gym[]> {
  return db.query<Gym>('SELECT id, name FROM gym ORDER BY rowid');
}

export async function addGym(db: SqlDatabase, id: string, name: string): Promise<void> {
  await db.run('INSERT INTO gym (id, name) VALUES (?, ?)', [id, name.trim()]);
}

export async function renameGym(db: SqlDatabase, id: string, name: string): Promise<void> {
  await db.run('UPDATE gym SET name = ? WHERE id = ?', [name.trim(), id]);
}

export async function ensureDefaultGym(db: SqlDatabase, name: string): Promise<void> {
  await db.run('INSERT OR IGNORE INTO gym (id, name) VALUES (?, ?)', [DEFAULT_GYM_ID, name]);
}

export async function setFavorite(
  db: SqlDatabase,
  gymId: string,
  exerciseId: string,
  favorite: boolean,
): Promise<void> {
  await upsertMachine(db, gymId, exerciseId, 'favorite', favorite ? 1 : 0);
}

export async function setLoadSteps(
  db: SqlDatabase,
  gymId: string,
  exerciseId: string,
  steps: readonly number[],
): Promise<void> {
  await upsertMachine(
    db,
    gymId,
    exerciseId,
    'load_steps_kg',
    JSON.stringify(normalizeSteps(steps)),
  );
}

export async function setMachineNote(
  db: SqlDatabase,
  gymId: string,
  exerciseId: string,
  note: string,
): Promise<void> {
  await upsertMachine(db, gymId, exerciseId, 'settings', note.trim() || null);
}

/** Photo of the machine plate (JPEG data URL), kept on the phone only. */
export async function setPlatePhoto(
  db: SqlDatabase,
  gymId: string,
  exerciseId: string,
  photo: string | null,
): Promise<void> {
  await upsertMachine(db, gymId, exerciseId, 'plate_photo', photo);
}

export async function getMachine(
  db: SqlDatabase,
  gymId: string,
  exerciseId: string,
): Promise<GymMachine> {
  const rows = await db.query<{ favorite: number; load_steps_kg: string; settings: string | null }>(
    'SELECT favorite, load_steps_kg, settings FROM gym_machine WHERE gym_id = ? AND exercise_id = ?',
    [gymId, exerciseId],
  );
  const row = rows[0];
  if (!row) return { favorite: false, loadSteps: [] };
  return {
    favorite: row.favorite === 1,
    loadSteps: JSON.parse(row.load_steps_kg) as number[],
    ...(row.settings ? { note: row.settings } : {}),
  };
}

type MachineColumn = 'favorite' | 'load_steps_kg' | 'settings' | 'plate_photo';

async function upsertMachine(
  db: SqlDatabase,
  gymId: string,
  exerciseId: string,
  column: MachineColumn,
  value: SqlValue,
): Promise<void> {
  // `column` comes from the fixed MachineColumn list above, never from user input.
  await db.run(
    `INSERT INTO gym_machine (id, gym_id, exercise_id, ${column}) VALUES (?, ?, ?, ?)
       ON CONFLICT (gym_id, exercise_id) DO UPDATE SET ${column} = excluded.${column}`,
    [`${gymId}:${exerciseId}`, gymId, exerciseId, value],
  );
}
