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
  setSessionNote,
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

  it('keeps a note on the session', async () => {
    const id = await startSession(db, {
      date: '2026-10-26',
      templateId: 'pushA',
      gymId: DEFAULT_GYM_ID,
      plan,
    });
    await setSessionNote(db, id, '  Mal dormi  ');
    expect((await getActiveSession(db))?.note).toBe('Mal dormi');
    await finishSession(db, id, plan);
    expect((await listDoneSessions(db))[0]?.note).toBe('Mal dormi');
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

describe('comeback references', () => {
  it('stores, replaces and deletes the load before the break', async () => {
    const { setReference, listReferences, deleteReference } =
      await import('@/data/repositories/referenceRepository');
    await setReference(db, {
      exerciseId: 'Dumbbell_Bench_Press',
      loadKg: 22,
      reps: 8,
      date: '2026-04-10',
    });
    await setReference(db, { exerciseId: 'Leg_Press', loadKg: 127, reps: 10, date: '2026-04-10' });
    await setReference(db, { exerciseId: 'Leg_Press', loadKg: 130, reps: 8, date: '2026-10-30' });
    expect(await listReferences(db)).toEqual([
      { exerciseId: 'Dumbbell_Bench_Press', loadKg: 22, reps: 8, date: '2026-04-10' },
      { exerciseId: 'Leg_Press', loadKg: 130, reps: 8, date: '2026-10-30' },
    ]);
    await deleteReference(db, 'Leg_Press');
    expect(await listReferences(db)).toHaveLength(1);
  });
});

describe('body measurements', () => {
  it('stores weight and measurements, oldest first, and deletes them', async () => {
    const { addMeasurement, listMeasurements, deleteMeasurement } =
      await import('@/data/repositories/bodyRepository');
    const later = await addMeasurement(db, {
      date: '2026-11-15',
      weightKg: 73,
      measurements: { arm: 34 },
    });
    await addMeasurement(db, { date: '2026-10-15', measurements: { waist: 80 } });
    expect((await listMeasurements(db)).map((m) => m.date)).toEqual(['2026-10-15', '2026-11-15']);
    expect((await listMeasurements(db))[1]).toEqual(later);
    await deleteMeasurement(db, later.id);
    expect(await listMeasurements(db)).toHaveLength(1);
  });
});

describe('badges', () => {
  it('stores each badge once, with the day it was earned', async () => {
    const { addBadges, listBadges } = await import('@/data/repositories/badgeRepository');
    expect(await addBadges(db, ['firstSession'], '2026-10-15')).toEqual(['firstSession']);
    expect(await addBadges(db, ['firstSession', 'firstRecord'], '2026-10-24')).toEqual([
      'firstRecord',
    ]);
    expect(await listBadges(db)).toEqual([
      { code: 'firstSession', earnedOn: '2026-10-15' },
      { code: 'firstRecord', earnedOn: '2026-10-24' },
    ]);
  });
});

describe('import from another app', () => {
  it('creates finished sessions with their sets, in one go', async () => {
    const { importSessions } = await import('@/data/repositories/sessionRepository');
    const count = await importSessions(db, DEFAULT_GYM_ID, [
      {
        date: '2026-10-15',
        title: 'Push A',
        sets: [
          { exerciseId: 'Dumbbell_Bench_Press', loadKg: 8, reps: 15, warmup: true },
          { exerciseId: 'Dumbbell_Bench_Press', loadKg: 16, reps: 12, warmup: false },
        ],
      },
      { date: '2026-10-16', title: 'Vide', sets: [] },
    ]);
    expect(count).toBe(1);
    const done = await listDoneSessions(db);
    expect(done).toHaveLength(1);
    expect(done[0]).toMatchObject({ date: '2026-10-15', templateId: 'imported', note: 'Push A' });
    expect(done[0]?.sets).toEqual([
      expect.objectContaining({ loadKg: 8, reps: 15, warmup: true }),
      expect.objectContaining({ loadKg: 16, reps: 12 }),
    ]);
  });

  it('imports nothing when an exercise is unknown', async () => {
    const { importSessions } = await import('@/data/repositories/sessionRepository');
    await expect(
      importSessions(db, DEFAULT_GYM_ID, [
        {
          date: '2026-10-15',
          title: 'X',
          sets: [{ exerciseId: 'nope', loadKg: 1, reps: 1, warmup: false }],
        },
      ]),
    ).rejects.toThrow();
    expect(await listDoneSessions(db)).toEqual([]);
  });
});
