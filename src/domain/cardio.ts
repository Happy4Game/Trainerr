import { addDays, startOfWeek } from './dates';
import type { MuscleId } from './muscles';
import type { Goal } from './sessionBuilder';
import type { IsoDate, PplGroup } from './types';

/**
 * Cardio machines of the gym, done before or after the weights. Free drawings
 * of these machines do not exist in Everkinetic: each one shows an icon and
 * the muscles it works on the body map.
 */
export type CardioId =
  | 'treadmill'
  | 'outdoorRun'
  | 'bike'
  | 'recumbentBike'
  | 'spinBike'
  | 'elliptical'
  | 'rower'
  | 'stairClimber'
  | 'jumpRope';

/** What can be typed in, besides the minutes: what the machine shows. */
export type CardioField =
  'distance' | 'speed' | 'incline' | 'level' | 'cadence' | 'heartRate' | 'calories';

export type CardioIcon = 'footprints' | 'bike' | 'activity' | 'waves' | 'mountain';
export type CardioPosition = 'before' | 'after';
/** Talk test (CDC): moderate, you can talk but not sing; vigorous, only a few words. */
export type CardioEffort = 'light' | 'moderate' | 'vigorous';
export const CARDIO_EFFORTS: readonly CardioEffort[] = ['light', 'moderate', 'vigorous'];

export interface CardioMachine {
  readonly id: CardioId;
  readonly icon: CardioIcon;
  readonly primaryMuscles: readonly MuscleId[];
  readonly secondaryMuscles: readonly MuscleId[];
  readonly fields: readonly CardioField[];
  /** Hard on the legs: better kept away from a legs day when strength matters. */
  readonly legHeavy: boolean;
}

const LEGS: readonly MuscleId[] = ['quads', 'glutes', 'hamstrings', 'calves'];

export const CARDIO_MACHINES: readonly CardioMachine[] = [
  {
    id: 'treadmill',
    icon: 'footprints',
    primaryMuscles: LEGS,
    secondaryMuscles: ['abs'],
    fields: ['distance', 'speed', 'incline', 'heartRate', 'calories'],
    legHeavy: true,
  },
  {
    id: 'outdoorRun',
    icon: 'footprints',
    primaryMuscles: LEGS,
    secondaryMuscles: ['abs'],
    fields: ['distance', 'heartRate', 'calories'],
    legHeavy: true,
  },
  {
    id: 'bike',
    icon: 'bike',
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['hamstrings', 'calves'],
    fields: ['distance', 'level', 'cadence', 'heartRate', 'calories'],
    legHeavy: true,
  },
  {
    id: 'recumbentBike',
    icon: 'bike',
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['hamstrings'],
    fields: ['distance', 'level', 'cadence', 'heartRate', 'calories'],
    legHeavy: true,
  },
  {
    id: 'spinBike',
    icon: 'bike',
    primaryMuscles: ['quads', 'glutes'],
    secondaryMuscles: ['hamstrings', 'calves', 'abs'],
    fields: ['level', 'cadence', 'heartRate', 'calories'],
    legHeavy: true,
  },
  {
    id: 'elliptical',
    icon: 'activity',
    primaryMuscles: ['quads', 'glutes', 'hamstrings'],
    secondaryMuscles: ['calves', 'chest', 'lats', 'triceps', 'biceps'],
    fields: ['distance', 'level', 'incline', 'cadence', 'heartRate', 'calories'],
    legHeavy: false,
  },
  {
    id: 'rower',
    icon: 'waves',
    primaryMuscles: ['quads', 'glutes', 'lats', 'upperBack'],
    secondaryMuscles: ['hamstrings', 'biceps', 'rearDelts', 'lowerBack', 'abs'],
    fields: ['distance', 'level', 'cadence', 'heartRate', 'calories'],
    legHeavy: false,
  },
  {
    id: 'stairClimber',
    icon: 'mountain',
    primaryMuscles: ['glutes', 'quads'],
    secondaryMuscles: ['hamstrings', 'calves'],
    fields: ['level', 'heartRate', 'calories'],
    legHeavy: true,
  },
  {
    id: 'jumpRope',
    icon: 'activity',
    primaryMuscles: ['calves', 'quads'],
    secondaryMuscles: ['glutes', 'frontDelts', 'forearms'],
    fields: ['heartRate', 'calories'],
    legHeavy: true,
  },
];

export function cardioMachine(id: string): CardioMachine | undefined {
  return CARDIO_MACHINES.find((m) => m.id === id);
}

