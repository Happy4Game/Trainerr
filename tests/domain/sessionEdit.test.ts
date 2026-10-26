import { describe, expect, it } from 'vitest';
import { startQueue } from '@/domain/busyMachine';
import {
  afterMovingSets,
  movePending,
  removeFromQueue,
  replaceInQueue,
  replacementsFor,
  withoutSet,
} from '@/domain/sessionEdit';
import type { Exercise } from '@/domain/types';

const ex = (
  id: string,
  kind: Exercise['kind'],
  primary: Exercise['primaryMuscles'],
  secondary: Exercise['secondaryMuscles'] = [],
): Exercise => ({
  id,
  kind,
  group: 'push',
  equipment: 'machine',
  primaryMuscles: primary,
  secondaryMuscles: secondary,
});
const chestPress = ex('chestPress', 'machineCompound', ['chest'], ['triceps', 'frontDelts']);
const bench = ex('bench', 'heavyCompound', ['chest'], ['triceps', 'frontDelts']);
const dbBench = ex('dbBench', 'heavyCompound', ['chest'], ['triceps']);
const pecFly = ex('pecFly', 'isolation', ['chest']);
const shoulderPress = ex('shoulderPress', 'machineCompound', ['frontDelts'], ['triceps']);

describe('changing a session in progress', () => {
  it('offers the same movement on other machines, mine first', () => {
    const list = replacementsFor(
      chestPress,
      [pecFly, shoulderPress, dbBench, bench],
      (id) => id === 'dbBench',
    );
    // The fly is an isolation, the shoulder press works another main muscle.
    expect(list.map((e) => e.id)).toEqual(['dbBench', 'bench']);
  });

  it('puts the new machine in the place of the old one', () => {
    const queue = { pending: ['chestPress', 'shoulderPress'], waiting: [], done: [] };
    expect(replaceInQueue(queue, 'chestPress', 'bench')).toEqual({
      pending: ['bench', 'shoulderPress'],
      waiting: [],
      done: [],
    });
    // Already planned later: it simply comes now, no duplicate.
    expect(replaceInQueue(queue, 'chestPress', 'shoulderPress').pending).toEqual(['shoulderPress']);
    const busy = {
      pending: ['shoulderPress'],
      waiting: [{ exerciseId: 'chestPress', since: 0 }],
      done: [],
    };
    expect(replaceInQueue(busy, 'chestPress', 'bench').waiting).toEqual([
      { exerciseId: 'bench', since: 0 },
    ]);
  });

  it('reorders and removes the exercises to come', () => {
    const queue = startQueue(['a', 'b', 'c']);
    expect(movePending(queue, 'c', -1).pending).toEqual(['a', 'c', 'b']);
    expect(movePending(queue, 'a', -1)).toBe(queue);
    expect(movePending(queue, 'c', 1)).toBe(queue);
    expect(removeFromQueue(queue, 'b').pending).toEqual(['a', 'c']);
  });

  it('removes a planned set, never below the sets done nor below 1', () => {
    const plan = [
      { exerciseId: 'a', sets: 3 },
      { exerciseId: 'b', sets: 1 },
    ];
    expect(withoutSet(plan, 'a', 0)).toEqual([
      { exerciseId: 'a', sets: 2 },
      { exerciseId: 'b', sets: 1 },
    ]);
    expect(withoutSet(plan, 'a', 3)[0]?.sets).toBe(3);
    expect(withoutSet(plan, 'b', 0)[1]?.sets).toBe(1);
  });

  it('moves the sets logged on the wrong machine to the right one', () => {
    // Logged 3 sets on the chest press, but it was the bench press.
    const queue = { pending: ['shoulderPress'], waiting: [], done: ['chestPress'] };
    expect(
      afterMovingSets(queue, {
        fromId: 'chestPress',
        toId: 'bench',
        fromHasSetsLeft: false,
        toComplete: true,
      }),
    ).toEqual({ pending: ['shoulderPress', 'chestPress'], waiting: [], done: ['bench'] });
    // Only one set moved, the target still lacks sets: it comes next.
    expect(
      afterMovingSets(queue, {
        fromId: 'chestPress',
        toId: 'bench',
        fromHasSetsLeft: true,
        toComplete: false,
      }),
    ).toEqual({ pending: ['bench', 'shoulderPress'], waiting: [], done: ['chestPress'] });
  });
});
