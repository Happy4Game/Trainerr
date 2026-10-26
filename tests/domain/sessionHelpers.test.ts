import { describe, expect, it } from 'vitest';
import { startingProposal } from '@/domain/progression';
import { parseVoiceSet } from '@/domain/voiceInput';
import { warmupSet } from '@/domain/warmup';
import { dumbbellSteps, ex, stackSteps } from '../fixtures/exercises';

describe('warm-up set', () => {
  it('suggests about 55 % of the work load for 12–15 reps on the first exercise', () => {
    expect(
      warmupSet({ exercise: ex.pecFly, workLoadKg: 52, steps: stackSteps, isFirst: true }),
    ).toEqual({ loadKg: 32, reps: 15 });
  });

  it('is always suggested on heavy compounds', () => {
    expect(
      warmupSet({ exercise: ex.dbBench, workLoadKg: 18, steps: dumbbellSteps, isFirst: false }),
    ).toEqual({ loadKg: 10, reps: 12 });
  });

  it('is skipped on other exercises', () => {
    expect(
      warmupSet({ exercise: ex.pecFly, workLoadKg: 52, steps: stackSteps, isFirst: false }),
    ).toBeUndefined();
  });

  it('is skipped when no lighter step exists', () => {
    expect(
      warmupSet({ exercise: ex.dbBench, workLoadKg: 2, steps: dumbbellSteps, isFirst: true }),
    ).toBeUndefined();
  });
});

describe('starting load of an exercise', () => {
  const range = { min: 8, max: 10 };

  it('follows the last sessions when there is a history', () => {
    const history = [[{ exerciseId: 'x', loadKg: 16, reps: 10, difficulty: 'ok' as const }]];
    expect(startingProposal({ history, range, steps: dumbbellSteps })).toMatchObject({
      loadKg: 18,
      kind: 'progression',
    });
  });

  it('uses the pre-break reference in comeback mode', () => {
    expect(
      startingProposal({
        history: [],
        range,
        steps: dumbbellSteps,
        comeback: { referenceKg: 22, pause: 'overThreeMonths' },
      }),
    ).toEqual({ loadKg: 16, targetReps: 10, kind: 'comeback' });
  });

  it('starts from the usual load noted on the card, on a real step', () => {
    expect(
      startingProposal({
        history: [],
        range,
        steps: dumbbellSteps,
        usual: { loadKg: 21, reps: 9 },
      }),
    ).toEqual({ loadKg: 20, targetReps: 9, kind: 'usual' });
  });

  it('keeps the reps target inside the range from the usual load', () => {
    expect(
      startingProposal({
        history: [],
        range,
        steps: dumbbellSteps,
        usual: { loadKg: 20, reps: 15 },
      }).targetReps,
    ).toBe(10);
  });

  it('prefers the sessions done to the usual load', () => {
    const history = [[{ exerciseId: 'x', loadKg: 16, reps: 10, difficulty: 'ok' as const }]];
    expect(
      startingProposal({ history, range, steps: dumbbellSteps, usual: { loadKg: 30, reps: 8 } })
        .kind,
    ).toBe('progression');
  });

  it('starts with a light test set the first time', () => {
    expect(startingProposal({ history: [], range, steps: dumbbellSteps })).toEqual({
      loadKg: 2,
      targetReps: 10,
      kind: 'testSet',
    });
  });
});

describe('voice input', () => {
  it('reads "16 kilos, 10 reps, limite"', () => {
    expect(parseVoiceSet('16 kilos, 10 reps, limite')).toEqual({
      loadKg: 16,
      reps: 10,
      difficulty: 'hard',
    });
  });

  it('reads half reps and decimal loads', () => {
    expect(parseVoiceSet('22,5 kg 8 et demi répétitions facile')).toEqual({
      loadKg: 22.5,
      reps: 8.5,
      difficulty: 'easy',
    });
    expect(parseVoiceSet('52 kilos 12 fois correct')).toEqual({
      loadKg: 52,
      reps: 12,
      difficulty: 'ok',
    });
  });

  it('takes two bare numbers as load then reps', () => {
    expect(parseVoiceSet('18 10 échec')).toEqual({ loadKg: 18, reps: 10, difficulty: 'fail' });
  });

  it('understands English', () => {
    expect(parseVoiceSet('40 kilograms 9 reps easy')).toEqual({
      loadKg: 40,
      reps: 9,
      difficulty: 'easy',
    });
  });

  it('returns only what it understood', () => {
    expect(parseVoiceSet('12 reps')).toEqual({ reps: 12 });
    expect(parseVoiceSet('bonjour')).toEqual({});
  });
});
