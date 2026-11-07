import { describe, expect, it } from 'vitest';
import { cycleWeek, setsForWeek, suggestProgramChange } from '@/domain/cycles';

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
