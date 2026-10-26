import { CORE_MUSCLES, LEG_MUSCLES, MUSCLES, PUSH_MUSCLES, type MuscleId } from '@/domain/muscles';
import type { Equipment, ExerciseKind, PplGroup } from '@/domain/types';
import type { CatalogExercise } from '../catalog/catalog';
import { isAssistedExercise } from '../catalog/curated';
import type { SqlDatabase } from '../sqlite/database';
import { sqlLiteral as q } from '../sqlite/sqlLiteral';
import { parseSetup, type MachineSetup } from './gymRepository';

export interface CatalogEntry {
  readonly exercise: CatalogExercise;
  readonly favorite: boolean;
  readonly loadSteps: readonly number[];
  readonly note?: string;
  readonly platePhoto?: string;
  readonly setup: MachineSetup;
}

const VERSION_KEY = 'catalog_version';

export async function storedCatalogVersion(db: SqlDatabase): Promise<string | undefined> {
  const rows = await db.query<{ value: string }>('SELECT value FROM app_meta WHERE key = ?', [
    VERSION_KEY,
  ]);
  return rows[0]?.value;
}

/**
 * Imports the bundled catalog into the database, in one transaction, when its
 * version changed. Favorites, load steps and notes live in gym_machine and are
 * never touched.
 */
export async function seedCatalog(
  db: SqlDatabase,
  catalog: readonly CatalogExercise[],
  version: string,
): Promise<{ seeded: boolean }> {
  const current = await db.query<{ value: string }>('SELECT value FROM app_meta WHERE key = ?', [
    VERSION_KEY,
  ]);
  if (current[0]?.value === version) return { seeded: false };

  const statements = MUSCLES.map(
    (muscle) =>
      `INSERT INTO muscle (id, name, svg_zone, muscle_group) VALUES (${q(muscle)}, ${q(muscle)}, ${q(muscle)}, ${q(muscleGroup(muscle))}) ON CONFLICT (id) DO NOTHING;`,
  );
  for (const e of catalog) {
    statements.push(`INSERT INTO exercise (id, name, machine_name, aliases, ppl_group, kind, equipment,
        rep_range_min, rep_range_max, name_en, cues, cues_en, cues_source, instructions_en, source)
      VALUES (${[
        e.id,
        e.name,
        e.machineName ?? null,
        JSON.stringify(e.aliases),
        e.group,
        e.kind,
        e.equipment,
        e.repRange?.min ?? null,
        e.repRange?.max ?? null,
        e.nameEn,
        e.cues ? JSON.stringify(e.cues.fr) : null,
        e.cues?.en ? JSON.stringify(e.cues.en) : null,
        e.cues?.source ?? null,
        JSON.stringify(e.instructionsEn),
        e.source,
      ]
        .map(q)
        .join(', ')})
      ON CONFLICT (id) DO UPDATE SET name = excluded.name, machine_name = excluded.machine_name,
        aliases = excluded.aliases, ppl_group = excluded.ppl_group, kind = excluded.kind,
        equipment = excluded.equipment, rep_range_min = excluded.rep_range_min,
        rep_range_max = excluded.rep_range_max, name_en = excluded.name_en, cues = excluded.cues, cues_en = excluded.cues_en,
        cues_source = excluded.cues_source, instructions_en = excluded.instructions_en,
        source = excluded.source;`);
    statements.push(`DELETE FROM exercise_muscle WHERE exercise_id = ${q(e.id)};`);
    const links = [
      ...e.primaryMuscles.map((m) => [m, 'primary'] as const),
      ...e.secondaryMuscles.map((m) => [m, 'secondary'] as const),
    ];
    for (const [muscle, role] of links) {
      statements.push(
        `INSERT INTO exercise_muscle (exercise_id, muscle_id, role) VALUES (${q(e.id)}, ${q(muscle)}, ${q(role)});`,
      );
    }
  }
  statements.push(
    `INSERT INTO app_meta (key, value) VALUES (${q(VERSION_KEY)}, ${q(version)}) ON CONFLICT (key) DO UPDATE SET value = excluded.value;`,
  );
  await db.executeScript(statements.join('\n'));
  return { seeded: true };
}

interface ExerciseRow {
  id: string;
  name: string;
  machine_name: string | null;
  aliases: string;
  ppl_group: PplGroup;
  kind: ExerciseKind;
  equipment: Equipment;
  rep_range_min: number | null;
  rep_range_max: number | null;
  name_en: string;
  cues: string | null;
  cues_en: string | null;
  cues_source: string | null;
  instructions_en: string;
  source: CatalogExercise['source'];
  favorite: number | null;
  load_steps_kg: string | null;
  settings: string | null;
  plate_photo: string | null;
  machine_setup: string | null;
}

/** Every exercise, with this gym's favorite flag, load steps and note. */
export async function listCatalog(db: SqlDatabase, gymId: string): Promise<CatalogEntry[]> {
  const rows = await db.query<ExerciseRow>(
    `SELECT e.*, gm.favorite, gm.load_steps_kg, gm.settings, gm.plate_photo, gm.machine_setup
       FROM exercise e
       LEFT JOIN gym_machine gm ON gm.exercise_id = e.id AND gm.gym_id = ?`,
    [gymId],
  );
  const links = await db.query<{ exercise_id: string; muscle_id: MuscleId; role: string }>(
    'SELECT exercise_id, muscle_id, role FROM exercise_muscle ORDER BY rowid',
  );
  const muscles = new Map<string, { primary: MuscleId[]; secondary: MuscleId[] }>();
  for (const link of links) {
    const entry = muscles.get(link.exercise_id) ?? { primary: [], secondary: [] };
    (link.role === 'primary' ? entry.primary : entry.secondary).push(link.muscle_id);
    muscles.set(link.exercise_id, entry);
  }
  return rows.map((row) => {
    const own = muscles.get(row.id);
    const exercise: CatalogExercise = {
      id: row.id,
      name: row.name,
      nameEn: row.name_en || row.name,
      ...(row.machine_name ? { machineName: row.machine_name } : {}),
      aliases: JSON.parse(row.aliases) as string[],
      kind: row.kind,
      group: row.ppl_group,
      equipment: row.equipment,
      primaryMuscles: own?.primary ?? [],
      secondaryMuscles: own?.secondary ?? [],
      ...(row.rep_range_min !== null && row.rep_range_max !== null
        ? { repRange: { min: row.rep_range_min, max: row.rep_range_max } }
        : {}),
      // Bundled with the app, like the rest of the catalog content.
      ...(isAssistedExercise(row.id) ? { assisted: true } : {}),
      ...(row.cues
        ? {
            cues: {
              fr: JSON.parse(row.cues) as string[],
              ...(row.cues_en ? { en: JSON.parse(row.cues_en) as string[] } : {}),
              source: row.cues_source ?? '',
            },
          }
        : {}),
      instructionsEn: JSON.parse(row.instructions_en) as string[],
      source: row.source,
    };
    return {
      exercise,
      favorite: row.favorite === 1,
      loadSteps: row.load_steps_kg ? (JSON.parse(row.load_steps_kg) as number[]) : [],
      ...(row.settings ? { note: row.settings } : {}),
      ...(row.plate_photo ? { platePhoto: row.plate_photo } : {}),
      setup: parseSetup(row.machine_setup),
    };
  });
}

function muscleGroup(muscle: MuscleId): PplGroup {
  if (LEG_MUSCLES.includes(muscle)) return 'legs';
  if (CORE_MUSCLES.includes(muscle)) return 'core';
  return PUSH_MUSCLES.includes(muscle) ? 'push' : 'pull';
}
