import { describe, expect, it } from 'vitest';
import {
  TRAINING_MODELS,
  frequencyPerMuscle,
  needsFrequencyNote,
  recommendModel,
  rotationFor,
} from '@/domain/trainingModels';

describe('training models', () => {
  it('offers the 7 models of the spec', () => {
    expect(Object.keys(TRAINING_MODELS)).toEqual([
      'fullBody',
      'upperLower',
      'ppl',
      'pplul',
      'phul',
      'arnold',
      'broSplit',
    ]);
  });

  it('recommends a model from the number of sessions per week', () => {
    expect(recommendModel(2)).toBe('fullBody');
    expect(recommendModel(3)).toBe('fullBody');
    expect(recommendModel(4)).toBe('upperLower');
    expect(recommendModel(5)).toBe('ppl');
    expect(recommendModel(6)).toBe('ppl');
  });

  it('rotates Push A → Pull A → Legs A → Push B → Pull B → Legs B', () => {
    expect(rotationFor('ppl').map((t) => t.id)).toEqual([
      'pushA',
      'pullA',
      'legsA',
      'pushB',
      'pullB',
      'legsB',
    ]);
  });

  it('defines the other rotations', () => {
    expect(rotationFor('fullBody').map((t) => t.id)).toEqual(['fullBodyA', 'fullBodyB']);
    expect(rotationFor('upperLower').map((t) => t.id)).toEqual([
      'upperA',
      'lowerA',
      'upperB',
      'lowerB',
    ]);
    expect(rotationFor('pplul').map((t) => t.id)).toEqual([
      'push',
      'pull',
      'legs',
      'upper',
      'lower',
    ]);
    expect(rotationFor('phul').map((t) => [t.id, t.focus])).toEqual([
      ['upperPower', 'strength'],
      ['lowerPower', 'strength'],
      ['upperHypertrophy', 'hypertrophy'],
      ['lowerHypertrophy', 'hypertrophy'],
    ]);
    expect(rotationFor('arnold')).toHaveLength(6);
    expect(rotationFor('broSplit').map((t) => t.id)).toEqual([
      'chest',
      'back',
      'shoulders',
      'arms',
      'legsDay',
    ]);
  });

  it('computes how often each muscle is trained per week', () => {
    expect(frequencyPerMuscle('ppl', 6)).toBe(2);
    expect(frequencyPerMuscle('ppl', 3)).toBe(1);
    expect(frequencyPerMuscle('fullBody', 3)).toBe(3);
    expect(frequencyPerMuscle('upperLower', 4)).toBe(2);
    expect(frequencyPerMuscle('pplul', 5)).toBe(2);
    expect(frequencyPerMuscle('phul', 4)).toBe(2);
    expect(frequencyPerMuscle('arnold', 6)).toBe(2);
    expect(frequencyPerMuscle('broSplit', 5)).toBe(1);
  });

  it('adds a note when a muscle is trained only once a week (Schoenfeld 2016)', () => {
    expect(needsFrequencyNote('broSplit', 5)).toBe(true);
    expect(needsFrequencyNote('ppl', 3)).toBe(true);
    expect(needsFrequencyNote('ppl', 6)).toBe(false);
    expect(needsFrequencyNote('upperLower', 4)).toBe(false);
  });
});
