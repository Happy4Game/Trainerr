import { describe, expect, it } from 'vitest';
import { buildCatalog, mapFreeExercise, type CatalogExercise } from '@/data/catalog/catalog';
import { CURATED, CUSTOM_EXERCISES } from '@/data/catalog/curated';
import source from '@/data/catalog/free-exercise-db.json';
import { SOURCE_COMMIT } from '@/data/catalog/version';
import { MUSCLES } from '@/domain/muscles';

const catalog = buildCatalog();
const byId = new Map(catalog.map((e) => [e.id, e]));
const get = (id: string) => byId.get(id) as CatalogExercise;

describe('catalog built from free-exercise-db', () => {
  it('keeps the strength exercises with gym equipment, plus the custom machines', () => {
    expect(catalog.length).toBeGreaterThan(450);
    for (const id of Object.keys(CUSTOM_EXERCISES)) expect(byId.has(id)).toBe(true);
    expect(new Set(catalog.map((e) => e.id)).size).toBe(catalog.length);
  });

  it('records the commit of the bundled source', () => {
    expect(source.commit).toBe(SOURCE_COMMIT);
  });

  it('every curated id exists in the source (no silent typo)', () => {
    const sourceIds = new Set(source.exercises.map((e) => e.id));
    for (const id of Object.keys(CURATED)) expect(sourceIds, id).toContain(id);
  });

  it('maps every exercise to known muscles, with at least one primary muscle', () => {
    for (const e of catalog) {
      expect(e.primaryMuscles.length, e.id).toBeGreaterThan(0);
      for (const m of [...e.primaryMuscles, ...e.secondaryMuscles]) expect(MUSCLES).toContain(m);
    }
  });

  it('applies the French names, machine names and aliases', () => {
    expect(get('Butterfly')).toMatchObject({
      name: 'Écarté à la machine',
      nameEn: 'Butterfly',
      machineName: 'Pec Fly',
      aliases: expect.arrayContaining(['pec deck']),
    });
    expect(get('Triceps_Pushdown').aliases).toContain('poulie haute');
  });

  it('every curated card has as many cues in English as in French', () => {
    for (const e of catalog.filter((c) => c.cues)) {
      expect(e.cues?.en?.length, e.id).toBe(e.cues?.fr.length);
    }
  });

  it('gives every exercise a French name, translated by hand', () => {
    for (const e of catalog) expect(e.name, e.id).not.toBe('');
    expect(get('Cable_Crunch')).toMatchObject({
      name: 'Crunch à la poulie',
      nameEn: 'Cable Crunch',
    });
    expect(get('Romanian_Deadlift').name).toBe('Soulevé de terre roumain');
  });

  it('falls back to the English name when there is no translation', () => {
    expect(
      mapFreeExercise({
        id: 'New_Exercise',
        name: 'New Exercise',
        force: 'push',
        mechanic: 'isolation',
        equipment: 'machine',
        primaryMuscles: ['chest'],
        secondaryMuscles: [],
        instructions: [],
      })?.name,
    ).toBe('New Exercise');
  });

  it('derives the push / pull / legs group from the muscles, not the source "force"', () => {
    expect(get('Butterfly').group).toBe('push'); // "pull" in the source
    expect(get('Side_Lateral_Raise').group).toBe('push');
    expect(get('Reverse_Machine_Flyes').group).toBe('pull');
    expect(get('Leg_Press').group).toBe('legs');
    expect(get('Cable_Crunch').group).toBe('core');
  });

  it('splits "shoulders" into front, side and rear delts', () => {
    expect(get('Side_Lateral_Raise').primaryMuscles).toEqual(['sideDelts']);
    expect(get('Reverse_Machine_Flyes').primaryMuscles).toEqual(['rearDelts']);
    expect(get('Machine_Shoulder_Military_Press').primaryMuscles).toEqual(['frontDelts']);
    expect(get('Wide-Grip_Lat_Pulldown').secondaryMuscles).toEqual([
      'biceps',
      'upperBack',
      'rearDelts',
    ]);
  });

  it('sets the exercise kind', () => {
    expect(get('Dumbbell_Bench_Press').kind).toBe('heavyCompound');
    expect(get('Wide-Grip_Lat_Pulldown').kind).toBe('heavyCompound');
    expect(get('Seated_Cable_Rows').kind).toBe('machineCompound');
    expect(get('Butterfly').kind).toBe('isolation');
  });

  it('keeps the rep range of the real sessions for the leg extension', () => {
    expect(get('Leg_Extensions').repRange).toEqual({ min: 8, max: 10 });
  });

  it('carries the technique cues and their source', () => {
    expect(get('Wide-Grip_Lat_Pulldown').cues).toEqual({
      fr: expect.arrayContaining(['Épaules basses, loin des oreilles']),
      en: expect.arrayContaining(['Shoulders down, away from the ears']),
      source: expect.stringContaining('octobre 2026'),
    });
    expect(get('Cable_Crunch').cues).toBeUndefined();
    expect(get('Cable_Crunch').instructionsEn.length).toBeGreaterThan(0);
  });

  it('drops exercises without a usable muscle', () => {
    expect(
      mapFreeExercise({
        id: 'Neck_Only',
        name: 'Neck only',
        force: 'push',
        mechanic: 'isolation',
        equipment: 'machine',
        primaryMuscles: ['neck'],
        secondaryMuscles: [],
        instructions: [],
      }),
    ).toBeUndefined();
  });
});

describe('exercise illustrations', () => {
  it('only uses licensed images from trusted authors, with a file on disk', async () => {
    const { existsSync } = await import('node:fs');
    const { allIllustrations } = await import('@/data/catalog/exerciseImages');
    const illustrations = Object.entries(allIllustrations());
    expect(illustrations.length).toBeGreaterThan(200);
    for (const [id, illustration] of illustrations) {
      expect(byId.has(id), id).toBe(true);
      for (const image of illustration.images) {
        expect(['Everkinetic', 'wger.de']).toContain(image.author);
        expect(['Everkinetic', 'wger.de']).toContain(illustration.source);
        expect(image.license).toMatch(/^CC (BY|BY-SA) \d\.\d$|^CC0 1\.0$/);
        expect(existsSync(`public/exercise-images/${image.file}`), image.file).toBe(true);
      }
    }
  });
});
