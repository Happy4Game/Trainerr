import type { PlannedSession } from './planning';
import type { IsoDate, SessionLog } from './types';

export type DayStatus = 'done' | 'today' | 'planned' | 'missed' | 'rest';

export interface DayView {
  readonly date: IsoDate;
  readonly status: DayStatus;
  readonly session?: PlannedSession;
  /** What was really done that day, which may differ from the plan. */
  readonly doneTemplateId?: string;
}

/**
 * The week as the planning screen shows it: what is done, what is next.
 * A finished session wins over the plan, even on a day planned for rest.
 */
export function weekOverview(input: {
  days: readonly { date: IsoDate; session?: PlannedSession | undefined }[];
  done: readonly SessionLog[];
  today: IsoDate;
}): { days: DayView[]; doneCount: number; next?: PlannedSession } {
  const days = input.days.map((day): DayView => {
    const log = input.done.find((s) => s.date === day.date);
    const base = { date: day.date, ...(day.session ? { session: day.session } : {}) };
    if (log) return { ...base, status: 'done', doneTemplateId: log.templateId };
    if (!day.session) return { ...base, status: 'rest' };
    if (day.date === input.today) return { ...base, status: 'today' };
    return { ...base, status: day.date > input.today ? 'planned' : 'missed' };
  });
  const next = days.find((d) => d.status === 'today' || d.status === 'planned')?.session;
  return {
    days,
    doneCount: days.filter((d) => d.status === 'done').length,
    ...(next ? { next } : {}),
  };
}
