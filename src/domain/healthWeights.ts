import type { IsoDate } from './types';

/** A weighing as Health Connect gives it (android/.../HealthWeightPlugin.kt). */
export interface HealthWeighing {
  /** Local day of the weighing. */
  readonly date: IsoDate;
  /** Exact time, ISO instant: the last weighing of a day wins. */
  readonly time: string;
  readonly kg: number;
  /** Package of the app that wrote it (scale app, Samsung Health…). */
  readonly source?: string;
}

/**
 * What to copy into Trainerr: one weighing per day (the last one), rounded to
 * 100 g, plausible values only, and never a day already weighed in the app.
 */
export function weighingsToAdd(
  found: readonly HealthWeighing[],
  knownDates: ReadonlySet<IsoDate>,
): { date: IsoDate; weightKg: number }[] {
  const byDay = new Map<IsoDate, HealthWeighing>();
  for (const weighing of [...found].sort((a, b) => a.time.localeCompare(b.time))) {
    if (weighing.kg < 20 || weighing.kg > 400 || knownDates.has(weighing.date)) continue;
    byDay.set(weighing.date, weighing);
  }
  return [...byDay.values()]
    .map((w) => ({ date: w.date, weightKg: Math.round(w.kg * 10) / 10 }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
