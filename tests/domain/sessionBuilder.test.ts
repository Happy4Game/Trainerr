import { describe, expect, it } from 'vitest';
import {
  buildSession,
  exercisesPerSession,
  readyMadeSession,
  withExtraSet,
  setsPerExercise,
  withCarryOver,
} from '@/domain/sessionBuilder';
import { TRAINING_MODELS } from '@/domain/trainingModels';
import type { Exercise } from '@/domain/types';
import { allExercises, ex } from '../fixtures/exercises';

const [pushA, pullA, legsA, pushB, pullB] = TRAINING_MODELS.ppl.rotation as [
  (typeof TRAINING_MODELS.ppl.rotation)[number],
  (typeof TRAINING_MODELS.ppl.rotation)[number],
  (typeof TRAINING_MODELS.ppl.rotation)[number],
  (typeof TRAINING_MODELS.ppl.rotation)[number],
  (typeof TRAINING_MODELS.ppl.rotation)[number],
];
const ids = (list: readonly { id: string }[]) => list.map((e) => e.id);

describe('session size', () => {
  it('sets the number of exercises from the usual session length', () => {
    expect(exercisesPerSession(30)).toBe(3);
    expect(exercisesPerSession(45)).toBe(4);
    expect(exercisesPerSession(60)).toBe(5);
    expect(exercisesPerSession(90)).toBe(6);
  });

  it('sets the number of sets from the goal and the comeback mode', () => {
    expect(setsPerExercise('hypertrophy')).toBe(3);
    expect(setsPerExercise('strength')).toBe(3);
    expect(setsPerExercise('maintenance')).toBe(2);
    expect(setsPerExercise('hypertrophy', 3)).toBe(3);
    expect(setsPerExercise('maintenance', 3)).toBe(2);
  });
});

describe('building a session from the favorites', () => {
  it('puts compounds first and covers as many muscles as possible', () => {
    const session = buildSession({ template: pushA, favorites: allExercises, count: 5 });
    expect(ids(session)).toEqual([
      'db-bench',
      'shoulder-press',
      'chest-press',
      'lateral-raise',
      'triceps-pushdown',
    ]);
  });

  it('only uses favorites of the session type', () => {
    const session = buildSession({ template: legsA, favorites: allExercises, count: 4 });
    for (const exercise of session) expect(['legs', 'core']).toContain(exercise.group);
  });

  it('alternates A / B variants to use all the favorite machines', () => {
    const a = buildSession({ template: pullA, favorites: allExercises, count: 4 });
    const b = buildSession({ template: pullB, favorites: allExercises, count: 4 });
    expect(new Set(ids(a))).not.toEqual(new Set(ids(b)));
    expect(ids(a)).toEqual(['lat-pulldown', 'seated-row', 'diverging-seated-row', 'rear-delt']);
  });

  it('hides exercises that load a protected zone', () => {
    const session = buildSession({
      template: pushB,
      favorites: allExercises,
      count: 5,
      protectedZone: 'shoulders',
    });
    expect(ids(session)).not.toContain('shoulder-press');
    expect(ids(session)).not.toContain('lateral-raise');
  });

  it('puts first the machines that complement the other sport', () => {
    const session = buildSession({
      template: legsA,
      favorites: allExercises,
      count: 3,
      priorityIds: new Set([ex.legCurl.id, ex.hipAbduction.id, ex.backExtension.id]),
    });
    expect(ids(session)).toEqual(['leg-press', 'leg-curl', 'hip-abduction']);
  });

  it('catches up the muscles behind on their week', () => {
    const usual = buildSession({ template: legsA, favorites: allExercises, count: 3 });
    expect(ids(usual)).not.toContain('back-extension');
    const session = buildSession({
      template: legsA,
      favorites: allExercises,
      count: 3,
      neglected: ['lowerBack'],
    });
    expect(ids(session)).toContain('back-extension');
    // The main compound stays: a muscle new to the session still counts more.
    expect(ids(session)[0]).toBe('leg-press');
  });

  it('returns fewer exercises when there are not enough favorites', () => {
    const session = buildSession({ template: pushA, favorites: [ex.pecFly], count: 5 });
    expect(ids(session)).toEqual(['pec-fly']);
  });
});

describe('machines left over last time', () => {
  it('come back, but an isolation one still waits for the compounds', () => {
    const built = [ex.dbBench, ex.chestPress, ex.lateralRaise];
    const session = withCarryOver<Exercise>([ex.pecFly, ex.shoulderPress], built, 4);
    expect(ids(session)).toEqual(['db-bench', 'shoulder-press', 'chest-press', 'pec-fly']);
  });
});

describe('ready-made session when there are not enough favorites', () => {
  it('keeps my machines and completes with popular ones for the missing muscles', () => {
    const session = readyMadeSession({
      template: pushA,
      favorites: [ex.pecFly],
      popular: allExercises,
      count: 4,
    });
    expect(session.exercises).toHaveLength(4);
    expect(ids(session.exercises)).toContain('pec-fly');
    expect(session.suggestedIds).not.toContain('pec-fly');
    expect(session.suggestedIds).toHaveLength(3);
    // The pec deck already works the chest: the shoulders come in, and the session stays varied.
    expect(session.suggestedIds).toContain('shoulder-press');
    const muscles = new Set(session.exercises.flatMap((e) => e.primaryMuscles));
    expect(muscles.size).toBeGreaterThanOrEqual(3);
    // Compounds first, as in any session.
    expect(session.exercises[0]?.kind).not.toBe('isolation');
  });

  it('builds the whole session from popular machines without any favorite', () => {
    const session = readyMadeSession({
      template: legsA,
      favorites: [],
      popular: allExercises,
      count: 4,
    });
    expect(session.exercises).toHaveLength(4);
    expect(session.suggestedIds).toEqual(ids(session.exercises));
    for (const exercise of session.exercises) expect(['legs', 'core']).toContain(exercise.group);
  });

  it('suggests nothing when the favorites are enough', () => {
    const session = readyMadeSession({
      template: pushA,
      favorites: allExercises,
      popular: allExercises,
      count: 5,
    });
    expect(session.suggestedIds).toEqual([]);
    expect(ids(session.exercises)).toEqual(
      ids(buildSession({ template: pushA, favorites: allExercises, count: 5 })),
    );
  });

  it('respects the protected zone in the suggestions', () => {
    const session = readyMadeSession({
      template: pushB,
      favorites: [],
      popular: allExercises,
      count: 5,
      protectedZone: 'shoulders',
    });
    expect(ids(session.exercises)).not.toContain('shoulder-press');
    expect(ids(session.exercises)).not.toContain('lateral-raise');
  });
});

describe('extra sets', () => {
  const plan = [
    { exerciseId: 'a', sets: 3 },
    { exerciseId: 'b', sets: 3 },
  ];

  it('adds one set to the chosen exercise only', () => {
    expect(withExtraSet(plan, 'a')).toEqual([
      { exerciseId: 'a', sets: 4 },
      { exerciseId: 'b', sets: 3 },
    ]);
  });

  it('adds the exercise when it was not planned (alternative machine)', () => {
    expect(withExtraSet(plan, 'c', 3)).toContainEqual({ exerciseId: 'c', sets: 4 });
  });

  it('stops at 10 sets', () => {
    expect(withExtraSet([{ exerciseId: 'a', sets: 10 }], 'a')).toEqual([
      { exerciseId: 'a', sets: 10 },
    ]);
  });
});
