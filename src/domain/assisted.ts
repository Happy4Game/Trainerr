import { floorStep, normalizeSteps, roundKg, uniformSteps, type LoadSteps } from './loadSteps';
import type { IsoDate, SessionLog, SetLog } from './types';

/**
 * Assisted pull-ups and dips are counted backwards: the machine takes some
 * of the body weight, so the real load lifted is body weight − assistance,
 * and less assistance means progress. The progression rules run on the real
 * load and give back the assistance to set on the machine.
 */

/** Used until the user enters their weight (shown as an estimate). */
export const DEFAULT_BODY_WEIGHT_KG = 75;

/** Usual help plates of an assisted machine, until the user enters the real ones. */
export const DEFAULT_ASSISTANCE_STEPS: LoadSteps = uniformSteps(5, 60, 5);

/**
 * First time on the machine: about half the body weight lifted, a safe start
 * for most people (to be validated by a coach). Lighter if the machine cannot
 * help that much.
 */
export const FIRST_TIME_REAL_SHARE = 0.5;

export function firstAssistedRealKg(scale: AssistedScale, bodyWeightKg: number): number {
  return floorStep(scale.realSteps, bodyWeightKg * FIRST_TIME_REAL_SHARE);
}

export interface AssistedScale {
  /** Real load lifted with this assistance (never below 0). */
  toReal(assistanceKg: number): number;
  /** Assistance to set for a real load (0 = no help, full body weight). */
  toAssistance(realKg: number): number;
  /** The assistance steps of the machine as real loads, lightest first, with no help at the top. */
  readonly realSteps: LoadSteps;
}

export function assistedScale(assistanceSteps: LoadSteps, bodyWeightKg: number): AssistedScale {
  const toReal = (a: number) => Math.max(0, roundKg(bodyWeightKg - a));
  return {
    toReal,
    toAssistance: (real: number) => Math.max(0, roundKg(bodyWeightKg - real)),
    realSteps: normalizeSteps([...assistanceSteps.map(toReal), bodyWeightKg]),
  };
}

/** Body weight on a date: the last one weighed before, else the first one after. */
export function bodyWeightOn(
  date: IsoDate,
  weighings: readonly { readonly date: IsoDate; readonly weightKg?: number }[],
): number | undefined {
  const known = weighings
    .filter((w): w is { date: IsoDate; weightKg: number } => w.weightKg !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date));
  return (known.findLast((w) => w.date <= date) ?? known[0])?.weightKg;
}

/**
 * Sessions with the real load on assisted sets, for charts and records: the
 * body weight of the day of each session is used.
 */
export function withRealLoads<S extends SessionLog>(
  sessions: readonly S[],
  isAssisted: (exerciseId: string) => boolean,
  bodyWeightFor: (date: IsoDate) => number,
): S[] {
  return sessions.map((session) => {
    if (!session.sets.some((set) => isAssisted(set.exerciseId))) return session;
    const weight = bodyWeightFor(session.date);
    const sets = session.sets.map((set): SetLog =>
      isAssisted(set.exerciseId)
        ? { ...set, loadKg: Math.max(0, roundKg(weight - set.loadKg)) }
        : set,
    );
    return { ...session, sets };
  });
}
