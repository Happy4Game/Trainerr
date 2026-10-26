import type { PlannedSession, PlanSlot } from './planning';
import type { IsoDate, SessionLog } from './types';

export type DayStatus = 'done' | 'today' | 'planned' | 'missed' | 'rest';

export interface DayView {
  readonly date: IsoDate;
  readonly status: DayStatus;
  readonly session?: PlannedSession;
  /** Slot of a session that is over: missed unless one was done that day. */
  readonly slot?: PlanSlot;
  /** What was really done that day, which may differ from the plan. */
  readonly doneTemplateId?: string;
}

/**
 * The week as the planning screen shows it: what is done, what is next.
 * A finished session wins over the plan, even on a day planned for rest.
 */
export function weekOverview(input: {
  days: readonly {
    date: IsoDate;
    session?: PlannedSession | undefined;
    slot?: PlanSlot | undefined;
  }[];
  done: readonly SessionLog[];
  today: IsoDate;
}): {
  days: DayView[];
  doneCount: number;
  next?: PlannedSession;
  /** The last session was missed: the next one is the session it should have been. */
  postponed?: { missedDate: IsoDate; templateId: string };
} {
  const days = input.days.map((day): DayView => {
    const log = input.done.find((s) => s.date === day.date);
    const base = {
      date: day.date,
      ...(day.session ? { session: day.session } : {}),
      ...(day.slot ? { slot: day.slot } : {}),
    };
    if (log) return { ...base, status: 'done', doneTemplateId: log.templateId };
    if (day.slot) return { ...base, status: 'missed' };
    if (!day.session) return { ...base, status: 'rest' };
    if (day.date === input.today) return { ...base, status: 'today' };
    return { ...base, status: day.date > input.today ? 'planned' : 'missed' };
  });
  const next = days.find((d) => d.status === 'today' || d.status === 'planned')?.session;
  const lastPast = days.filter((d) => d.status === 'done' || d.status === 'missed').at(-1);
  return {
    days,
    doneCount: days.filter((d) => d.status === 'done').length,
    ...(next ? { next } : {}),
    ...(next && lastPast?.status === 'missed'
      ? { postponed: { missedDate: lastPast.date, templateId: next.templateId } }
      : {}),
  };
}
