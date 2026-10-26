import type { IsoDate } from '@/domain/types';
import type { SqlDatabase } from '../sqlite/database';
import { newId } from './sessionRepository';

export interface BodyMeasurement {
  readonly id: string;
  readonly date: IsoDate;
  readonly weightKg?: number;
  /** In cm: arm, waist… */
  readonly measurements: Readonly<Record<string, number>>;
  /** Monthly photo (JPEG data URL), on the phone only. */
  readonly photo?: string;
}

/** Body data stays on the phone only, never synced (SPEC.md, privacy). */
export async function addMeasurement(
  db: SqlDatabase,
  input: Omit<BodyMeasurement, 'id'>,
): Promise<BodyMeasurement> {
  const id = newId();
  await db.run(
    'INSERT INTO body_measurement (id, date, weight_kg, measurements, photo_path) VALUES (?, ?, ?, ?, ?)',
    [
      id,
      input.date,
      input.weightKg ?? null,
      JSON.stringify(input.measurements),
      input.photo ?? null,
    ],
  );
  return { id, ...input };
}

export async function deleteMeasurement(db: SqlDatabase, id: string): Promise<void> {
  await db.run('DELETE FROM body_measurement WHERE id = ?', [id]);
}

export async function listMeasurements(db: SqlDatabase): Promise<BodyMeasurement[]> {
  const rows = await db.query<{
    id: string;
    date: string;
    weight_kg: number | null;
    measurements: string;
    photo_path: string | null;
  }>(
    'SELECT id, date, weight_kg, measurements, photo_path FROM body_measurement ORDER BY date, rowid',
  );
  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    ...(r.weight_kg !== null ? { weightKg: r.weight_kg } : {}),
    measurements: JSON.parse(r.measurements) as Record<string, number>,
    ...(r.photo_path ? { photo: r.photo_path } : {}),
  }));
}
