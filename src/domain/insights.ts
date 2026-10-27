/**
 * Stats that answer a question of the lifter ("am I progressing on the bench?",
 * "which muscle is lagging?", "am I regular?") rather than raw numbers.
 * The questions are listed in docs/stats.md.
 */
import { addDays, daysBetween, startOfWeek } from './dates';
import type { MuscleId } from './muscles';
import { bestComparableSet, countsForStrength } from './oneRepMax';
import { personalRecords, strengthCurve, trainingDays, WEEKLY_SETS_TARGET } from './stats';
import { STAGNATION_SESSIONS } from './tracking';
import type { Exercise, IsoDate, PplGroup, SessionLog } from './types';

/** Time span of the trend sentence: "+7.5 kg in 6 weeks". */
export const TREND_WEEKS = 6;
/** A drop of the estimated 1RM larger than this share reads as a regression (to be validated). */
export const REGRESSION_RATIO = 0.05;

export type TrendVerdict = 'tooEarly' | 'progressing' | 'steady' | 'stalled' | 'regressing';

export interface ExerciseTrend {
  readonly exerciseId: string;
  readonly verdict: TrendVerdict;
  /** Sessions with a comparable set on this exercise. */
  readonly sessions: number;
  /** Change of the estimated 1RM over the window, in kg (rounded to 0.5). */
  readonly changeKg: number;
  /** Length of the window, in whole weeks (at least 1). */
  readonly weeks: number;
  /** Sessions done since the best estimated 1RM. */
  readonly sessionsSinceBest: number;
  readonly lastDate: IsoDate;
  /** Per session: best estimated 1RM, and the heaviest complete work set. */
  readonly points: readonly {
    readonly date: IsoDate;
    readonly oneRepMax: number;
    readonly bestSet: { readonly loadKg: number; readonly reps: number };
  }[];
}

const roundHalf = (kg: number) => Math.round(kg * 2) / 2;

/**
 * Where an exercise is going: the change of the estimated 1RM (Epley) over the
 * last 6 weeks, and a stall when the last 3 sessions did not beat the best.
 */
export function exerciseTrend(
  sessions: readonly SessionLog[],
  exerciseId: string,
  today: IsoDate,
): ExerciseTrend | undefined {
  const curve = strengthCurve(sessions, exerciseId);
  const last = curve.at(-1);
  if (!last) return undefined;

  const points = curve.map((point) => {
    const day = sessions.filter((s) => s.date === point.date);
    const sets = day.flatMap((s) =>
      s.sets.filter((set) => set.exerciseId === exerciseId && countsForStrength(set)),
    );
    const heaviest = sets.reduce((best, set) =>
      set.loadKg > best.loadKg || (set.loadKg === best.loadKg && set.reps > best.reps) ? set : best,
    );
    return {
      date: point.date,
      oneRepMax: point.oneRepMax,
      bestSet: { loadKg: heaviest.loadKg, reps: heaviest.reps },
    };
  });

  const windowStart = addDays(today, -TREND_WEEKS * 7);
  const inWindow = curve.filter((p) => p.date >= windowStart);
  // Fewer than 2 sessions in the window: compare with the last one before it.
  const before = curve.filter((p) => p.date < windowStart).at(-1);
  const baseline = inWindow.length >= 2 ? inWindow[0] : (before ?? curve[0]);
  // Equalling the best is not beating it: the first time it was reached counts.
  const bestIndex = curve.reduce(
    (best, p, i) => (p.oneRepMax > (curve[best]?.oneRepMax ?? 0) ? i : best),
    0,
  );
  const sessionsSinceBest = curve.length - 1 - bestIndex;
  const change = baseline ? last.oneRepMax - baseline.oneRepMax : 0;
  const weeks = baseline ? Math.max(1, Math.round(daysBetween(baseline.date, last.date) / 7)) : 1;

  let verdict: TrendVerdict;
  if (curve.length < 2 || !baseline || baseline === last) verdict = 'tooEarly';
  else if (sessionsSinceBest >= STAGNATION_SESSIONS) verdict = 'stalled';
  else if (change < -baseline.oneRepMax * REGRESSION_RATIO) verdict = 'regressing';
  else if (roundHalf(change) > 0) verdict = 'progressing';
  else verdict = 'steady';

  return {
    exerciseId,
    verdict,
    sessions: curve.length,
    changeKg: roundHalf(change),
    weeks,
    sessionsSinceBest,
    lastDate: last.date,
    points,
  };
}

/** Every exercise done, most recent first: what moves, what stalls. */
export function allTrends(sessions: readonly SessionLog[], today: IsoDate): ExerciseTrend[] {
  const ids = [...new Set(sessions.flatMap((s) => s.sets.map((set) => set.exerciseId)))];
  return ids
    .map((id) => exerciseTrend(sessions, id, today))
    .filter((trend): trend is ExerciseTrend => trend !== undefined)
    .sort((a, b) => b.lastDate.localeCompare(a.lastDate) || b.sessions - a.sessions);
}

