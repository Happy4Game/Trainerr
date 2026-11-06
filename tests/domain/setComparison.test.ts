import { describe, expect, it } from 'vitest';
import { compareWithLastTime } from '@/domain/setComparison';

const s = (loadKg: number, reps: number) => ({ loadKg, reps });

describe('sets compared with last time', () => {
  it('puts each set next to the same set last time, with its trend', () => {
    const rows = compareWithLastTime([s(20, 10), s(20, 9), s(20, 8)], [s(22.5, 8), s(20, 9)], 3);
    expect(rows).toEqual([
      { number: 1, before: s(20, 10), now: s(22.5, 8), trend: 'up' },
      { number: 2, before: s(20, 9), now: s(20, 9), trend: 'same' },
      { number: 3, before: s(20, 8) },
    ]);
  });

  it('more reps at the same load is progress, fewer is not', () => {
    expect(compareWithLastTime([s(20, 8)], [s(20, 10)])[0]?.trend).toBe('up');
    expect(compareWithLastTime([s(20, 8)], [s(20, 6)])[0]?.trend).toBe('down');
  });

  it('shows the sets planned today, and extra sets done today', () => {
    expect(compareWithLastTime([], [], 3)).toHaveLength(3);
    expect(compareWithLastTime([s(20, 8)], [s(20, 8), s(20, 7)])[1]).toEqual({
      number: 2,
      now: s(20, 7),
    });
  });
});
