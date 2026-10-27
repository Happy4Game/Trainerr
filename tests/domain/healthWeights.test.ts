import { describe, expect, it } from 'vitest';
import { weighingsToAdd } from '@/domain/healthWeights';

describe('weighings from Health Connect', () => {
  it('keeps the last weighing of each day, rounded, oldest day first', () => {
    expect(
      weighingsToAdd(
        [
          { date: '2026-10-24', time: '2026-10-24T18:00:00Z', kg: 79.04 },
          { date: '2026-10-20', time: '2026-10-20T06:30:00Z', kg: 78.96 },
          { date: '2026-10-24', time: '2026-10-24T06:00:00Z', kg: 78.31 },
        ],
        new Set(),
      ),
    ).toEqual([
      { date: '2026-10-20', weightKg: 79 },
      { date: '2026-10-24', weightKg: 79 },
    ]);
  });

  it('skips days already weighed in the app and values that cannot be a body weight', () => {
    expect(
      weighingsToAdd(
        [
          { date: '2026-10-20', time: '2026-10-20T06:30:00Z', kg: 78.9 },
          { date: '2026-10-21', time: '2026-10-21T06:30:00Z', kg: 7.89 },
          { date: '2026-10-22', time: '2026-10-22T06:30:00Z', kg: 78.4 },
        ],
        new Set(['2026-10-20']),
      ),
    ).toEqual([{ date: '2026-10-22', weightKg: 78.4 }]);
  });
});
