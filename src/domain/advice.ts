import type { MuscleId } from './muscles';
import type { Exercise } from './types';

/**
 * Pre-written rules triggered by what the user enters. Not a diagnosis: the
 * app never replaces a doctor or a physio, and says so.
 */
export type DiscomfortZone =
  'frontShoulder' | 'shoulder' | 'elbow' | 'wrist' | 'lowerBack' | 'knee' | 'hip' | 'other';

export type RedFlag =
  | 'sharpPain'
  | 'jointPain'
  | 'painAtRest'
  | 'tingling'
  /** Chest pain with breathlessness: call 15 (SAMU, France). */
  | 'chestPainBreathless';

export type AdviceCode =
  | 'heatAndRest'
  | 'warningSigns'
  | 'seePhysioIfPersists'
  | 'stopAndConsult'
  | 'callEmergency'
  | 'sorenessVsPain';

export interface DiscomfortResponse {
  readonly stopSession: boolean;
  readonly emergency: boolean;
  readonly removeExerciseIds: readonly string[];
  readonly advice: readonly AdviceCode[];
  /** Set when the same discomfort came back during the week. */
  readonly shoulderExercisesPerPush?: number;
}

const ZONE_MUSCLES: Readonly<Record<DiscomfortZone, readonly MuscleId[]>> = {
  frontShoulder: ['frontDelts', 'chest'],
  shoulder: ['frontDelts', 'sideDelts', 'rearDelts'],
  elbow: ['biceps', 'triceps', 'forearms'],
  wrist: ['forearms'],
  lowerBack: ['lowerBack'],
  knee: ['quads', 'hamstrings'],
  hip: ['glutes', 'adductors', 'abductors'],
  other: [],
};

export function handleDiscomfort(input: {
  zone: DiscomfortZone;
  redFlags: readonly RedFlag[];
  remaining: readonly Exercise[];
  /** Sessions this week with the same discomfort, this one included. */
  reportsThisWeek: number;
}): DiscomfortResponse {
  const { zone, redFlags, remaining, reportsThisWeek } = input;

  if (redFlags.length > 0) {
    const emergency = redFlags.includes('chestPainBreathless');
    return {
      stopSession: true,
      emergency,
      removeExerciseIds: remaining.map((e) => e.id),
      advice: [emergency ? 'callEmergency' : 'stopAndConsult'],
    };
  }

  // Front of the shoulder: every remaining push exercise goes.
  const affected =
    zone === 'frontShoulder'
      ? remaining.filter((e) => e.group === 'push')
      : remaining.filter((e) =>
          [...e.primaryMuscles, ...e.secondaryMuscles].some((m) => ZONE_MUSCLES[zone].includes(m)),
        );
  const recurring = reportsThisWeek >= 2;
  const shoulderZone = zone === 'frontShoulder' || zone === 'shoulder';
  return {
    stopSession: false,
    emergency: false,
    removeExerciseIds: affected.map((e) => e.id),
    advice: [
      'heatAndRest',
      'warningSigns',
      ...(recurring ? (['seePhysioIfPersists'] as const) : []),
    ],
    ...(recurring && shoulderZone ? { shoulderExercisesPerPush: 1 } : {}),
  };
}

/** Soreness is expected: explain the difference with pain and keep the plan. */
export function handleSoreness(): { keepPlan: true; advice: readonly AdviceCode[] } {
  return { keepPlan: true, advice: ['sorenessVsPain'] };
}
