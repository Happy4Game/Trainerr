import type { IsoDate } from '@/domain/types';
import type { SqlDatabase } from '../sqlite/database';

/** Performance before the break, used by the comeback mode. */
export interface ReferenceLoad {
  readonly exerciseId: string;
  readonly loadKg: number;
  readonly reps: number;
  readonly date: IsoDate;
}

export async function setReference(db: SqlDatabase, reference: ReferenceLoad): Promise<void> {
  await db.run(
    `INSERT INTO reference_load (exercise_id, load_kg, reps, date) VALUES (?, ?, ?, ?)
       ON CONFLICT (exercise_id) DO UPDATE SET load_kg = excluded.load_kg, reps = excluded.reps,
         date = excluded.date`,
    [reference.exerciseId, reference.loadKg, reference.reps, reference.date],
  );
}

export async function deleteReference(db: SqlDatabase, exerciseId: string): Promise<void> {
  await db.run('DELETE FROM reference_load WHERE exercise_id = ?', [exerciseId]);
}

export async function listReferences(db: SqlDatabase): Promise<ReferenceLoad[]> {
  const rows = await db.query<{ exercise_id: string; load_kg: number; reps: number; date: string }>(
    'SELECT exercise_id, load_kg, reps, date FROM reference_load',
  );
  return rows.map((r) => ({
    exerciseId: r.exercise_id,
    loadKg: r.load_kg,
    reps: r.reps,
    date: r.date,
  }));
}
