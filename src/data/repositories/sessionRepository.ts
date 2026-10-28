import type { ExerciseQueue } from '@/domain/busyMachine';
import type { CardioPlan } from '@/domain/cardio';
import type { Difficulty, IsoDate, RepRange, SessionLog, SetLog } from '@/domain/types';
import type { SqlDatabase } from '../sqlite/database';
import { sqlLiteral as q } from '../sqlite/sqlLiteral';

export interface PlannedExercise {
  readonly exerciseId: string;
  readonly sets: number;
  /** Ready-made session: its own rep range and rest instead of the exercise defaults. */
  readonly repRange?: RepRange;
  readonly restSeconds?: number;
  /** Reps are seconds held (plank). */
  readonly timed?: boolean;
  /** Reps counted for each leg. */
  readonly perSide?: boolean;
}

/** What is needed to resume a session after the app was closed. */
export interface SessionPlan {
  readonly exercises: readonly PlannedExercise[];
  readonly queue: ExerciseQueue;
  /** Machines still taken at the end, moved to the next session of the same type. */
  readonly carryOver?: readonly string[];
  /** Exercises done back to back, rest after the second one. */
  readonly supersets?: readonly (readonly [string, string])[];
  /** Short 20–30 min version of the session of the day. */
  readonly express?: boolean;
  /** "Not in shape today": one set less, no load increase. */
  readonly tired?: boolean;
  /** When the session started (ms since 1970), for its length in the summary. */
  readonly startedAt?: number;
  /** Cardio before or after the weights, chosen before starting; skipped on the day. */
  readonly cardio?: CardioPlan & { readonly skipped?: boolean };
}

export interface StoredSet extends SetLog {
  readonly id: string;
}

export interface ActiveSession {
  readonly id: string;
  readonly date: IsoDate;
  readonly templateId: string;
  readonly plan: SessionPlan;
  readonly sets: readonly StoredSet[];
  /** Free text: "mal dormi", "salle bondée"… */
  readonly note?: string;
}

let counter = 0;

export function newId(): string {
  // crypto.randomUUID only exists in secure contexts; the dev server on the
  // local network is plain http. The counter keeps ids unique within a millisecond.
  counter = (counter + 1) % 1_000_000;
  return `${Date.now().toString(36)}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function startSession(
  db: SqlDatabase,
  input: { date: IsoDate; templateId: string; gymId: string; plan: SessionPlan },
): Promise<string> {
  const id = newId();
  await db.run(
    `INSERT INTO session (id, date, template, status, gym_id, plan) VALUES (?, ?, ?, 'inProgress', ?, ?)`,
    [
      id,
      input.date,
      input.templateId,
      input.gymId,
      JSON.stringify({ startedAt: Date.now(), ...input.plan }),
    ],
  );
  return id;
}

export async function savePlan(db: SqlDatabase, sessionId: string, plan: SessionPlan) {
  await db.run('UPDATE session SET plan = ? WHERE id = ?', [JSON.stringify(plan), sessionId]);
}

export async function addSet(db: SqlDatabase, sessionId: string, set: SetLog): Promise<StoredSet> {
  const id = newId();
  await db.run(
    `INSERT INTO set_log (id, session_id, exercise_id, position, load_kg, reps, difficulty,
       warmup, slow_tempo, complete_reps, rir, note, done_at)
     VALUES (?, ?, ?, (SELECT COALESCE(MAX(position), 0) + 1 FROM set_log WHERE session_id = ?),
       ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      sessionId,
      set.exerciseId,
      sessionId,
      set.loadKg,
      set.reps,
      set.difficulty,
      set.warmup ? 1 : 0,
      set.slowTempo ? 1 : 0,
      set.completeReps === false ? 0 : 1,
      set.rir ?? null,
      set.note?.trim() || null,
      set.doneAt ?? null,
    ],
  );
  return { ...set, id };
}

export async function setSessionNote(db: SqlDatabase, sessionId: string, note: string) {
  await db.run('UPDATE session SET note = ? WHERE id = ?', [note.trim() || null, sessionId]);
}

