import type { ExerciseQueue } from '@/domain/busyMachine';
import type { Difficulty, IsoDate, SessionLog, SetLog } from '@/domain/types';
import type { SqlDatabase } from '../sqlite/database';

export interface PlannedExercise {
  readonly exerciseId: string;
  readonly sets: number;
}

/** What is needed to resume a session after the app was closed. */
export interface SessionPlan {
  readonly exercises: readonly PlannedExercise[];
  readonly queue: ExerciseQueue;
  /** Machines still taken at the end, moved to the next session of the same type. */
  readonly carryOver?: readonly string[];
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
}

export function newId(): string {
  // crypto.randomUUID only exists in secure contexts; the dev server on the
  // local network is plain http.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function startSession(
  db: SqlDatabase,
  input: { date: IsoDate; templateId: string; gymId: string; plan: SessionPlan },
): Promise<string> {
  const id = newId();
  await db.run(
    `INSERT INTO session (id, date, template, status, gym_id, plan) VALUES (?, ?, ?, 'inProgress', ?, ?)`,
    [id, input.date, input.templateId, input.gymId, JSON.stringify(input.plan)],
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
       warmup, slow_tempo, complete_reps)
     VALUES (?, ?, ?, (SELECT COUNT(*) + 1 FROM set_log WHERE session_id = ?), ?, ?, ?, ?, ?, ?)`,
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
    ],
  );
  return { ...set, id };
}

export async function deleteSet(db: SqlDatabase, setId: string): Promise<void> {
  await db.run('DELETE FROM set_log WHERE id = ?', [setId]);
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
    `SELECT id, date, template, plan FROM session WHERE status = 'inProgress' ORDER BY date DESC LIMIT 1`,
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
  };
}

/** Finished sessions, oldest first, with their sets and plan. */
export async function listDoneSessions(
  db: SqlDatabase,
): Promise<(SessionLog & { plan: Partial<SessionPlan> })[]> {
  const rows = await db.query<SessionRow>(
    `SELECT id, date, template, plan FROM session WHERE status = 'done' ORDER BY date, rowid`,
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
  }));
}
