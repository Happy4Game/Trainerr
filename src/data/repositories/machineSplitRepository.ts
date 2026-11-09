import type { SqlDatabase } from '../sqlite/database';
import { sqlLiteral as q } from '../sqlite/sqlLiteral';

/** Machines with at least one set logged, among these ones. */
export async function exercisesWithSets(
  db: SqlDatabase,
  exerciseIds: readonly string[],
): Promise<Set<string>> {
  if (exerciseIds.length === 0) return new Set();
  const rows = await db.query<{ exercise_id: string }>(
    `SELECT DISTINCT exercise_id FROM set_log WHERE exercise_id IN (${exerciseIds.map(() => '?').join(', ')})`,
    exerciseIds,
  );
  return new Set(rows.map((r) => r.exercise_id));
}

/**
 * Everything the user wrote about a machine moves to another one, in one go:
 * sets, usual load, the gym's steps, setup and favorite, and the sessions'
 * plans. What the other machine already had is kept (UPDATE OR IGNORE), the
 * rest of the old machine's data is dropped: it was about the other machine.
 */
export async function moveMachineData(
  db: SqlDatabase,
  fromId: string,
  toId: string,
): Promise<void> {
  if (fromId === toId) return;
  const from = q(fromId);
  const to = q(toId);
  // Ids are JSON strings inside the plan: quoted, so "Leg_Press" never matches a longer id.
  const fromJson = q(JSON.stringify(fromId));
  const toJson = q(JSON.stringify(toId));
  await db.executeScript(`
    UPDATE set_log SET exercise_id = ${to} WHERE exercise_id = ${from};
    UPDATE OR IGNORE reference_load SET exercise_id = ${to} WHERE exercise_id = ${from};
    DELETE FROM reference_load WHERE exercise_id = ${from};
    UPDATE OR IGNORE gym_machine SET exercise_id = ${to} WHERE exercise_id = ${from};
    DELETE FROM gym_machine WHERE exercise_id = ${from};
    UPDATE session SET plan = REPLACE(plan, ${fromJson}, ${toJson}) WHERE INSTR(plan, ${fromJson}) > 0;
  `);
}
