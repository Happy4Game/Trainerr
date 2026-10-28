import type { MuscleId } from './muscles';

/** Calendar date, `YYYY-MM-DD`, in the user's local calendar. */
export type IsoDate = string;

export type Difficulty = 'easy' | 'ok' | 'hard' | 'fail';
export type ExerciseKind = 'heavyCompound' | 'machineCompound' | 'isolation';
export type PplGroup = 'push' | 'pull' | 'legs' | 'core';
export type Equipment = 'machine' | 'cable' | 'dumbbell' | 'barbell' | 'bodyweight';

export interface RepRange {
  readonly min: number;
  readonly max: number;
}

export interface Exercise {
  readonly id: string;
  readonly kind: ExerciseKind;
  readonly group: PplGroup;
  readonly equipment: Equipment;
  readonly primaryMuscles: readonly MuscleId[];
  readonly secondaryMuscles: readonly MuscleId[];
  /** Overrides the default range of the exercise kind. */
  readonly repRange?: RepRange;
  /**
   * Assisted machine (pull-ups, dips): the load logged is the assistance,
   * the real load is body weight − assistance (see assisted.ts).
   */
  readonly assisted?: boolean;
}

export interface SetLog {
  readonly exerciseId: string;
  readonly loadKg: number;
  /** Half reps allowed (8.5). */
  readonly reps: number;
  readonly difficulty: Difficulty;
  readonly warmup?: boolean;
  readonly slowTempo?: boolean;
  /** False when at least one rep did not reach full range of motion. */
  readonly completeReps?: boolean;
  /** Reps in reserve, optional: 0 = nothing left, 4 = four or more. */
  readonly rir?: number;
  /** Free text for this set: "grip slipped", "seat 4"… */
  readonly note?: string;
  /** When it was logged during the session (ms since 1970); absent for a set added afterwards. */
  readonly doneAt?: number;
}

export interface SessionLog {
  readonly id: string;
  readonly date: IsoDate;
  readonly templateId: string;
  readonly sets: readonly SetLog[];
}