/**
 * Big muscles whose weekly volume is worth watching. Small ones (forearms,
 * adductors…) get enough work from the compounds and would only add noise.
 */
export const KEY_MUSCLES: readonly MuscleId[] = [
  'chest',
  'lats',
  'upperBack',
  'sideDelts',
  'rearDelts',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
];

export interface WeeklyVolume {
  /** Average work sets per week for each primary muscle (a compound counts for each). */
  readonly perMuscle: Partial<Record<MuscleId, number>>;
  /** Complete weeks averaged; 0 = only the week in progress is known. */
  readonly weeks: number;
  /** Key muscles under 10 sets per week (Schoenfeld et al. 2017), least worked first. */
  readonly lagging: readonly MuscleId[];
}

/**
 * Sets per muscle and per week, averaged over the last 4 complete weeks since
 * the first session (the week in progress is not finished, it would read low).
 */
export function weeklyVolume(
  sessions: readonly SessionLog[],
  exercises: ReadonlyMap<string, Exercise>,
  today: IsoDate,
  maxWeeks = 4,
): WeeklyVolume {
  const thisWeek = startOfWeek(today);
  const first = trainingDays(sessions)[0];
  if (first === undefined) return { perMuscle: {}, weeks: 0, lagging: [] };
  const firstWeek = startOfWeek(first);
  const complete = Math.min(maxWeeks, Math.max(0, daysBetween(firstWeek, thisWeek) / 7));
  const from = complete > 0 ? addDays(thisWeek, -7 * complete) : thisWeek;
  const to = complete > 0 ? thisWeek : addDays(thisWeek, 7);

  const totals: Partial<Record<MuscleId, number>> = {};
  for (const session of sessions) {
    if (session.date < from || session.date >= to) continue;
    for (const set of session.sets) {
      if (set.warmup) continue;
      for (const muscle of exercises.get(set.exerciseId)?.primaryMuscles ?? []) {
        totals[muscle] = (totals[muscle] ?? 0) + 1;
      }
    }
  }
  const divisor = Math.max(1, complete);
  const perMuscle: Partial<Record<MuscleId, number>> = {};
  for (const [muscle, sets] of Object.entries(totals) as [MuscleId, number][]) {
    perMuscle[muscle] = Math.round((sets / divisor) * 10) / 10;
  }
  const lagging = KEY_MUSCLES.filter((m) => (perMuscle[m] ?? 0) < WEEKLY_SETS_TARGET.min).sort(
    (a, b) => (perMuscle[a] ?? 0) - (perMuscle[b] ?? 0),
  );
  return { perMuscle, weeks: complete, lagging };
}

/** Push dominates pull, or the reverse, beyond this ratio (to be validated). */
export const BALANCE_RATIO = 1.3;
/** Legs below this share of the sets: the lower body is left behind (to be validated). */
export const MIN_LEGS_SHARE = 0.25;

export interface TrainingBalance {
  readonly sets: Readonly<Record<PplGroup, number>>;
  readonly pushPull: 'balanced' | 'pushDominant' | 'pullDominant' | 'unknown';
  /** Share of the upper + lower sets done for the legs (0 to 1). */
  readonly legsShare: number;
  readonly upperLower: 'balanced' | 'upperDominant' | 'lowerDominant' | 'unknown';
}

/**
 * Work sets by movement (push, pull, legs) over the last 4 weeks: every set
 * counts once, from the group of its exercise.
 */
export function trainingBalance(
  sessions: readonly SessionLog[],
  exercises: ReadonlyMap<string, Exercise>,
  today: IsoDate,
  days = 28,
): TrainingBalance {
  const since = addDays(today, -days + 1);
  const sets: Record<PplGroup, number> = { push: 0, pull: 0, legs: 0, core: 0 };
  for (const session of sessions) {
    if (session.date < since || session.date > today) continue;
    for (const set of session.sets) {
      const group = exercises.get(set.exerciseId)?.group;
      if (!set.warmup && group) sets[group] += 1;
    }
  }
  const upper = sets.push + sets.pull;
  const total = upper + sets.legs;
  const legsShare = total > 0 ? sets.legs / total : 0;
  // Legs take about a third in a push / pull / legs split, half in upper / lower.
  const pushPull =
    upper === 0
      ? 'unknown'
      : sets.push > sets.pull * BALANCE_RATIO
        ? 'pushDominant'
        : sets.pull > sets.push * BALANCE_RATIO
          ? 'pullDominant'
          : 'balanced';
  const upperLower =
    total === 0
      ? 'unknown'
      : legsShare < MIN_LEGS_SHARE
        ? 'upperDominant'
        : legsShare > 1 - MIN_LEGS_SHARE
          ? 'lowerDominant'
          : 'balanced';
  return { sets, pushPull, legsShare, upperLower };
}

