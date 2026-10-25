import { describe, expect, it } from 'vitest';
import { cycleWeek, setsForWeek, suggestProgramChange } from '@/domain/cycles';
import { MOBILITY_MAX_MOVES, MOBILITY_MIN_SECONDS, mobilityRoutine } from '@/domain/mobility';
import { LEG_MUSCLES, PUSH_MUSCLES } from '@/domain/muscles';

describe('training cycles', () => {
  it('counts 4 normal weeks then a lighter one', () => {
    expect(cycleWeek('2026-10-19', '2026-10-25')).toEqual({ cycle: 1, week: 1, light: false });
    expect(cycleWeek('2026-10-19', '2026-11-16')).toEqual({ cycle: 1, week: 5, light: true });
    expect(cycleWeek('2026-10-19', '2026-11-23')).toEqual({ cycle: 2, week: 1, light: false });
  });

  it('removes one set per exercise in the light week, never below one', () => {
    expect(setsForWeek(3, false)).toBe(3);
    expect(setsForWeek(3, true)).toBe(2);
    expect(setsForWeek(1, true)).toBe(1);
  });

  it('suggests another program after 3 cycles on the same one', () => {
    expect(suggestProgramChange('2026-10-19', '2026-12-31')).toBe(false);
    expect(suggestProgramChange('2026-10-19', '2027-01-25')).toBe(false);
    expect(suggestProgramChange('2026-10-19', '2027-02-01')).toBe(true);
  });
});

describe('joint warm-up', () => {
  it('covers the muscles of the day in 3 to 5 minutes', () => {
    for (const muscles of [PUSH_MUSCLES, LEG_MUSCLES]) {
      const routine = mobilityRoutine(muscles);
      const seconds = routine.reduce((t, m) => t + m.seconds, 0);
      expect(seconds).toBeGreaterThanOrEqual(MOBILITY_MIN_SECONDS);
      expect(seconds).toBeLessThanOrEqual(300);
      expect(routine.length).toBeLessThanOrEqual(MOBILITY_MAX_MOVES);
    }
  });

  it('picks shoulder moves for a push day, hip and leg moves for a legs day', () => {
    expect(mobilityRoutine(PUSH_MUSCLES).map((m) => m.id)).toContain('armCircles');
    const legs = mobilityRoutine(LEG_MUSCLES).map((m) => m.id);
    expect(legs).toEqual(expect.arrayContaining(['hipCircles', 'legSwings', 'ankleRocks']));
    expect(legs).not.toContain('armCircles');
  });
});
