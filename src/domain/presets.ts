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