export interface Regularity {
  /** Average sessions per week over the last 8 weeks (or since the first one). */
  readonly perWeek: number;
  readonly weeksCounted: number;
  readonly daysSinceLast: number | undefined;
  /** Training days in a row of weeks: this one and the previous ones, Monday first. */
  readonly calendar: readonly (readonly { date: IsoDate; trained: boolean; future: boolean }[])[];
}

export function regularity(
  sessions: readonly SessionLog[],
  today: IsoDate,
  weeks = 12,
): Regularity {
  const days = trainingDays(sessions);
  const trained = new Set(days);
  const thisWeek = startOfWeek(today);
  const first = days[0];
  const last = days.filter((d) => d <= today).at(-1);
  const calendar = Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = addDays(addDays(thisWeek, (w - weeks + 1) * 7), d);
      return { date, trained: trained.has(date), future: date > today };
    }),
  );
  if (!first) return { perWeek: 0, weeksCounted: 0, daysSinceLast: undefined, calendar };
  // The week in progress counts as a fraction of a week, not a full one.
  const span = Math.min(56, daysBetween(first, today) + 1);
  const since = addDays(today, -span + 1);
  const count = sessions.filter((s) => s.date >= since && s.date <= today).length;
  const weeksCounted = Math.max(1, span / 7);
  return {
    perWeek: Math.round((count / weeksCounted) * 10) / 10,
    weeksCounted: Math.round(weeksCounted),
    daysSinceLast: last ? daysBetween(last, today) : undefined,
    calendar,
  };
}

export interface RecentRecord {
  readonly exerciseId: string;
  readonly date: IsoDate;
  readonly loadKg: number;
  readonly reps: number;
  readonly oneRepMax: number;
}

/**
 * Records set in the last 30 days, newest first. A first session on an
 * exercise is not a record: there was nothing to beat.
 */
export function recentRecords(
  sessions: readonly SessionLog[],
  today: IsoDate,
  days = 30,
): RecentRecord[] {
  const since = addDays(today, -days + 1);
  const result: RecentRecord[] = [];
  for (const [exerciseId, record] of personalRecords(sessions)) {
    const date =
      record.bestLoad.date > record.bestOneRepMax.date
        ? record.bestLoad.date
        : record.bestOneRepMax.date;
    if (date < since) continue;
    const before = sessions.filter((s) => s.date < date);
    const hadHistory = before.some((s) => s.sets.some((set) => set.exerciseId === exerciseId));
    if (!hadHistory) continue;
    const best = bestComparableSet(
      sessions
        .filter((s) => s.date === date)
        .flatMap((s) => s.sets.filter((set) => set.exerciseId === exerciseId)),
    );
    result.push({
      exerciseId,
      date,
      loadKg: record.bestLoad.loadKg,
      reps: record.bestLoad.reps,
      oneRepMax: best?.oneRepMax ?? record.bestOneRepMax.value,
    });
  }
  return result.sort((a, b) => b.date.localeCompare(a.date));
}

export interface BodyWeightTrend {
  readonly points: readonly { readonly date: IsoDate; readonly weightKg: number }[];
  readonly latestKg: number;
  /** Change per week over the last 4 weeks (least squares), undefined with too few weighings. */
  readonly perWeekKg: number | undefined;
}

/** Body weight over the last 3 months, and how fast it moves. */
export function bodyWeightTrend(
  weighings: readonly { readonly date: IsoDate; readonly weightKg?: number }[],
  today: IsoDate,
): BodyWeightTrend | undefined {
  const known = weighings
    .filter((w): w is { date: IsoDate; weightKg: number } => w.weightKg !== undefined)
    .filter((w) => w.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const latest = known.at(-1);
  if (!latest) return undefined;
  const points = known
    .filter((w) => w.date >= addDays(today, -90))
    .map((w) => ({ date: w.date, weightKg: w.weightKg }));
  const recent = known.filter((w) => w.date >= addDays(today, -28));
  const firstRecent = recent[0];
  let perWeekKg: number | undefined;
  // At least 2 weighings a week apart: a single day says nothing about a trend.
  if (recent.length >= 2 && firstRecent && daysBetween(firstRecent.date, latest.date) >= 7) {
    const xs = recent.map((w) => daysBetween(firstRecent.date, w.date));
    const ys = recent.map((w) => w.weightKg);
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const my = ys.reduce((a, b) => a + b, 0) / ys.length;
    const num = xs.reduce((sum, x, i) => sum + (x - mx) * ((ys[i] ?? my) - my), 0);
    const den = xs.reduce((sum, x) => sum + (x - mx) ** 2, 0);
    perWeekKg = den > 0 ? Math.round((num / den) * 7 * 10) / 10 : undefined;
  }
  return { points, latestKg: latest.weightKg, perWeekKg };
}
