import { describe, expect, it } from 'vitest';
import { buildSession, exercisesPerSession, setsPerExercise } from '@/domain/sessionBuilder';
import { TRAINING_MODELS } from '@/domain/trainingModels';
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

  it('returns fewer exercises when there are not enough favorites', () => {
    const session = buildSession({ template: pushA, favorites: [ex.pecFly], count: 5 });
    expect(ids(session)).toEqual(['pec-fly']);
  });
});
