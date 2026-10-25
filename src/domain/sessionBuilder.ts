import { PROTECTED_ZONE_MUSCLES, type MuscleId, type ProtectedZone } from './muscles';
import type { SessionTemplate } from './trainingModels';
import type { Exercise, ExerciseKind } from './types';

export type Goal = 'hypertrophy' | 'maintenance' | 'strength';
export type SessionMinutes = 30 | 45 | 60 | 90;

/** Questionnaire: 3 exercises for 30 min, 4 for 45, 5 for 1 h; 6 for 1 h 30 (to be validated). */
const EXERCISES_PER_SESSION: Readonly<Record<SessionMinutes, number>> = {
  30: 3,
  45: 4,
  60: 5,
  90: 6,
};

export function exercisesPerSession(minutes: SessionMinutes): number {
  return EXERCISES_PER_SESSION[minutes];
}

/**
 * Hypertrophy: 3 sets per exercise lands most muscles in the 10–20 weekly sets
 * zone with 2 sessions a week. Maintenance: about half the volume (to be validated).
 */
export function setsPerExercise(goal: Goal, comebackCap?: number): number {
  const sets = goal === 'maintenance' ? 2 : 3;
  return comebackCap === undefined ? sets : Math.min(sets, comebackCap);
}

const KIND_ORDER: readonly ExerciseKind[] = ['heavyCompound', 'machineCompound', 'isolation'];
const MAX_COMPOUNDS = 4;

/**
 * Picks the exercises of a session among the favorites: compounds first (about
 * 60 %, at most 4), then isolation, each time the one adding the most muscles
 * not yet worked. Variant B starts from the other half of the favorites so that
 * A and B use different machines.
 */
export function buildSession(input: {
  template: SessionTemplate;
  favorites: readonly Exercise[];
  count: number;
  protectedZone?: ProtectedZone;
  /** Machines that complement the user's other sport, shown first. */
  priorityIds?: ReadonlySet<string>;
  /** Muscles already worked by other exercises of the session. */
  alreadyWorked?: readonly MuscleId[];
}): Exercise[] {
  const { template, count, protectedZone, priorityIds } = input;
  const spared = protectedZone ? PROTECTED_ZONE_MUSCLES[protectedZone] : [];
  const eligible = input.favorites
    .filter((e) => template.groups.includes(e.group))
    .filter((e) => e.primaryMuscles.some((m) => template.muscles.includes(m)))
    .filter((e) => !e.primaryMuscles.some((m) => spared.includes(m)))
    .map((e, index) => ({ e, index }))
    .sort((a, b) => priority(b.e, priorityIds) - priority(a.e, priorityIds) || a.index - b.index)
    .map(({ e }) => e);

  const forVariant = (list: Exercise[]) =>
    template.variant === 'B' ? rotate(list, Math.ceil(list.length / 2)) : list;
  const compounds = forVariant(eligible.filter((e) => e.kind !== 'isolation'));
  const isolations = forVariant(eligible.filter((e) => e.kind === 'isolation'));

  const compoundTarget = Math.min(MAX_COMPOUNDS, Math.ceil(count * 0.6), compounds.length);
  const covered = new Set<MuscleId>(input.alreadyWorked);
  const chosen = pickCovering(compounds, compoundTarget, covered);
  chosen.push(...pickCovering(isolations, count - chosen.length, covered));
  if (chosen.length < count) {
    const leftovers = compounds.filter((e) => !chosen.includes(e));
    chosen.push(...pickCovering(leftovers, count - chosen.length, covered));
  }
  return chosen
    .map((e, index) => ({ e, index }))
    .sort(
      (a, b) => KIND_ORDER.indexOf(a.e.kind) - KIND_ORDER.indexOf(b.e.kind) || a.index - b.index,
    )
    .map(({ e }) => e);
}

/**
 * "Pre-session" when the favorites are too few: my machines first, completed
 * with popular machines (given in order of preference) for the muscles not
 * worked yet. The suggested ones are listed apart so the screen can offer to
 * add them to my machines.
 */
export function readyMadeSession(input: {
  template: SessionTemplate;
  favorites: readonly Exercise[];
  popular: readonly Exercise[];
  count: number;
  protectedZone?: ProtectedZone;
}): { exercises: Exercise[]; suggestedIds: string[] } {
  const { template, count, protectedZone } = input;
  const zone = protectedZone ? { protectedZone } : {};
  const mine = buildSession({ template, favorites: input.favorites, count, ...zone });
  if (mine.length >= count) return { exercises: mine, suggestedIds: [] };

  const suggested = buildSession({
    template,
    favorites: input.popular.filter((e) => !mine.some((m) => m.id === e.id)),
    count: count - mine.length,
    alreadyWorked: mine.flatMap((e) => e.primaryMuscles),
    ...zone,
  });
  const exercises = [...mine, ...suggested]
    .map((e, index) => ({ e, index }))
    .sort(
      (a, b) => KIND_ORDER.indexOf(a.e.kind) - KIND_ORDER.indexOf(b.e.kind) || a.index - b.index,
    )
    .map(({ e }) => e);
  return { exercises, suggestedIds: suggested.map((e) => e.id) };
}

function pickCovering(candidates: readonly Exercise[], count: number, covered: Set<MuscleId>) {
  const pool = [...candidates];
  const picked: Exercise[] = [];
  while (picked.length < count && pool.length > 0) {
    let bestIndex = 0;
    let bestGain = -1;
    pool.forEach((e, index) => {
      const gain = e.primaryMuscles.filter((m) => !covered.has(m)).length;
      if (gain > bestGain) {
        bestGain = gain;
        bestIndex = index;
      }
    });
    const [best] = pool.splice(bestIndex, 1) as [Exercise];
    best.primaryMuscles.forEach((m) => covered.add(m));
    picked.push(best);
  }
  return picked;
}

function priority(exercise: Exercise, priorityIds: ReadonlySet<string> | undefined): number {
  return priorityIds?.has(exercise.id) ? 1 : 0;
}

function rotate<T>(list: readonly T[], by: number): T[] {
  return [...list.slice(by), ...list.slice(0, by)];
}
