import { floorStep, isMissingStepJump, stepDown, stepUp, type LoadSteps } from './loadSteps';
import type { Exercise, ExerciseKind, RepRange, SetLog } from './types';

export const DEFAULT_REP_RANGES: Readonly<Record<ExerciseKind, RepRange>> = {
  heavyCompound: { min: 8, max: 10 },
  machineCompound: { min: 10, max: 12 },
  isolation: { min: 12, max: 15 },
};

export const REST_SECONDS: Readonly<Record<ExerciseKind, { min: number; max: number }>> = {
  heavyCompound: { min: 90, max: 120 },
  machineCompound: { min: 90, max: 90 },
  isolation: { min: 60, max: 90 },
};

/** When the next step is missing, the range is stretched by this many reps before jumping. */
export const MISSING_STEP_EXTRA_REPS = 3;

export function repRangeFor(exercise: Exercise): RepRange {
  return exercise.repRange ?? DEFAULT_REP_RANGES[exercise.kind];
}

export type Reminder = 'rangeOfMotion' | 'technique';

export type SetProposalReason =
  | 'aboveRange'
  | 'easy'
  | 'inRange'
  | 'hard'
  | 'belowRange'
  | 'failure'
  | 'incompleteReps'
  | 'missingStep'
  | 'noHeavierStep';

export interface SetProposal {
  readonly action: 'increase' | 'keep' | 'decrease' | 'stop';
  readonly loadKg: number;
  readonly targetReps: number;
  readonly reason: SetProposalReason;
  readonly reminders: readonly Reminder[];
}

/** Rules between two sets of the same exercise, within a session. */
export function nextSetProposal(input: {
  set: SetLog;
  range: RepRange;
  steps: LoadSteps;
  isLastSet: boolean;
}): SetProposal {
  const { set, range, steps, isLastSet } = input;
  const current = floorStep(steps, set.loadKg);

  const goDown = (reason: SetProposalReason, reminders: readonly Reminder[] = []): SetProposal => {
    const lower = stepDown(steps, current);
    if (lower === undefined || isLastSet) {
      return { action: 'stop', loadKg: lower ?? current, targetReps: range.max, reason, reminders };
    }
    return { action: 'decrease', loadKg: lower, targetReps: range.max, reason, reminders };
  };
  const keep = (reason: SetProposalReason, targetReps = range.max): SetProposal => ({
    action: 'keep',
    loadKg: current,
    targetReps,
    reason,
    reminders: [],
  });

  // Rule 4: a rep without full range of motion does not count.
  if (set.completeReps === false) return goDown('incompleteReps', ['rangeOfMotion']);
  if (set.difficulty === 'fail') return goDown('failure');
  if (set.reps < range.min) return goDown('belowRange');
  // Never heavier after a Limite set.
  if (set.difficulty === 'hard') return keep(set.reps > range.max ? 'hard' : 'inRange');

  const easy = set.difficulty === 'easy';
  if (!easy && set.reps <= range.max) return keep('inRange');

  const higher = stepUp(steps, current);
  if (higher === undefined) return keep('noHeavierStep');
  const stretchedMax = range.max + MISSING_STEP_EXTRA_REPS;
  if (!easy && isMissingStepJump(current, higher) && set.reps < stretchedMax) {
    return keep('missingStep', stretchedMax);
  }
  return {
    action: 'increase',
    loadKg: higher,
    targetReps: range.min,
    reason: easy ? 'easy' : 'aboveRange',
    reminders: [],
  };
}

export type SessionProposalReason =
  'allSetsAtTop' | 'raisedAndHeld' | 'keep' | 'repeatedFailure' | 'missingStep' | 'noHeavierStep';

export interface SessionProposal {
  readonly loadKg: number;
  readonly targetReps: number;
  readonly reason: SessionProposalReason;
  readonly reminders: readonly Reminder[];
}

/**
 * Starting load for the next session of an exercise.
 * `history` holds the sets of each past session on this exercise, oldest first.
 */
export function nextSessionProposal(input: {
  history: readonly (readonly SetLog[])[];
  range: RepRange;
  steps: LoadSteps;
}): SessionProposal | undefined {
  const { range, steps } = input;
  const sessions = input.history
    .map((sets) => sets.filter((set) => !set.warmup))
    .filter((sets) => sets.length > 0);
  const last = sessions.at(-1);
  if (!last) return undefined;

  const failed = (sets: readonly SetLog[]) => sets.some((set) => isFailedSet(set, range));
  const held = last.filter((set) => !isFailedSet(set, range));
  const firstLoad = floorStep(steps, (last[0] as SetLog).loadKg);
  const heldLoad =
    held.length > 0 ? floorStep(steps, Math.max(...held.map((s) => s.loadKg))) : firstLoad;

  const previous = sessions.at(-2);
  if (previous && failed(previous) && failed(last)) {
    return {
      loadKg: stepDown(steps, heldLoad) ?? heldLoad,
      targetReps: range.max,
      reason: 'repeatedFailure',
      reminders: ['technique'],
    };
  }

  const atLoad = last.filter((set) => floorStep(steps, set.loadKg) === heldLoad);
  if (
    !failed(last) &&
    atLoad.length === last.length &&
    last.every((set) => set.reps >= range.max)
  ) {
    const higher = stepUp(steps, heldLoad);
    if (higher === undefined)
      return { loadKg: heldLoad, targetReps: range.max, reason: 'noHeavierStep', reminders: [] };
    const stretchedMax = range.max + MISSING_STEP_EXTRA_REPS;
    if (isMissingStepJump(heldLoad, higher) && last.some((set) => set.reps < stretchedMax)) {
      return { loadKg: heldLoad, targetReps: stretchedMax, reason: 'missingStep', reminders: [] };
    }
    return { loadKg: higher, targetReps: range.min, reason: 'allSetsAtTop', reminders: [] };
  }

  return {
    loadKg: heldLoad,
    targetReps: range.max,
    reason: heldLoad > firstLoad ? 'raisedAndHeld' : 'keep',
    reminders: [],
  };
}

/** First time on a machine: a light test set, then the normal rules apply. */
export function firstTimeProposal(input: {
  range: RepRange;
  steps: LoadSteps;
  estimateKg?: number;
}): { loadKg: number; targetReps: number; testSet: true } {
  const { range, steps, estimateKg } = input;
  return {
    loadKg: floorStep(steps, estimateKg ?? 0),
    targetReps: range.max,
    testSet: true,
  };
}

function isFailedSet(set: SetLog, range: RepRange): boolean {
  return set.difficulty === 'fail' || set.completeReps === false || set.reps < range.min;
}