export async function deleteSet(db: SqlDatabase, setId: string): Promise<void> {
  await db.run('DELETE FROM set_log WHERE id = ?', [setId]);
}

/** Correction of a set typed wrong, from the history. RIR and note change only when given. */
export async function updateSet(
  db: SqlDatabase,
  setId: string,
  values: Pick<SetLog, 'loadKg' | 'reps' | 'difficulty'> & {
    readonly rir?: number | undefined;
    readonly note?: string | undefined;
  },
): Promise<void> {
  await db.run('UPDATE set_log SET load_kg = ?, reps = ?, difficulty = ? WHERE id = ?', [
    values.loadKg,
    values.reps,
    values.difficulty,
    setId,
  ]);
  if ('rir' in values)
    await db.run('UPDATE set_log SET rir = ? WHERE id = ?', [values.rir ?? null, setId]);
  if ('note' in values)
    await db.run('UPDATE set_log SET note = ? WHERE id = ?', [values.note?.trim() || null, setId]);
}

export async function setSessionDate(db: SqlDatabase, sessionId: string, date: IsoDate) {
  await db.run('UPDATE session SET date = ? WHERE id = ?', [date, sessionId]);
  await db.run('UPDATE cardio_log SET date = ? WHERE session_id = ?', [date, sessionId]);
}

/** A whole session removed from the history, its sets and cardio with it. */
export async function deleteSession(db: SqlDatabase, sessionId: string): Promise<void> {
  await db.run('DELETE FROM set_log WHERE session_id = ?', [sessionId]);
  await db.run('DELETE FROM cardio_log WHERE session_id = ?', [sessionId]);
  await db.run('DELETE FROM session WHERE id = ?', [sessionId]);
}

export async function finishSession(
  db: SqlDatabase,
  sessionId: string,
  plan: SessionPlan,
): Promise<void> {
  await db.run(`UPDATE session SET status = 'done', plan = ? WHERE id = ?`, [
    JSON.stringify(plan),
    sessionId,
  ]);
}

/** A started session with no set at all is simply dropped. */
export async function abandonSession(db: SqlDatabase, sessionId: string): Promise<void> {
  await db.run('DELETE FROM session WHERE id = ?', [sessionId]);
}

interface SessionRow {
  id: string;
  date: string;
  template: string;
  plan: string;
  note: string | null;
}
interface SetRow {
  id: string;
  session_id: string;
  exercise_id: string;
  load_kg: number;
  reps: number;
  difficulty: Difficulty;
  warmup: number;
  slow_tempo: number;
  complete_reps: number;
  rir: number | null;
  note: string | null;
  done_at: number | null;
}

function toSet(row: SetRow): StoredSet {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    loadKg: row.load_kg,
    reps: row.reps,
    difficulty: row.difficulty,
    ...(row.warmup ? { warmup: true } : {}),
    ...(row.slow_tempo ? { slowTempo: true } : {}),
    ...(row.complete_reps ? {} : { completeReps: false }),
    ...(row.rir === null || row.rir === undefined ? {} : { rir: row.rir }),
    ...(row.note ? { note: row.note } : {}),
    ...(row.done_at ? { doneAt: row.done_at } : {}),
  };
}

async function setsOf(db: SqlDatabase, where: string, params: string[]): Promise<SetRow[]> {
  return db.query<SetRow>(
    `SELECT l.* FROM set_log l JOIN session s ON s.id = l.session_id WHERE ${where} ORDER BY l.position`,
    params,
  );
}

export async function getActiveSession(db: SqlDatabase): Promise<ActiveSession | undefined> {
  const rows = await db.query<SessionRow>(
    `SELECT id, date, template, plan, note FROM session WHERE status = 'inProgress' ORDER BY date DESC LIMIT 1`,
  );
  const row = rows[0];
  if (!row) return undefined;
  const sets = await setsOf(db, 's.id = ?', [row.id]);
  return {
    id: row.id,
    date: row.date,
    templateId: row.template,
    plan: JSON.parse(row.plan) as SessionPlan,
    sets: sets.map(toSet),
    ...(row.note ? { note: row.note } : {}),
  };
}

