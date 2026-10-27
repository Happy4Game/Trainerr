import type { OrderRole } from './exerciseOrder';
import type { RepRange } from './types';

/** One exercise of a ready-made session, in its place in the order. */
export interface PresetExercise {
  readonly exerciseId: string;
  /** Same movement on another machine: used instead when it is one of my machines. */
  readonly alternatives?: readonly string[];
  readonly sets: number;
  readonly reps: RepRange;
  /** Reps are seconds held (plank). */
  readonly timed?: true;
  /** Reps counted for each leg (lunges). */
  readonly perSide?: true;
  readonly restSeconds: number;
  readonly role: OrderRole;
  /** Translation key of "why at this place". */
  readonly why: string;
}

export interface PresetSession {
  readonly id: string;
  readonly exercises: readonly PresetExercise[];
}

/** A card of the list: one session, or two for a split (Upper / Lower). */
export interface PresetModel {
  readonly id: string;
  readonly sessions: readonly PresetSession[];
}

/** Template id of a ready-made session in the history: "preset:<id>". */
export const PRESET_PREFIX = 'preset:';

/**
 * Exercise to do for each line: the first of the movement (main machine, then
 * its alternatives) among my machines, else the main one if it exists.
 */
export function resolvePreset(
  session: PresetSession,
  context: { isFavorite: (id: string) => boolean; exists: (id: string) => boolean },
): (PresetExercise & { readonly chosenId: string })[] {
  return session.exercises.flatMap((line) => {
    const options = [line.exerciseId, ...(line.alternatives ?? [])].filter(context.exists);
    const chosenId = options.find(context.isFavorite) ?? options[0];
    return chosenId ? [{ ...line, chosenId }] : [];
  });
}

/** Sets, reps and rest of one exercise of a session written or copied by the user. */
export interface SessionLine {
  readonly sets: number;
  readonly reps: RepRange;
  readonly restSeconds: number;
  readonly timed?: true;
  readonly perSide?: true;
}

/** What a new exercise gets in a session that has its own sets and reps. */
export const DEFAULT_LINE: SessionLine = { sets: 3, reps: { min: 8, max: 12 }, restSeconds: 90 };

/**
 * A ready-made session copied into "my sessions": same exercises in the same
 * order, same sets, reps and rests. The copy is then the user's to change.
 */
export function copyPreset(lines: readonly (PresetExercise & { readonly chosenId: string })[]): {
  exerciseIds: string[];
  lines: Record<string, SessionLine>;
} {
  const exerciseIds: string[] = [];
  const copied: Record<string, SessionLine> = {};
  for (const line of lines) {
    if (exerciseIds.includes(line.chosenId)) continue;
    exerciseIds.push(line.chosenId);
    copied[line.chosenId] = {
      sets: line.sets,
      reps: line.reps,
      restSeconds: line.restSeconds,
      ...(line.timed ? { timed: true } : {}),
      ...(line.perSide ? { perSide: true } : {}),
    };
  }
  return { exerciseIds, lines: copied };
}

/** One step up or down, kept within sensible gym values. */
export function adjustLine(
  line: SessionLine,
  change: 'sets' | 'reps' | 'rest',
  delta: 1 | -1,
): SessionLine {
  switch (change) {
    case 'sets':
      return { ...line, sets: Math.min(10, Math.max(1, line.sets + delta)) };
    case 'reps': {
      const step = line.timed ? 5 * delta : delta;
      const min = Math.max(1, line.reps.min + step);
      return { ...line, reps: { min, max: Math.max(min, line.reps.max + step) } };
    }
    case 'rest':
      return { ...line, restSeconds: Math.min(600, Math.max(15, line.restSeconds + 15 * delta)) };
  }
}
