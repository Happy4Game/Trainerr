import { describe, expect, it } from 'vitest';
import { stepsMinutes } from '@/domain/guidedSteps';
import { MUSCLES } from '@/domain/muscles';
import { guidedStretching } from '@/domain/stretching';

describe('guided stretches', () => {
  it('stretch the big muscle groups of a session, head to toe', () => {
    const muscles = new Set(guidedStretching().flatMap((s) => s.muscles ?? []));
    for (const m of ['chest', 'lats', 'quads', 'hamstrings', 'glutes', 'calves'] as const) {
      expect(muscles.has(m)).toBe(true);
    }
    for (const m of muscles) expect(MUSCLES).toContain(m);
    expect(guidedStretching()[0]?.id).toBe('chestWall');
    expect(guidedStretching().at(-1)?.id).toBe('wallCalf');
  });

  it('hold each stretch 60 s in all, as the ACSM advises (30 s per side)', () => {
    const steps = guidedStretching();
    expect(steps.every((s) => s.seconds === 60)).toBe(true);
    expect(stepsMinutes(steps)).toBe(steps.length);
    expect(stepsMinutes(steps)).toBeLessThanOrEqual(10);
  });
});
