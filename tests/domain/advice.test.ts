import { describe, expect, it } from 'vitest';
import { handleDiscomfort, handleSoreness } from '@/domain/advice';
import { ex } from '../fixtures/exercises';

const remainingPush = [ex.pecFly, ex.lateralRaise, ex.tricepsPushdown];

describe('discomfort reported during a session', () => {
  it('front of the shoulder: removes the remaining push exercises', () => {
    expect(
      handleDiscomfort({
        zone: 'frontShoulder',
        redFlags: [],
        remaining: [...remainingPush, ex.curl],
        reportsThisWeek: 1,
      }),
    ).toEqual({
      stopSession: false,
      emergency: false,
      removeExerciseIds: ['pec-fly', 'lateral-raise', 'triceps-pushdown'],
      advice: ['heatAndRest', 'warningSigns'],
    });
  });

  it('same discomfort twice in the week: one shoulder exercise per Push, see a physio', () => {
    expect(
      handleDiscomfort({
        zone: 'frontShoulder',
        redFlags: [],
        remaining: remainingPush,
        reportsThisWeek: 2,
      }),
    ).toMatchObject({
      advice: ['heatAndRest', 'warningSigns', 'seePhysioIfPersists'],
      shoulderExercisesPerPush: 1,
    });
  });

  it('knee: removes the exercises loading the knee', () => {
    expect(
      handleDiscomfort({
        zone: 'knee',
        redFlags: [],
        remaining: [ex.legExtension, ex.legCurl, ex.hipAbduction],
        reportsThisWeek: 1,
      }).removeExerciseIds,
    ).toEqual(['leg-extension', 'leg-curl']);
  });

  it('warning signs stop the session', () => {
    expect(
      handleDiscomfort({
        zone: 'elbow',
        redFlags: ['tingling'],
        remaining: remainingPush,
        reportsThisWeek: 1,
      }),
    ).toEqual({
      stopSession: true,
      emergency: false,
      removeExerciseIds: ['pec-fly', 'lateral-raise', 'triceps-pushdown'],
      advice: ['stopAndConsult'],
    });
  });

  it('chest pain with breathlessness: call 15', () => {
    expect(
      handleDiscomfort({
        zone: 'other',
        redFlags: ['chestPainBreathless'],
        remaining: [],
        reportsThisWeek: 1,
      }),
    ).toMatchObject({ stopSession: true, emergency: true, advice: ['callEmergency'] });
  });
});

describe('soreness', () => {
  it('explains soreness vs pain and keeps the plan', () => {
    expect(handleSoreness()).toEqual({ keepPlan: true, advice: ['sorenessVsPain'] });
  });
});
