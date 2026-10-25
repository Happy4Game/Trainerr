import { beforeEach, describe, expect, it } from 'vitest';
import { buildCatalog, type CatalogExercise } from '@/data/catalog/catalog';
import { listCatalog, seedCatalog } from '@/data/repositories/catalogRepository';
import {
  DEFAULT_GYM_ID,
  ensureDefaultGym,
  getMachine,
  setFavorite,
  setLoadSteps,
  setMachineNote,
} from '@/data/repositories/gymRepository';
import { migrate } from '@/data/sqlite/migrate';
import { SqlJsDatabase } from '../support/sqlJsDatabase';

const catalog = buildCatalog();
let db: SqlJsDatabase;

beforeEach(async () => {
  db = await SqlJsDatabase.create();
  await migrate(db);
  await ensureDefaultGym(db, 'Ma salle');
});

describe('catalog seeding', () => {
  it('imports every exercise with its muscles', async () => {
    expect(await seedCatalog(db, catalog, 'v1')).toEqual({ seeded: true });
    const entries = await listCatalog(db, DEFAULT_GYM_ID);
    expect(entries).toHaveLength(catalog.length);
    const pecFly = entries.find((e) => e.exercise.id === 'Butterfly');
    expect(pecFly?.exercise).toMatchObject({
      name: 'Écarté à la machine',
      nameEn: 'Butterfly',
      machineName: 'Pec Fly',
      kind: 'isolation',
      group: 'push',
      primaryMuscles: ['chest'],
      secondaryMuscles: ['frontDelts'],
    });
    expect(pecFly).toMatchObject({ favorite: false, loadSteps: [] });
  });

  it('keeps the rep range override and the cues', async () => {
    await seedCatalog(db, catalog, 'v1');
    const entries = await listCatalog(db, DEFAULT_GYM_ID);
    const legExtension = entries.find((e) => e.exercise.id === 'Leg_Extensions')?.exercise;
    expect(legExtension?.repRange).toEqual({ min: 8, max: 10 });
    expect(legExtension?.cues?.fr).toHaveLength(3);
    expect(legExtension?.cues?.en?.[0]).toMatch(/Pad just above the ankles/);
  });

  it('skips the import when the catalog version did not change', async () => {
    await seedCatalog(db, catalog, 'v1');
    expect(await seedCatalog(db, catalog, 'v1')).toEqual({ seeded: false });
  });

  it('updates the catalog without touching favorites and machine settings', async () => {
    await seedCatalog(db, catalog, 'v1');
    await setFavorite(db, DEFAULT_GYM_ID, 'Butterfly', true);
    await setLoadSteps(db, DEFAULT_GYM_ID, 'Butterfly', [45, 52, 59]);

    const renamed: CatalogExercise[] = catalog.map((e) =>
      e.id === 'Butterfly' ? { ...e, name: 'Pec deck' } : e,
    );
    expect(await seedCatalog(db, renamed, 'v2')).toEqual({ seeded: true });

    const pecFly = (await listCatalog(db, DEFAULT_GYM_ID)).find(
      (e) => e.exercise.id === 'Butterfly',
    );
    expect(pecFly).toMatchObject({
      exercise: { name: 'Pec deck' },
      favorite: true,
      loadSteps: [45, 52, 59],
    });
  });
});

describe('gym machines', () => {
  beforeEach(async () => {
    await seedCatalog(db, catalog, 'v1');
  });

  it('creates the default gym only once', async () => {
    await ensureDefaultGym(db, 'Autre nom');
    expect(await db.query('SELECT * FROM gym')).toEqual([{ id: DEFAULT_GYM_ID, name: 'Ma salle' }]);
  });

  it('stars and unstars a machine', async () => {
    await setFavorite(db, DEFAULT_GYM_ID, 'Leg_Press', true);
    expect(await getMachine(db, DEFAULT_GYM_ID, 'Leg_Press')).toMatchObject({ favorite: true });
    await setFavorite(db, DEFAULT_GYM_ID, 'Leg_Press', false);
    expect(await getMachine(db, DEFAULT_GYM_ID, 'Leg_Press')).toMatchObject({ favorite: false });
  });

  it('stores the load steps sorted, without duplicates', async () => {
    await setLoadSteps(db, DEFAULT_GYM_ID, 'Leg_Press', [110, 107, 107, 90]);
    expect(await getMachine(db, DEFAULT_GYM_ID, 'Leg_Press')).toMatchObject({
      loadSteps: [90, 107, 110],
    });
  });

  it('keeps the machine note (seat height…)', async () => {
    await setMachineNote(db, DEFAULT_GYM_ID, 'Leg_Press', 'Dossier cran 3');
    await setFavorite(db, DEFAULT_GYM_ID, 'Leg_Press', true);
    expect(await getMachine(db, DEFAULT_GYM_ID, 'Leg_Press')).toEqual({
      favorite: true,
      loadSteps: [],
      note: 'Dossier cran 3',
    });
  });

  it('returns an empty machine for an exercise never set up', async () => {
    expect(await getMachine(db, DEFAULT_GYM_ID, 'Plank')).toEqual({
      favorite: false,
      loadSteps: [],
    });
  });

  it('stores text with quotes safely', async () => {
    await setMachineNote(db, DEFAULT_GYM_ID, 'Plank', "l'appui « coudes »; DROP TABLE gym;");
    expect((await getMachine(db, DEFAULT_GYM_ID, 'Plank')).note).toBe(
      "l'appui « coudes »; DROP TABLE gym;",
    );
  });
});

describe('machine plate photo', () => {
  it('is stored with the machine and can be removed', async () => {
    const { setPlatePhoto } = await import('@/data/repositories/gymRepository');
    await seedCatalog(db, catalog, 'v1');
    await setPlatePhoto(db, DEFAULT_GYM_ID, 'Butterfly', 'data:image/jpeg;base64,AAAA');
    const find = async () =>
      (await listCatalog(db, DEFAULT_GYM_ID)).find((e) => e.exercise.id === 'Butterfly');
    expect((await find())?.platePhoto).toBe('data:image/jpeg;base64,AAAA');
    await setPlatePhoto(db, DEFAULT_GYM_ID, 'Butterfly', null);
    expect((await find())?.platePhoto).toBeUndefined();
  });
});

describe('several gyms', () => {
  it('keeps favorites and steps per gym', async () => {
    const { addGym, listGyms, renameGym } = await import('@/data/repositories/gymRepository');
    await seedCatalog(db, catalog, 'v1');
    await addGym(db, 'holiday', 'Salle en vacances');
    await renameGym(db, 'default', 'Basic-Fit');
    expect(await listGyms(db)).toEqual([
      { id: DEFAULT_GYM_ID, name: 'Basic-Fit' },
      { id: 'holiday', name: 'Salle en vacances' },
    ]);
    await setFavorite(db, DEFAULT_GYM_ID, 'Butterfly', true);
    await setLoadSteps(db, 'holiday', 'Butterfly', [40, 50]);
    const at = async (gym: string) =>
      (await listCatalog(db, gym)).find((e) => e.exercise.id === 'Butterfly');
    expect(await at(DEFAULT_GYM_ID)).toMatchObject({ favorite: true, loadSteps: [] });
    expect(await at('holiday')).toMatchObject({ favorite: false, loadSteps: [40, 50] });
  });
});
