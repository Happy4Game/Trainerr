import { describe, expect, it } from 'vitest';
import {
  afterSupersetSet,
  proposeSupersets,
  supersetPairs,
  supersetsSuggestedFor,
} from '@/domain/supersets';
import { ex } from '../fixtures/exercises';

describe('supersets', () => {
  it('are suggested for 30 and 45 minute sessions', () => {
    expect(supersetsSuggestedFor(30)).toBe(true);
    expect(supersetsSuggestedFor(45)).toBe(true);
    expect(supersetsSuggestedFor(60)).toBe(false);
  });

  it('pair opposite muscles by default', () => {
    const blocks = proposeSupersets([ex.legExtension, ex.legCurl, ex.curl, ex.tricepsPushdown]);
    expect(blocks).toEqual([
      { kind: 'superset', first: ex.legExtension, second: ex.legCurl, type: 'agonistAntagonist' },
      { kind: 'superset', first: ex.curl, second: ex.tricepsPushdown, type: 'agonistAntagonist' },
    ]);
  });

  it('never put heavy compounds in a superset', () => {
    const blocks = proposeSupersets([ex.dbBench, ex.latPulldown, ex.legPress]);
    expect(blocks.every((block) => block.kind === 'single')).toBe(true);
  });

  it('do not pair the same muscle unless asked, and flag the volume loss', () => {
    expect(proposeSupersets([ex.pecFly, ex.chestPress])).toEqual([
      { kind: 'single', exercise: ex.pecFly },
      { kind: 'single', exercise: ex.chestPress },
    ]);
    expect(proposeSupersets([ex.pecFly, ex.chestPress], { allowSameMuscle: true })).toEqual([
      {
        kind: 'superset',
        first: ex.pecFly,
        second: ex.chestPress,
        type: 'sameMuscle',
        reducesVolume: true,
      },
    ]);
  });

  it('pair upper and lower body only when the machines are close', () => {
    expect(proposeSupersets([ex.pecFly, ex.legCurl])[0]?.kind).toBe('single');
    expect(proposeSupersets([ex.pecFly, ex.legCurl], { allowUpperLower: true })[0]).toMatchObject({
      kind: 'superset',
      type: 'upperLower',
    });
  });

  it('prefer opposite muscles over upper / lower pairs', () => {
    const blocks = proposeSupersets([ex.legExtension, ex.pecFly, ex.legCurl], {
      allowUpperLower: true,
    });
    expect(blocks[0]).toMatchObject({ first: ex.legExtension, second: ex.legCurl });
    expect(blocks[1]).toEqual({ kind: 'single', exercise: ex.pecFly });
  });

  it('skip pairs where both exercises load the protected zone', () => {
    const blocks = proposeSupersets([ex.shoulderPress, ex.rearDelt], {
      protectedZone: 'shoulders',
    });
    expect(blocks.every((block) => block.kind === 'single')).toBe(true);
    expect(proposeSupersets([ex.shoulderPress, ex.rearDelt])[0]?.kind).toBe('superset');
  });
});

describe('supersets during the workout', () => {
  const pairs: [string, string][] = [['leg-extension', 'leg-curl']];
  const todo = new Set(['leg-extension', 'leg-curl']);

  it('lists the pairs of the blocks', () => {
    expect(supersetPairs(proposeSupersets([ex.legExtension, ex.legCurl, ex.dbBench]))).toEqual(
      pairs,
    );
  });

  it('goes straight to the partner after the first exercise, without rest', () => {
    expect(afterSupersetSet(pairs, 'leg-extension', (id) => todo.has(id))).toEqual({
      next: 'leg-curl',
      rest: false,
    });
  });

  it('rests after the second exercise, then back to the first', () => {
    expect(afterSupersetSet(pairs, 'leg-curl', (id) => todo.has(id))).toEqual({
      next: 'leg-extension',
      rest: true,
    });
  });

  it('behaves normally once the partner is done, or outside a superset', () => {
    expect(afterSupersetSet(pairs, 'leg-extension', () => false)).toEqual({ rest: true });
    expect(afterSupersetSet(pairs, 'db-bench', () => true)).toEqual({ rest: true });
  });
});