/** Finished sessions, oldest first, with their sets and plan. */
export async function listDoneSessions(
  db: SqlDatabase,
): Promise<(SessionLog & { plan: Partial<SessionPlan>; note?: string })[]> {
  const rows = await db.query<SessionRow>(
    `SELECT id, date, template, plan, note FROM session WHERE status = 'done' ORDER BY date, rowid`,
  );
  const sets = await setsOf(db, `s.status = 'done'`, []);
  const bySession = new Map<string, StoredSet[]>();
  for (const set of sets) {
    const list = bySession.get(set.session_id) ?? [];
    list.push(toSet(set));
    bySession.set(set.session_id, list);
  }
  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    templateId: row.template,
    sets: bySession.get(row.id) ?? [],
    plan: JSON.parse(row.plan) as Partial<SessionPlan>,
    ...(row.note ? { note: row.note } : {}),
  }));
}

/**
 * A session done without the app, added afterwards: already finished, with
 * the sets it starts from (the user corrects them next).
 */
export async function addPastSession(
  db: SqlDatabase,
  input: { date: IsoDate; templateId: string; gymId: string; sets: readonly SetLog[] },
): Promise<string> {
  const id = newId();
  const statements = [
    `INSERT INTO session (id, date, template, status, gym_id, plan) VALUES (${q(id)}, ${q(input.date)}, ${q(input.templateId)}, 'done', ${q(input.gymId)}, '{}');`,
    ...input.sets.map(
      (set, index) =>
        `INSERT INTO set_log (id, session_id, exercise_id, position, load_kg, reps, difficulty, warmup) VALUES (${q(newId())}, ${q(id)}, ${q(set.exerciseId)}, ${index + 1}, ${q(set.loadKg)}, ${q(set.reps)}, ${q(set.difficulty)}, ${set.warmup ? 1 : 0});`,
    ),
  ];
  await db.executeScript(statements.join('\n'));
  return id;
}

/** Sessions coming from another app, imported in one transaction (all or nothing). */
export async function importSessions(
  db: SqlDatabase,
  gymId: string,
  sessions: readonly {
    date: IsoDate;
    title: string;
    sets: readonly { exerciseId: string; loadKg: number; reps: number; warmup: boolean }[];
  }[],
): Promise<number> {
  const statements: string[] = [];
  for (const session of sessions) {
    if (session.sets.length === 0) continue;
    const id = newId();
    statements.push(
      `INSERT INTO session (id, date, template, status, gym_id, note, plan) VALUES (${q(id)}, ${q(session.date)}, 'imported', 'done', ${q(gymId)}, ${q(session.title || null)}, '{}');`,
    );
    session.sets.forEach((set, index) => {
      statements.push(
        `INSERT INTO set_log (id, session_id, exercise_id, position, load_kg, reps, difficulty, warmup) VALUES (${q(newId())}, ${q(id)}, ${q(set.exerciseId)}, ${index + 1}, ${q(set.loadKg)}, ${q(set.reps)}, 'ok', ${set.warmup ? 1 : 0});`,
      );
    });
  }
  if (statements.length === 0) return 0;
  await db.executeScript(statements.join('\n'));
  return sessions.filter((s) => s.sets.length > 0).length;
}

/**
 * Sets logged on the wrong machine moved to the right one: the history of
 * each machine stays true, since every set belongs to one exercise.
 */
export async function moveSets(
  db: SqlDatabase,
  setIds: readonly string[],
  toExerciseId: string,
): Promise<void> {
  if (setIds.length === 0) return;
  await db.run(
    `UPDATE set_log SET exercise_id = ? WHERE id IN (${setIds.map(() => '?').join(', ')})`,
    [toExerciseId, ...setIds],
  );
}
