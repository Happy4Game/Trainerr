import type { CardioEntry, CardioId, DatedCardio } from '@/domain/cardio';
import type { IsoDate } from '@/domain/types';
import type { SqlDatabase } from '../sqlite/database';
import { newId } from './sessionRepository';

interface CardioRow {
  id: string;
  session_id: string | null;
  date: string;
  cardio_id: string;
  position: 'before' | 'after' | null;
  minutes: number;
  distance_km: number | null;
  speed_kmh: number | null;
  incline_pct: number | null;
  level: number | null;
  cadence: number | null;
  avg_hr: number | null;
  calories: number | null;
  effort: 'light' | 'moderate' | 'vigorous' | null;
  note: string | null;
}

/** Column of each optional value of an entry. */
const COLUMNS = {
  distanceKm: 'distance_km',
  speedKmh: 'speed_kmh',
  inclinePct: 'incline_pct',
  level: 'level',
  cadence: 'cadence',
  avgHr: 'avg_hr',
  calories: 'calories',
  effort: 'effort',
  position: 'position',
  note: 'note',
} as const satisfies Partial<Record<keyof CardioEntry, keyof CardioRow>>;

function toEntry(row: CardioRow): DatedCardio {
  const optional = Object.fromEntries(
    Object.entries(COLUMNS)
      .map(([key, column]) => [key, row[column]])
      .filter(([, value]) => value !== null && value !== undefined && value !== ''),
  ) as Partial<CardioEntry>;
  return {
    id: row.id,
    date: row.date,
    cardioId: row.cardio_id as CardioId,
    minutes: row.minutes,
    ...(row.session_id ? { sessionId: row.session_id } : {}),
    ...optional,
  };
}

function values(entry: CardioEntry) {
  return Object.keys(COLUMNS).map((key) => {
    const value = entry[key as keyof typeof COLUMNS];
    return typeof value === 'string' ? value.trim() || null : (value ?? null);
  });
}

export async function addCardio(
  db: SqlDatabase,
  input: { date: IsoDate; sessionId?: string; entry: CardioEntry },
): Promise<DatedCardio> {
  const id = newId();
  await db.run(
    `INSERT INTO cardio_log (id, session_id, date, cardio_id, minutes, ${Object.values(COLUMNS).join(', ')})
     VALUES (?, ?, ?, ?, ?, ${Object.keys(COLUMNS)
       .map(() => '?')
       .join(', ')})`,
    [
      id,
      input.sessionId ?? null,
      input.date,
      input.entry.cardioId,
      input.entry.minutes,
      ...values(input.entry),
    ],
  );
  const rows = await db.query<CardioRow>('SELECT * FROM cardio_log WHERE id = ?', [id]);
  return toEntry(rows[0] as CardioRow);
}

/** A correction: every value is replaced by the one given (missing ones are cleared). */
export async function updateCardio(db: SqlDatabase, id: string, entry: CardioEntry) {
  await db.run(
    `UPDATE cardio_log SET cardio_id = ?, minutes = ?, ${Object.values(COLUMNS)
      .map((c) => `${c} = ?`)
      .join(', ')} WHERE id = ?`,
    [entry.cardioId, entry.minutes, ...values(entry), id],
  );
}

export async function deleteCardio(db: SqlDatabase, id: string): Promise<void> {
  await db.run('DELETE FROM cardio_log WHERE id = ?', [id]);
}

/** All the cardio, oldest first. */
export async function listCardio(db: SqlDatabase): Promise<DatedCardio[]> {
  const rows = await db.query<CardioRow>('SELECT * FROM cardio_log ORDER BY date, rowid');
  return rows.map(toEntry);
}

/** Minutes of cardio logged with a session (0 when none). */
export async function cardioMinutesOf(db: SqlDatabase, sessionId: string): Promise<number> {
  const rows = await db.query<{ minutes: number | null }>(
    'SELECT SUM(minutes) AS minutes FROM cardio_log WHERE session_id = ?',
    [sessionId],
  );
  return rows[0]?.minutes ?? 0;
}
