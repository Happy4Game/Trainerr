import { describe, expect, it } from 'vitest';
import { guidedWarmup, warmupMinutes } from '@/domain/guidedWarmup';

describe('guided joint warm-up', () => {
  it('covers the whole body, head to toe', () => {
    const ids = guidedWarmup().map((s) => s.id);
    expect(ids[0]).toBe('neckNods');
    expect(ids.at(-1)).toBe('ankleCircles');
    expect(ids).toEqual(
      expect.arrayContaining(['armCircles', 'wristCircles', 'catCow', 'hipCircles', 'legSwings']),
    );
  });

  it('stays short: about 5 minutes, one countdown per move', () => {
    const steps = guidedWarmup();
    expect(steps.every((s) => s.seconds > 0 && s.seconds <= 30)).toBe(true);
    expect(warmupMinutes(steps)).toBeGreaterThanOrEqual(4);
    expect(warmupMinutes(steps)).toBeLessThanOrEqual(5);
  });
});
