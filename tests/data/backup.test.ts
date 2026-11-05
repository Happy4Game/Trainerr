import { beforeEach, describe, expect, it } from 'vitest';
import { buildCatalog } from '@/data/catalog/catalog';
import {
  deleteAllUserData,
  exportBackup,
  exportSetsCsv,
  importBackup,
} from '@/data/repositories/backupRepository';
import { listMeasurements, addMeasurement } from '@/data/repositories/bodyRepository';
import { seedCatalog } from '@/data/repositories/catalogRepository';
import {
  DEFAULT_GYM_ID,
  ensureDefaultGym,
  setFavorite,
  setLoadSteps,
} from '@/data/repositories/gymRepository';
import {
  addSet,
  finishSession,
  listDoneSessions,
  startSession,
} from '@/data/repositories/sessionRepository';
import {
  DEFAULT_SETTINGS,
  getSettings,
  saveSettings,
} from '@/data/repositories/settingsRepository';
import { startQueue } from '@/domain/busyMachine';
import { migrate } from '@/data/sqlite/migrate';
import { SqlJsDatabase } from '../support/sqlJsDatabase';

async function freshDb(): Promise<SqlJsDatabase> {
  const db = await SqlJsDatabase.create();
  await migrate(db);
  await ensureDefaultGym(db, 'Ma salle');
  await seedCatalog(db, buildCatalog(), 'v1');
  return db;
}

let db: SqlJsDatabase;
beforeEach(async () => {
  db = await freshDb();
  await setFavorite(db, DEFAULT_GYM_ID, 'Butterfly', true);
  await setLoadSteps(db, DEFAULT_GYM_ID, 'Butterfly', [45, 52, 59]);
  const id = await startSession(db, {
    date: '2026-10-24',
    templateId: 'legsB',
    gymId: DEFAULT_GYM_ID,
    plan: { exercises: [{ exerciseId: 'Leg_Press', sets: 3 }], queue: startQueue(['Leg_Press']) },
  });
  await addSet(db, id, {
    exerciseId: 'Leg_Press',
    loadKg: 107,
    reps: 10,
    difficulty: 'ok',
    doneAt: 1_000_000,
  });
  await addSet(db, id, {
    exerciseId: 'Leg_Press',
    loadKg: 107,
    reps: 9.5,
    difficulty: 'hard',
    completeReps: false,
    doneAt: 1_095_000,
  });
  await finishSession(db, id, { exercises: [], queue: startQueue([]) });
  await addMeasurement(db, { date: '2026-10-24', weightKg: 72.5, measurements: { arm: 33 } });
  await saveSettings(db, { ...DEFAULT_SETTINGS, model: 'ppl', onboarded: true });
});

describe('backup', () => {
  it('an export followed by an import gives back exactly the same data', async () => {
    const backup = await exportBackup(db, new Date('2026-10-24T20:00:00Z'));
    const other = await freshDb();
    await importBackup(other, JSON.parse(JSON.stringify(backup)));
    expect(await exportBackup(other, new Date('2026-10-24T20:00:00Z'))).toEqual(backup);
    expect((await listDoneSessions(other))[0]?.sets).toHaveLength(2);
    expect(await getSettings(other)).toMatchObject({ model: 'ppl', onboarded: true });
  });

  it('replaces the existing data instead of mixing', async () => {
    const backup = await exportBackup(db);
    await importBackup(db, backup);
    expect(await listMeasurements(db)).toHaveLength(1);
  });

  it('refuses a file that is not a Trainerr backup, without touching the data', async () => {
    await expect(importBackup(db, { app: 'other' } as never)).rejects.toThrow(/pas une sauvegarde/);
    const backup = await exportBackup(db);
    const broken = {
      ...backup,
      tables: { ...backup.tables, set_log: [{ id: 'x', session_id: 'missing' }] },
    };
    await expect(importBackup(db, broken)).rejects.toThrow();
    expect(await listMeasurements(db)).toHaveLength(1);
  });

  it('deletes all user data in one tap, catalog kept', async () => {
    await deleteAllUserData(db);
    expect(await listDoneSessions(db)).toEqual([]);
    expect(await listMeasurements(db)).toEqual([]);
    expect(await getSettings(db)).toEqual(DEFAULT_SETTINGS);
    expect(await db.query('SELECT id FROM exercise LIMIT 1')).toHaveLength(1);
  });

  it('exports the sets as CSV, with the rest really taken', async () => {
    // Same day, done later: its first set has no rest, even with a time.
    const id = await startSession(db, {
      date: '2026-10-24',
      templateId: 'pushA',
      gymId: DEFAULT_GYM_ID,
      plan: { exercises: [], queue: startQueue([]) },
    });
    await addSet(db, id, {
      exerciseId: 'Butterfly',
      loadKg: 52,
      reps: 12,
      difficulty: 'ok',
      doneAt: 5_000_000,
    });
    await addSet(db, id, { exerciseId: 'Butterfly', loadKg: 52, reps: 11, difficulty: 'ok' });
    await finishSession(db, id, { exercises: [], queue: startQueue([]) });
    const csv = await exportSetsCsv(db);
    expect(csv.split('\n')).toEqual([
      'date,template,exercise_id,exercise,load_kg,reps,difficulty,warmup,slow_tempo,complete_reps,rir,note,rest_seconds',
      '2026-10-24,legsB,Leg_Press,Presse à cuisses,107,10,ok,0,0,1,,,',
      '2026-10-24,legsB,Leg_Press,Presse à cuisses,107,9.5,hard,0,0,0,,,95',
      '2026-10-24,pushA,Butterfly,Écarté à la machine,52,12,ok,0,0,1,,,',
      '2026-10-24,pushA,Butterfly,Écarté à la machine,52,11,ok,0,0,1,,,',
    ]);
  });
});
