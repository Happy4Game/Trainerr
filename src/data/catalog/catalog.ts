import { CORE_MUSCLES, LEG_MUSCLES, PUSH_MUSCLES, type MuscleId } from '@/domain/muscles';
import type { Equipment, Exercise, ExerciseKind, PplGroup } from '@/domain/types';
import { CURATED, CUSTOM_EXERCISES, type CuratedOverride } from './curated';
import source from './free-exercise-db.json';

export interface CatalogExercise extends Exercise {
  /** French name when available, English otherwise. */
  readonly name: string;
  readonly nameEn: string;
  /** Name printed on the machine (e.g. "Seated Row"). */
  readonly machineName?: string;
  readonly aliases: readonly string[];
  readonly cues?: { readonly fr: readonly string[]; readonly source: string };
  readonly instructionsEn: readonly string[];
  readonly source: 'free-exercise-db' | 'trainerr' | 'user';
}

/** Record of free-exercise-db (https://github.com/yuhonas/free-exercise-db). */
export interface FreeExercise {
  readonly id: string;
  readonly name: string;
  readonly force: string | null;
  readonly mechanic: string | null;
  readonly equipment: string | null;
  readonly primaryMuscles: readonly string[];
  readonly secondaryMuscles: readonly string[];
  readonly instructions: readonly string[];
}

const SOURCE_MUSCLES: Readonly<Record<string, MuscleId>> = {
  quadriceps: 'quads',
  hamstrings: 'hamstrings',
  glutes: 'glutes',
  calves: 'calves',
  adductors: 'adductors',
  abductors: 'abductors',
  abdominals: 'abs',
  'lower back': 'lowerBack',
  chest: 'chest',
  triceps: 'triceps',
  biceps: 'biceps',
  forearms: 'forearms',
  lats: 'lats',
  'middle back': 'upperBack',
  traps: 'traps',
};

const SOURCE_EQUIPMENT: Readonly<Record<string, Equipment>> = {
  machine: 'machine',
  cable: 'cable',
  dumbbell: 'dumbbell',
  barbell: 'barbell',
  'e-z curl bar': 'barbell',
  'body only': 'bodyweight',
};

/** The source has a single "shoulders" muscle: the exercise name tells which delts work. */
function deltsFor(raw: FreeExercise): MuscleId {
  const name = raw.name.toLowerCase();
  if (/rear|reverse fl|face pull|bent[ -]over/.test(name)) return 'rearDelts';
  if (/lateral|side raise|upright/.test(name)) return 'sideDelts';
  return raw.force === 'pull' ? 'rearDelts' : 'frontDelts';
}

function mapMuscles(raw: FreeExercise, muscles: readonly string[]): MuscleId[] {
  const mapped = muscles.map((m) => (m === 'shoulders' ? deltsFor(raw) : SOURCE_MUSCLES[m]));
  return [...new Set(mapped.filter((m): m is MuscleId => m !== undefined))];
}

/** The group comes from the main muscle: the source "force" field is sometimes wrong. */
function groupFor(primary: MuscleId): PplGroup {
  if (LEG_MUSCLES.includes(primary)) return 'legs';
  if (CORE_MUSCLES.includes(primary)) return 'core';
  return PUSH_MUSCLES.includes(primary) ? 'push' : 'pull';
}

function kindFor(raw: FreeExercise, equipment: Equipment, primaryCount: number): ExerciseKind {
  const mechanic = raw.mechanic ?? (primaryCount > 1 ? 'compound' : 'isolation');
  if (mechanic === 'isolation') return 'isolation';
  return equipment === 'barbell' || equipment === 'dumbbell' ? 'heavyCompound' : 'machineCompound';
}

export function mapFreeExercise(raw: FreeExercise): CatalogExercise | undefined {
  const curated: CuratedOverride | undefined = CURATED[raw.id];
  const equipment = curated?.equipment ?? SOURCE_EQUIPMENT[raw.equipment ?? ''];
  const primaryMuscles = curated?.primaryMuscles ?? mapMuscles(raw, raw.primaryMuscles);
  const main = primaryMuscles[0];
  if (!equipment || !main) return undefined;
  const secondaryMuscles = (
    curated?.secondaryMuscles ?? mapMuscles(raw, raw.secondaryMuscles)
  ).filter((m) => !primaryMuscles.includes(m));
  return {
    id: raw.id,
    name: curated?.nameFr ?? raw.name,
    nameEn: raw.name,
    ...(curated?.machineName ? { machineName: curated.machineName } : {}),
    aliases: curated?.aliases ?? [],
    kind: curated?.kind ?? kindFor(raw, equipment, primaryMuscles.length),
    group: curated?.group ?? groupFor(main),
    equipment,
    primaryMuscles,
    secondaryMuscles,
    ...(curated?.repRange ? { repRange: curated.repRange } : {}),
    ...(curated ? { cues: { fr: curated.cues, source: curated.cuesSource } } : {}),
    instructionsEn: raw.instructions,
    source: 'free-exercise-db',
  };
}

export function buildCatalog(): CatalogExercise[] {
  const fromSource = (source.exercises as FreeExercise[]).flatMap((raw) => {
    const mapped = mapFreeExercise(raw);
    return mapped ? [mapped] : [];
  });
  const custom = Object.entries(CUSTOM_EXERCISES).map(([id, e]): CatalogExercise => ({
    id,
    name: e.nameFr,
    nameEn: e.nameEn,
    ...(e.machineName ? { machineName: e.machineName } : {}),
    aliases: e.aliases ?? [],
    kind: e.kind,
    group: e.group,
    equipment: e.equipment,
    primaryMuscles: e.primaryMuscles,
    secondaryMuscles: e.secondaryMuscles,
    ...(e.repRange ? { repRange: e.repRange } : {}),
    cues: { fr: e.cues, source: e.cuesSource },
    instructionsEn: [],
    source: 'trainerr',
  }));
  return [...fromSource, ...custom];
}
