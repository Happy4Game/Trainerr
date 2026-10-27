import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_GYM_ID, ensureDefaultGym } from '@/data/repositories/gymRepository';
import {
  addCardio,
  cardioMinutesOf,
  deleteCardio,
  listCardio,
  updateCardio,
} from '@/data/repositories/cardioRepository';
import { exportBackup, importBackup } from '@/data/repositories/backupRepository';
import { deleteSession, setSessionDate, startSession } from '@/data/repositories/sessionRepository';
import { startQueue } from '@/domain/busyMachine';
import { migrate } from '@/data/sqlite/migrate';
import { SqlJsDatabase } from '../support/sqlJsDatabase';

let db: SqlJsDatabase;
let sessionId: string;

beforeEach(async () => {
  db = await SqlJsDatabase.create();
  await migrate(db);
  await ensureDefaultGym(db, 'Ma salle');
  sessionId = await startSession(db, {
    date: '2026-10-27',
    templateId: 'legsA',
    gymId: DEFAULT_GYM_ID,
    plan: { exercises: [], queue: startQueue([]) },
  });
});

describe('cardio log', () => {
  it('keeps what the machine showed, and only that', async () => {
    const saved = await addCardio(db, {
      date: '2026-10-27',
      sessionId,
      entry: {
        cardioId: 'treadmill',
        minutes: 20,
        distanceKm: 3.2,
        inclinePct: 6,
        avgHr: 138,
        effort: 'moderate',
        position: 'after',
      },
    });
    expect(saved).toEqual({
      id: saved.id,
      date: '2026-10-27',
      sessionId,
      cardioId: 'treadmill',
      minutes: 20,
      distanceKm: 3.2,
      inclinePct: 6,
      avgHr: 138,
      effort: 'moderate',
      position: 'after',
    });
    expect(await cardioMinutesOf(db, sessionId)).toBe(20);
  });

  it('is corrected, deleted, and logged without a session', async () => {
    const saved = await addCardio(db, {
      date: '2026-10-27',
      sessionId,
      entry: { cardioId: 'bike', minutes: 15, level: 8 },
    });
    await updateCardio(db, saved.id, { cardioId: 'rower', minutes: 12, distanceKm: 2.5 });
    const alone = await addCardio(db, {
      date: '2026-10-28',
      entry: { cardioId: 'outdoorRun', minutes: 30 },
    });
    expect(await listCardio(db)).toEqual([
      {
        id: saved.id,
        date: '2026-10-27',
        sessionId,
        cardioId: 'rower',
        minutes: 12,
        distanceKm: 2.5,
      },
      { id: alone.id, date: '2026-10-28', cardioId: 'outdoorRun', minutes: 30 },
    ]);
    await deleteCardio(db, alone.id);
    expect(await listCardio(db)).toHaveLength(1);
    expect(await cardioMinutesOf(db, 'other')).toBe(0);
  });

  it('follows its session: new date, deletion', async () => {
    await addCardio(db, {
      date: '2026-10-27',
      sessionId,
      entry: { cardioId: 'bike', minutes: 10 },
    });
    await setSessionDate(db, sessionId, '2026-10-25');
    expect((await listCardio(db))[0]?.date).toBe('2026-10-25');
    await deleteSession(db, sessionId);
    expect(await listCardio(db)).toEqual([]);
  });

  it('is part of the backup', async () => {
    await addCardio(db, {
      date: '2026-10-27',
      sessionId,
      entry: { cardioId: 'bike', minutes: 10 },
    });
    const backup = await exportBackup(db);
    expect(backup.tables.cardio_log).toHaveLength(1);
    const other = await SqlJsDatabase.create();
    await migrate(other);
    await importBackup(other, backup);
    expect(await listCardio(other)).toEqual(await listCardio(db));
  });
});
