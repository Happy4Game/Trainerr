import { describe, expect, it } from 'vitest';
import { guidedWarmup, warmupMinutes } from '@/domain/guidedWarmup';
import { LEG_MUSCLES, PUSH_MUSCLES } from '@/domain/muscles';

describe('guided joint warm-up', () => {
  it('stays short: 3 to 5 minutes, one countdown per move', () => {
    for (const muscles of [PUSH_MUSCLES, LEG_MUSCLES, ['abs' as const]]) {
      const steps = guidedWarmup(muscles);
      expect(steps.every((s) => s.seconds > 0)).toBe(true);
      expect(warmupMinutes(steps)).toBeGreaterThanOrEqual(3);
      expect(warmupMinutes(steps)).toBeLessThanOrEqual(5);
    }
  });

  it('moves the joints of the day', () => {
    expect(guidedWarmup(PUSH_MUSCLES).map((s) => s.id)).toContain('armCircles');
    const legs = guidedWarmup(LEG_MUSCLES).map((s) => s.id);
    expect(legs).toEqual(expect.arrayContaining(['hipCircles', 'legSwings']));
    expect(legs).not.toContain('armCircles');
  });
});
