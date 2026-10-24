import { describe, expect, it } from 'vitest';
import { handleDiscomfort, type DiscomfortZone } from '@/domain/advice';
import {
  alternativesFor,
  completeExercise,
  markBusy,
  nextStep,
  startNow,
  startQueue,
} from '@/domain/busyMachine';
import { comebackSetsPerExercise, comebackStartLoad, type PauseLength } from '@/domain/comeback';
import { countsForStrength } from '@/domain/oneRepMax';
import { nextSessionProposal, nextSetProposal, repRangeFor } from '@/domain/progression';
import type { Difficulty, Exercise, SetLog } from '@/domain/types';
import golden from '../fixtures/golden/october-2026.json';
import { dumbbellSteps, ex, legPressSteps, stackSteps } from '../fixtures/exercises';

type ExerciseKey = keyof typeof ex;
type RawSet = { loadKg: number; reps: number; difficulty: string } & Partial<SetLog>;

const stepsByName = { dumbbell: dumbbellSteps, stack: stackSteps, legPress: legPressSteps };
const exercise = (key: string): Exercise => ex[key as ExerciseKey];
const steps = (name: string | undefined) => stepsByName[name as keyof typeof stepsByName];
const toSet = (key: string, raw: RawSet): SetLog => ({
  ...raw,
  exerciseId: exercise(key).id,
  difficulty: raw.difficulty as Difficulty,
});

// Each case is read from the frozen JSON file; the test name is the real situation.
describe('golden cases — real sessions of 15–24 October 2026', () => {
  for (const c of golden.cases) {
    it(`${c.situation} → ${c.expected}`, () => {
      switch (c.kind) {
        case 'comebackStart': {
          const loadKg = comebackStartLoad({
            referenceKg: c.referenceKg as number,
            pause: c.pause as PauseLength,
            steps: steps(c.steps),
          });
          expect({ loadKg }).toEqual(c.then);
          break;
        }
        case 'nextSet': {
          const e = exercise(c.exercise as string);
          const proposal = nextSetProposal({
            set: toSet(c.exercise as string, c.set as RawSet),
            range: repRangeFor(e),
            steps: steps(c.steps),
            isLastSet: false,
          });
          const { targetSets, ...rest } = c.then as { targetSets?: number };
          expect(proposal).toMatchObject(rest);
          if (targetSets !== undefined && c.comeback) {
            expect(
              comebackSetsPerExercise(c.comeback.pause as PauseLength, c.comeback.daysSinceRestart),
            ).toBe(targetSets);
          }
          break;
        }
        case 'nextSession': {
          const e = exercise(c.exercise as string);
          const proposal = nextSessionProposal({
            history: (c.history as RawSet[][]).map((sets) =>
              sets.map((s) => toSet(c.exercise as string, s)),
            ),
            range: repRangeFor(e),
            steps: steps(c.steps),
          });
          expect(proposal).toMatchObject(c.then);
          break;
        }
        case 'strength': {
          const set = toSet(c.exercise as string, c.set as RawSet);
          expect({ countsForStrength: countsForStrength(set) }).toEqual(c.then);
          break;
        }
        case 'discomfort': {
          const response = handleDiscomfort({
            zone: c.zone as DiscomfortZone,
            redFlags: [],
            remaining: (c.remaining as string[]).map(exercise),
            reportsThisWeek: 1,
          });
          expect(response).toMatchObject(c.then);
          expect(response.stopSession).toBe(false);
          break;
        }
        case 'busyMachine': {
          const session = (c.session as string[]).map(exercise);
          let queue = startQueue(session.map((e) => e.id));
          for (const key of c.doneBefore as string[]) {
            queue = completeExercise(queue, exercise(key).id);
          }
          const busy = exercise(c.busy as string);
          queue = markBusy(queue, busy.id);
          const remaining = session.filter((e) => queue.pending.includes(e.id));
          const [first] = alternativesFor(busy, {
            remaining,
            otherFavorites: [],
            loadFor: () => undefined,
          });
          const then = c.then as { firstAlternative: string; afterAlternative: string };
          expect(first?.exercise.id).toBe(then.firstAlternative);

          queue = startNow(queue, then.firstAlternative);
          expect(nextStep(queue)).toEqual({ kind: 'exercise', exerciseId: then.firstAlternative });
          queue = completeExercise(queue, then.firstAlternative);
          expect(nextStep(queue)).toEqual({ kind: 'askIfFree', exerciseId: then.afterAlternative });
          break;
        }
        default:
          throw new Error(`Unknown golden case kind: ${c.kind}`);
      }
    });
  }

  it('covers the 10 cases of the spec', () => {
    expect(golden.cases).toHaveLength(10);
  });
});
