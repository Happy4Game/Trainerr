import { beforeEach, describe, expect, it } from 'vitest';
import { buildCatalog } from '@/data/catalog/catalog';
import { seedCatalog } from '@/data/repositories/catalogRepository';
import { DEFAULT_GYM_ID, ensureDefaultGym } from '@/data/repositories/gymRepository';
import {
  abandonSession,
  addSet,
  deleteSet,
  finishSession,
  getActiveSession,
  listDoneSessions,
  savePlan,
  startSession,
  type SessionPlan,
} from '@/data/repositories/sessionRepository';
import {
  DEFAULT_SETTINGS,
  getSettings,
  saveSettings,
} from '@/data/repositories/settingsRepository';
import { markBusy, startQueue } from '@/domain/busyMachine';
import { migrate } from '@/data/sqlite/migrate';
import { SqlJsDatabase } from '../support/sqlJsDatabase';

let db: SqlJsDatabase;
const plan: SessionPlan = {
  exercises: [
    { exerciseId: 'Dumbbell_Bench_Press', sets: 3 },
    { exerciseId: 'Butterfly', sets: 3 },
  ],
  queue: startQueue(['Dumbbell_Bench_Press', 'Butterfly']),
};

beforeEach(async () => {
  db = await SqlJsDatabase.create();
  await migrate(db);
  await ensureDefaultGym(db, 'Ma salle');
  await seedCatalog(db, buildCatalog(), 'v1');
});

describe('sessions', () => {
  it('resumes a session in progress with its plan and sets', async () => {
    const id = await startSession(db, {
      date: '2026-10-26',
      templateId: 'pushA',
      gymId: DEFAULT_GYM_ID,
      plan,
    });
    await addSet(db, id, {
      exerciseId: 'Dumbbell_Bench_Press',
      loadKg: 8,
      reps: 15,
      difficulty: 'easy',
      warmup: true,
    });
    await addSet(db, id, {
      exerciseId: 'Dumbbell_Bench_Press',
      loadKg: 18,
      reps: 9.5,
      difficulty: 'hard',
    });
    const busy = { ...plan, queue: markBusy(plan.queue, 'Butterfly') };
    await savePlan(db, id, busy);

    const active = await getActiveSession(db);
    expect(active).toMatchObject({ id, templateId: 'pushA', plan: busy });
    expect(active?.sets.map(({ id: _id, ...s }) => s)).toEqual([
      { exerciseId: 'Dumbbell_Bench_Press', loadKg: 8, reps: 15, difficulty: 'easy', warmup: true },
      { exerciseId: 'Dumbbell_Bench_Press', loadKg: 18, reps: 9.5, difficulty: 'hard' },
    ]);
  });

  it('undoes a set', async () => {
    const id = await startSession(db, {
      date: '2026-10-26',
      templateId: 'pushA',
      gymId: DEFAULT_GYM_ID,
      plan,
    });
    const set = await addSet(db, id, {
      exerciseId: 'Butterfly',
      loadKg: 52,
      reps: 12,
      difficulty: 'ok',
    });
    await deleteSet(db, set.id);
    expect((await getActiveSession(db))?.sets).toEqual([]);
  });

  it('lists finished sessions with their sets, oldest first', async () => {
    const first = await startSession(db, {
      date: '2026-10-24',
      templateId: 'legsB',
      gymId: DEFAULT_GYM_ID,
      plan,
    });
    await addSet(db, first, {
      exerciseId: 'Leg_Press',
      loadKg: 107,
      reps: 10,
      difficulty: 'ok',
      completeReps: false,
    });
    await finishSession(db, first, { ...plan, carryOver: ['Butterfly'] });
    const second = await startSession(db, {
      date: '2026-10-26',
      templateId: 'pushA',
      gymId: DEFAULT_GYM_ID,
      plan,
    });
    await finishSession(db, second, plan);

    expect(await getActiveSession(db)).toBeUndefined();
    const done = await listDoneSessions(db);
    expect(done.map((s) => s.templateId)).toEqual(['legsB', 'pushA']);
    expect(done[0]?.sets).toEqual([
      expect.objectContaining({ loadKg: 107, reps: 10, completeReps: false }),
    ]);
    expect(done[0]?.plan.carryOver).toEqual(['Butterfly']);
  });

  it('drops an abandoned session', async () => {
    const id = await startSession(db, {
      date: '2026-10-26',
      templateId: 'pushA',
      gymId: DEFAULT_GYM_ID,
      plan,
    });
    await abandonSession(db, id);
    expect(await getActiveSession(db)).toBeUndefined();
  });
});

describe('settings', () => {
  it('uses the questionnaire defaults until saved', async () => {
    expect(await getSettings(db)).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS).toMatchObject({
      goal: 'hypertrophy',
      sessionsPerWeek: 4,
      sessionMinutes: 60,
      model: 'upperLower',
    });
  });

  it('saves and reads them back', async () => {
    await saveSettings(db, {
      ...DEFAULT_SETTINGS,
      model: 'ppl',
      sessionsPerWeek: 6,
      onboarded: true,
    });
    expect(await getSettings(db)).toMatchObject({
      model: 'ppl',
      sessionsPerWeek: 6,
      onboarded: true,
    });
  });
});
