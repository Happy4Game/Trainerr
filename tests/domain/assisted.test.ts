import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { assistedScale, bodyWeightOn, withRealLoads } from '@/domain/assisted';
import { nextSessionProposal, nextSetProposal } from '@/domain/progression';
import { uniformSteps } from '@/domain/loadSteps';
import type { SetLog } from '@/domain/types';

const assistance = uniformSteps(5, 50, 5);
const range = { min: 6, max: 8 };
const pullup = (
  assistKg: number,
  reps: number,
  difficulty: SetLog['difficulty'] = 'ok',
): SetLog => ({
  exerciseId: 'trainerr:assisted-pullup',
  loadKg: assistKg,
  reps,
  difficulty,
});

describe('assisted exercises', () => {
  it('turn the assistance into the real load lifted', () => {
    const scale = assistedScale(assistance, 75);
    expect(scale.toReal(25)).toBe(50);
    expect(scale.toAssistance(50)).toBe(25);
    expect(scale.toReal(90)).toBe(0);
    // No help at all is the heaviest real load.
    expect(scale.realSteps.at(-1)).toBe(75);
    expect(scale.realSteps[0]).toBe(25);
  });

  it('propose less assistance when the set was above the range', () => {
    const scale = assistedScale(assistance, 75);
    const set = pullup(25, 9);
    const p = nextSetProposal({
      set: { ...set, loadKg: scale.toReal(set.loadKg) },
      range,
      steps: scale.realSteps,
      isLastSet: false,
    });
    expect(p.action).toBe('increase');
    expect(scale.toAssistance(p.loadKg)).toBe(20);
  });

  it('propose more assistance after a failed set', () => {
    const scale = assistedScale(assistance, 75);
    const p = nextSetProposal({
      set: { ...pullup(25, 4, 'fail'), loadKg: scale.toReal(25) },
      range,
      steps: scale.realSteps,
      isLastSet: false,
    });
    expect(p.action).toBe('decrease');
    expect(scale.toAssistance(p.loadKg)).toBe(30);
  });

  it('lower the help at the next session when every set reached the top of the range', () => {
    const scale = assistedScale(assistance, 75);
    // 65 → 70 kg real: a normal step, not a missing one.
    const sets = [pullup(10, 8), pullup(10, 8), pullup(10, 8)].map((s) => ({
      ...s,
      loadKg: scale.toReal(s.loadKg),
    }));
    const p = nextSessionProposal({ history: [sets], range, steps: scale.realSteps });
    expect(p && scale.toAssistance(p.loadKg)).toBe(5);
  });

  it('never propose more help after an easy set within the range (property)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...assistance),
        fc.integer({ min: 60, max: 110 }),
        fc.integer({ min: range.min, max: 15 }),
        (assist, weight, reps) => {
          const scale = assistedScale(assistance, weight);
          const p = nextSetProposal({
            set: { ...pullup(assist, reps, 'easy'), loadKg: scale.toReal(assist) },
            range,
            steps: scale.realSteps,
            isLastSet: false,
          });
          return scale.toAssistance(p.loadKg) <= assist;
        },
      ),
    );
  });

  it('use the body weight of the day of each session', () => {
    const weighings = [
      { date: '2026-10-01', weightKg: 80 },
      { date: '2026-10-20', weightKg: 78 },
      { date: '2026-10-21' },
    ];
    expect(bodyWeightOn('2026-09-15', weighings)).toBe(80);
    expect(bodyWeightOn('2026-10-10', weighings)).toBe(80);
    expect(bodyWeightOn('2026-10-25', weighings)).toBe(78);
    expect(bodyWeightOn('2026-10-25', [])).toBeUndefined();

    const sessions = [
      {
        id: 'a',
        date: '2026-10-10',
        templateId: 'pullA',
        sets: [pullup(30, 8), { ...pullup(0, 10), exerciseId: 'Curl', loadKg: 12 }],
      },
      { id: 'b', date: '2026-10-25', templateId: 'pullB', sets: [pullup(30, 8)] },
    ];
    const real = withRealLoads(
      sessions,
      (id) => id === 'trainerr:assisted-pullup',
      (date) => bodyWeightOn(date, weighings) ?? 75,
    );
    expect(real.map((s) => s.sets.map((set) => set.loadKg))).toEqual([[50, 12], [48]]);
  });
});
