import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { orderIssues, recommendedOrder, roleOf } from '@/domain/exerciseOrder';
import type { Exercise } from '@/domain/types';

const bench: Exercise = {
  id: 'bench',
  kind: 'heavyCompound',
  group: 'push',
  equipment: 'barbell',
  primaryMuscles: ['chest'],
  secondaryMuscles: ['triceps', 'frontDelts'],
};
const shoulderPress: Exercise = {
  id: 'press',
  kind: 'machineCompound',
  group: 'push',
  equipment: 'machine',
  primaryMuscles: ['frontDelts'],
  secondaryMuscles: ['triceps'],
};
const pushdown: Exercise = {
  id: 'pushdown',
  kind: 'isolation',
  group: 'push',
  equipment: 'cable',
  primaryMuscles: ['triceps'],
  secondaryMuscles: [],
};
const curl: Exercise = {
  id: 'curl',
  kind: 'isolation',
  group: 'pull',
  equipment: 'dumbbell',
  primaryMuscles: ['biceps'],
  secondaryMuscles: [],
};

describe('exercise order', () => {
  it('gives each kind its place: heavy compound, secondary compound, isolation', () => {
    expect([bench, shoulderPress, pushdown].map(roleOf)).toEqual([
      'mainCompound',
      'secondaryCompound',
      'isolation',
    ]);
  });

  it('flags an isolation done before a compound working the same muscle', () => {
    expect(orderIssues([pushdown, bench])).toEqual([
      { isolationId: 'pushdown', compoundId: 'bench', muscle: 'triceps' },
    ]);
    // Biceps are not worked by the bench press: no issue.
    expect(orderIssues([curl, bench])).toEqual([]);
    expect(orderIssues([bench, shoulderPress, pushdown])).toEqual([]);
  });

  it('puts compounds first and keeps the order within a role', () => {
    expect(recommendedOrder([pushdown, curl, shoulderPress, bench]).map((e) => e.id)).toEqual([
      'bench',
      'press',
      'pushdown',
      'curl',
    ]);
  });

  it('never leaves an order issue after reordering (property)', () => {
    fc.assert(
      fc.property(fc.shuffledSubarray([bench, shoulderPress, pushdown, curl]), (list) => {
        return orderIssues(recommendedOrder(list)).length === 0;
      }),
    );
  });
});
