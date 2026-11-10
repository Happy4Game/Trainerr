import { describe, expect, it } from 'vitest';
import { guidedWarmup, warmupMinutes } from '@/domain/guidedWarmup';

const ids = (input: Parameters<typeof guidedWarmup>[0]) => guidedWarmup(input).map((s) => s.id);

describe('guided warm-up (RAMP)', () => {
  it('raises the temperature first with light cardio', () => {
    expect(ids({ groups: ['push'] })[0]).toBe('lightCardio');
    expect(ids({ groups: ['legs'] })[0]).toBe('lightCardio');
  });

  it('skips the light cardio when cardio is planned before the weights', () => {
    expect(ids({ groups: ['push'], cardioBefore: true })).not.toContain('lightCardio');
  });

  it('wakes up the upper body on a push or pull day, without the legs', () => {
    const push = ids({ groups: ['push', 'core'] });
    expect(push).toEqual(expect.arrayContaining(['armCircles', 'bandPullApart', 'easyPushUps']));
    expect(push).not.toContain('bodyweightSquats');
    // No push-ups on a pull day.
    expect(ids({ groups: ['pull'] })).not.toContain('easyPushUps');
  });

  it('wakes up the lower body on a legs day, without the arms', () => {
    const legs = ids({ groups: ['legs'] });
    expect(legs).toEqual(
      expect.arrayContaining(['legSwings', 'bodyweightSquats', 'gluteBridge', 'ankleCircles']),
    );
    expect(legs).not.toContain('armCircles');
  });

  it('covers both for a full-body session, an abs-only one or an unknown one', () => {
    for (const groups of [['push', 'pull', 'legs'], ['core'], []] as const) {
      expect(ids({ groups })).toEqual(expect.arrayContaining(['armCircles', 'gluteBridge']));
    }
  });

  it('stays short: 4 to 6 minutes, every move with its muscles', () => {
    for (const groups of [['push'], ['legs'], ['push', 'legs']] as const) {
      const steps = guidedWarmup({ groups });
      expect(steps.every((s) => s.seconds > 0 && (s.muscles?.length ?? 0) > 0)).toBe(true);
      expect(warmupMinutes(steps)).toBeGreaterThanOrEqual(4);
      expect(warmupMinutes(steps)).toBeLessThanOrEqual(6);
    }
  });
});
