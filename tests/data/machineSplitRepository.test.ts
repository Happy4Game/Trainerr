import { beforeEach, describe, expect, it } from 'vitest';
import { buildCatalog } from '@/data/catalog/catalog';
import { listCatalog, seedCatalog } from '@/data/repositories/catalogRepository';
import {
  DEFAULT_GYM_ID,
  ensureDefaultGym,
  setFavorite,
  setLoadSteps,
} from '@/data/repositories/gymRepository';
import { exercisesWithSets, moveMachineData } from '@/data/repositories/machineSplitRepository';
import { listReferences, setReference } from '@/data/repositories/referenceRepository';
import {
  addSet,
  finishSession,
  listDoneSessions,
  startSession,
  type SessionPlan,
} from '@/data/repositories/sessionRepository';
import { startQueue } from '@/domain/busyMachine';
import { migrate } from '@/data/sqlite/migrate';
import { SqlJsDatabase } from '../support/sqlJsDatabase';

const SEATED = 'trainerr:seated-leg-press';
let db: SqlJsDatabase;

beforeEach(async () => {
  db = await SqlJsDatabase.create();
  await migrate(db);
  await ensureDefaultGym(db, 'Ma salle');
  await seedCatalog(db, buildCatalog(), 'v1');
});

async function legSession(): Promise<string> {
  const plan: SessionPlan = {
    exercises: [{ exerciseId: 'Leg_Press', sets: 3 }],
    queue: startQueue(['Leg_Press']),
  };
  const id = await startSession(db, {
    date: '2026-11-02',
    templateId: 'legs',
    gymId: DEFAULT_GYM_ID,
    plan,
  });
  await addSet(db, id, { exerciseId: 'Leg_Press', loadKg: 120, reps: 10, difficulty: 'ok' });
  await finishSession(db, id, plan);
  return id;
}

describe('machine split', () => {
  it('knows which machines have sets', async () => {
    expect(await exercisesWithSets(db, ['Leg_Press', SEATED])).toEqual(new Set());
    await legSession();
    expect(await exercisesWithSets(db, ['Leg_Press', SEATED])).toEqual(new Set(['Leg_Press']));
  });

  it('moves sets, usual load, gym settings and plans to the machine really used', async () => {
    await legSession();
    await setReference(db, { exerciseId: 'Leg_Press', loadKg: 110, reps: 10, date: '2026-11-01' });
    await setFavorite(db, DEFAULT_GYM_ID, 'Leg_Press', true);
    await setLoadSteps(db, DEFAULT_GYM_ID, 'Leg_Press', [5, 10]);

    await moveMachineData(db, 'Leg_Press', SEATED);

    const [session] = await listDoneSessions(db);
    expect(session?.sets.map((s) => s.exerciseId)).toEqual([SEATED]);
    expect(session?.plan.exercises?.map((e) => e.exerciseId)).toEqual([SEATED]);
    expect((await listReferences(db)).map((r) => r.exerciseId)).toEqual([SEATED]);
    const entries = await listCatalog(db, DEFAULT_GYM_ID);
    const seated = entries.find((e) => e.exercise.id === SEATED);
    const sled = entries.find((e) => e.exercise.id === 'Leg_Press');
    expect(seated).toMatchObject({ favorite: true, loadSteps: [5, 10] });
    expect(sled?.favorite).toBe(false);
  });

  it('keeps the usual load the new machine already had', async () => {
    await setReference(db, { exerciseId: 'Leg_Press', loadKg: 110, reps: 10, date: '2026-11-01' });
    await setReference(db, { exerciseId: SEATED, loadKg: 70, reps: 12, date: '2026-11-03' });
    await moveMachineData(db, 'Leg_Press', SEATED);
    expect(await listReferences(db)).toEqual([
      { exerciseId: SEATED, loadKg: 70, reps: 12, date: '2026-11-03' },
    ]);
  });
});
