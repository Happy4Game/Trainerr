import {
  CORE_MUSCLES,
  LEG_MUSCLES,
  PULL_MUSCLES,
  PUSH_MUSCLES,
  SHOULDER_MUSCLES,
  type MuscleId,
} from './muscles';
import type { PplGroup } from './types';

export type TrainingModelId =
  'fullBody' | 'upperLower' | 'ppl' | 'pplul' | 'phul' | 'arnold' | 'broSplit';

export interface SessionTemplate {
  readonly id: string;
  readonly groups: readonly PplGroup[];
  readonly muscles: readonly MuscleId[];
  readonly variant?: 'A' | 'B';
  readonly focus?: 'strength' | 'hypertrophy';
}

export interface TrainingModel {
  readonly id: TrainingModelId;
  readonly sessionsPerWeek: { readonly min: number; readonly max: number };
  readonly rotation: readonly SessionTemplate[];
}

const UPPER_MUSCLES = [...PUSH_MUSCLES, ...PULL_MUSCLES];
const LOWER_MUSCLES = [...LEG_MUSCLES, ...CORE_MUSCLES];
const ALL_MUSCLES = [...UPPER_MUSCLES, ...LOWER_MUSCLES];

function template(
  id: string,
  groups: readonly PplGroup[],
  muscles: readonly MuscleId[],
  extra: Pick<SessionTemplate, 'variant' | 'focus'> = {},
): SessionTemplate {
  return { id, groups, muscles, ...extra };
}

const push = (id: string, variant?: 'A' | 'B') =>
  template(id, ['push'], PUSH_MUSCLES, variant ? { variant } : {});
const pull = (id: string, variant?: 'A' | 'B') =>
  template(id, ['pull'], PULL_MUSCLES, variant ? { variant } : {});
const legs = (id: string, variant?: 'A' | 'B') =>
  template(id, ['legs', 'core'], LOWER_MUSCLES, variant ? { variant } : {});
const upper = (id: string, extra: Pick<SessionTemplate, 'variant' | 'focus'> = {}) =>
  template(id, ['push', 'pull'], UPPER_MUSCLES, extra);
const lower = (id: string, extra: Pick<SessionTemplate, 'variant' | 'focus'> = {}) =>
  template(id, ['legs', 'core'], LOWER_MUSCLES, extra);
const chestBack = (id: string, variant: 'A' | 'B') =>
  template(id, ['push', 'pull'], ['chest', 'lats', 'upperBack', 'traps'], { variant });
const shouldersArms = (id: string, variant: 'A' | 'B') =>
  template(id, ['push', 'pull'], [...SHOULDER_MUSCLES, 'biceps', 'triceps', 'forearms'], {
    variant,
  });

export const TRAINING_MODELS: Readonly<Record<TrainingModelId, TrainingModel>> = {
  fullBody: {
    id: 'fullBody',
    sessionsPerWeek: { min: 2, max: 4 },
    rotation: [
      template('fullBodyA', ['push', 'pull', 'legs', 'core'], ALL_MUSCLES, { variant: 'A' }),
      template('fullBodyB', ['push', 'pull', 'legs', 'core'], ALL_MUSCLES, { variant: 'B' }),
    ],
  },
  upperLower: {
    id: 'upperLower',
    sessionsPerWeek: { min: 4, max: 4 },
    rotation: [
      upper('upperA', { variant: 'A' }),
      lower('lowerA', { variant: 'A' }),
      upper('upperB', { variant: 'B' }),
      lower('lowerB', { variant: 'B' }),
    ],
  },
  ppl: {
    id: 'ppl',
    sessionsPerWeek: { min: 3, max: 6 },
    rotation: [
      push('pushA', 'A'),
      pull('pullA', 'A'),
      legs('legsA', 'A'),
      push('pushB', 'B'),
      pull('pullB', 'B'),
      legs('legsB', 'B'),
    ],
  },
  pplul: {
    id: 'pplul',
    sessionsPerWeek: { min: 5, max: 5 },
    rotation: [push('push'), pull('pull'), legs('legs'), upper('upper'), lower('lower')],
  },
  phul: {
    id: 'phul',
    sessionsPerWeek: { min: 4, max: 4 },
    rotation: [
      upper('upperPower', { focus: 'strength' }),
      lower('lowerPower', { focus: 'strength' }),
      upper('upperHypertrophy', { focus: 'hypertrophy' }),
      lower('lowerHypertrophy', { focus: 'hypertrophy' }),
    ],
  },
  arnold: {
    id: 'arnold',
    sessionsPerWeek: { min: 6, max: 6 },
    rotation: [
      chestBack('chestBackA', 'A'),
      shouldersArms('shouldersArmsA', 'A'),
      legs('legsA', 'A'),
      chestBack('chestBackB', 'B'),
      shouldersArms('shouldersArmsB', 'B'),
      legs('legsB', 'B'),
    ],
  },
  broSplit: {
    id: 'broSplit',
    sessionsPerWeek: { min: 5, max: 5 },
    rotation: [
      template('chest', ['push'], ['chest']),
      template('back', ['pull'], ['lats', 'upperBack', 'traps']),
      template('shoulders', ['push', 'pull'], SHOULDER_MUSCLES),
      template('arms', ['push', 'pull'], ['biceps', 'triceps', 'forearms']),
      template('legsDay', ['legs', 'core'], LOWER_MUSCLES),
    ],
  },
};

export function rotationFor(model: TrainingModelId): readonly SessionTemplate[] {
  return TRAINING_MODELS[model].rotation;
}

/** Questionnaire rule: 2–3 sessions → full body, 4 → upper / lower, 5–6 → PPL A / B. */
export function recommendModel(sessionsPerWeek: number): TrainingModelId {
  if (sessionsPerWeek <= 3) return 'fullBody';
  if (sessionsPerWeek === 4) return 'upperLower';
  return 'ppl';
}

/** Muscles used to judge a model's weekly frequency. */
const KEY_MUSCLES: readonly MuscleId[] = [
  'chest',
  'lats',
  'upperBack',
  'sideDelts',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
];

/** Times per week the least-trained key muscle is worked, rounded to 0.1. */
export function frequencyPerMuscle(model: TrainingModelId, sessionsPerWeek: number): number {
  const rotation = rotationFor(model);
  const perMuscle = KEY_MUSCLES.map(
    (muscle) => rotation.filter((t) => t.muscles.includes(muscle)).length,
  );
  const frequency = (Math.min(...perMuscle) * sessionsPerWeek) / rotation.length;
  return Math.round(frequency * 10) / 10;
}

/**
 * Schoenfeld et al. 2016: training a muscle twice a week beats once a week at
 * equal volume. Models below that get a note.
 */
export function needsFrequencyNote(model: TrainingModelId, sessionsPerWeek: number): boolean {
  return frequencyPerMuscle(model, sessionsPerWeek) < 1.5;
}
