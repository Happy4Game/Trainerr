import { describe, expect, it } from 'vitest';
import {
  ACTIVATION_MAX_MOVES,
  guidedWarmup,
  RAISE_SECONDS,
  warmupMinutes,
} from '@/domain/guidedWarmup';
import { LEG_MUSCLES, PUSH_MUSCLES } from '@/domain/muscles';

const parts = (steps: ReturnType<typeof guidedWarmup>) => steps.map((s) => s.part);

describe('guided warm-up', () => {
  it('follows the RAMP order: raise, mobilise, activate, then the approach sets', () => {
    const steps = guidedWarmup({ muscles: PUSH_MUSCLES });
    expect(steps[0]).toEqual({ id: 'raise', part: 'raise', seconds: RAISE_SECONDS });
    expect(steps.at(-1)).toEqual({ id: 'approach', part: 'potentiate' });
    const order = ['raise', 'mobilise', 'activate', 'potentiate'];
    const indexes = parts(steps).map((p) => order.indexOf(p));
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
    expect(parts(steps)).toEqual(expect.arrayContaining(order));
  });

  it('lasts 5 to 10 minutes, as the ACSM advises', () => {
    for (const muscles of [PUSH_MUSCLES, LEG_MUSCLES, ['abs' as const]]) {
      const minutes = warmupMinutes(guidedWarmup({ muscles }));
      expect(minutes).toBeGreaterThanOrEqual(5);
      expect(minutes).toBeLessThanOrEqual(10);
    }
  });

  it('wakes up the muscles of the day', () => {
    const push = guidedWarmup({ muscles: PUSH_MUSCLES }).filter((s) => s.part === 'activate');
    expect(push.map((s) => s.id)).toContain('scapularPushUps');
    expect(push.length).toBeLessThanOrEqual(ACTIVATION_MAX_MOVES);
    const legs = guidedWarmup({ muscles: LEG_MUSCLES }).filter((s) => s.part === 'activate');
    expect(legs.map((s) => s.id)).toContain('gluteBridges');
    expect(legs.map((s) => s.id)).not.toContain('scapularPushUps');
  });

  it('counts reps per side on one-sided moves', () => {
    const core = guidedWarmup({ muscles: ['abs', 'obliques'] });
    expect(core.find((s) => s.id === 'deadBugs')).toMatchObject({ reps: 8, perSide: true });
  });

  it('leaves out the easy cardio when cardio is planned before the weights', () => {
    const steps = guidedWarmup({ muscles: PUSH_MUSCLES, cardioBefore: true });
    expect(parts(steps)).not.toContain('raise');
    expect(warmupMinutes(steps)).toBeLessThan(
      warmupMinutes(guidedWarmup({ muscles: PUSH_MUSCLES })),
    );
  });
});