/** The cardio planned with a session: kept in its plan, chosen before starting. */
export interface CardioPlan {
  readonly cardioId: CardioId;
  readonly minutes: number;
  readonly position: CardioPosition;
}

export interface CardioEntry {
  readonly cardioId: CardioId;
  readonly minutes: number;
  readonly distanceKm?: number;
  readonly speedKmh?: number;
  readonly inclinePct?: number;
  readonly level?: number;
  /** Steps, turns or strokes per minute. */
  readonly cadence?: number;
  readonly avgHr?: number;
  readonly calories?: number;
  readonly effort?: CardioEffort;
  readonly position?: CardioPosition;
  readonly note?: string;
}

export interface DatedCardio extends CardioEntry {
  readonly id: string;
  readonly date: IsoDate;
  readonly sessionId?: string;
}

/** Plausible bounds, to catch a typo (a speed of 120) before it is saved. */
const BOUNDS: Readonly<Record<string, readonly [number, number]>> = {
  minutes: [1, 600],
  distanceKm: [0.01, 300],
  speedKmh: [0.5, 60],
  inclinePct: [-5, 40],
  level: [0, 50],
  cadence: [1, 300],
  avgHr: [30, 230],
  calories: [1, 5000],
};

/** Fields out of bounds; empty when the entry can be saved. */
export function invalidCardioFields(entry: CardioEntry): string[] {
  return Object.entries(BOUNDS)
    .filter(([key, [min, max]]) => {
      const value = entry[key as keyof CardioEntry];
      if (value === undefined) return key === 'minutes';
      return typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max;
    })
    .map(([key]) => key);
}

/** Average speed: from the distance and time, or the speed typed in. */
export function averageSpeedKmh(entry: CardioEntry): number | undefined {
  if (entry.distanceKm && entry.minutes > 0)
    return Math.round((entry.distanceKm / entry.minutes) * 60 * 10) / 10;
  return entry.speedKmh;
}

/** Running pace in seconds per km; the rower counts per 500 m. */
export function paceSeconds(entry: CardioEntry): number | undefined {
  if (!entry.distanceKm || entry.minutes <= 0) return undefined;
  const perKm = (entry.minutes * 60) / entry.distanceKm;
  return Math.round(entry.cardioId === 'rower' ? perKm / 2 : perKm);
}

/**
 * WHO 2020: 150 to 300 min of moderate activity a week, or 75 to 150 min of
 * vigorous activity, or an equivalent mix: a vigorous minute counts double.
 */
export const WHO_WEEKLY_MINUTES = { min: 150, max: 300 } as const;

export function moderateMinutes(entry: Pick<CardioEntry, 'minutes' | 'effort'>): number {
  if (entry.effort === 'light') return 0;
  return entry.effort === 'vigorous' ? entry.minutes * 2 : entry.minutes;
}

/** Cardio of the week of `today` (Monday to Sunday), in WHO moderate minutes. */
export function weeklyCardio(
  entries: readonly Pick<DatedCardio, 'date' | 'minutes' | 'effort'>[],
  today: IsoDate,
): { minutes: number; moderate: number; reached: boolean } {
  const from = startOfWeek(today);
  const to = addDays(from, 6);
  const week = entries.filter((e) => e.date >= from && e.date <= to);
  const moderate = week.reduce((sum, e) => sum + moderateMinutes(e), 0);
  return {
    minutes: week.reduce((sum, e) => sum + e.minutes, 0),
    moderate,
    reached: moderate >= WHO_WEEKLY_MINUTES.min,
  };
}

/**
 * Before or after the weights?
 * - Eddens et al. 2018 (Sports Med 48:177-188): weights first gave more
 *   lower-body strength; no difference for muscle size, endurance or body fat.
 * - Schumann et al. 2022 (Sports Med 52:601-612): cardio does not hold back
 *   muscle size or maximal strength; explosive strength suffers when both are
 *   in the same session, not with 3 h or more between them.
 */
export type CardioAdviceReason = 'lowerStrength' | 'legsDay' | 'noDifference';

export function recommendedCardioPosition(
  goal: Goal,
  groups: readonly PplGroup[],
  machine?: CardioMachine,
): { position: CardioPosition | 'either'; reason: CardioAdviceReason } {
  if (goal === 'strength') return { position: 'after', reason: 'lowerStrength' };
  if (groups.includes('legs') && (machine?.legHeavy ?? true))
    return { position: 'after', reason: 'legsDay' };
  return { position: 'either', reason: 'noDifference' };
}
