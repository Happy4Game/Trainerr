import { computed } from 'vue';
import { addDays, startOfWeek } from '@/domain/dates';
import { planFromToday, planWeek } from '@/domain/planning';
import { needsFrequencyNote, rotationFor } from '@/domain/trainingModels';
import { useSession } from '@/ui/session/useSession';
import { useSettings } from '@/ui/useSettings';

export function todayIso(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/** The generated week, from the availability and the last session done. */
export function useWeekPlan() {
  const { settings } = useSettings();
  const session = useSession();

  const base = computed(() => {
    const s = settings.value;
    if (!s) return undefined;
    const monday = startOfWeek(todayIso());
    return {
      rotation: rotationFor(s.model),
      ...(session.template.value ? { nextTemplateId: session.template.value.id } : {}),
      doneDates: session.history.value
        .map((h) => h.date)
        .filter((date) => date >= monday && date < addDays(monday, 7)),
      sessionsPerWeek: s.sessionsPerWeek,
      sessionMinutes: s.sessionMinutes,
      freeSlots: s.freeSlots,
      blockedSlots: s.blockedSlots,
      otherSports: s.otherSport ? [s.otherSport] : [],
    };
  });
  const weeks = computed(() =>
    base.value ? planFromToday({ ...base.value, today: todayIso() }) : undefined,
  );
  const plan = computed(() => weeks.value?.thisWeek);
  /** First session of next week, for when this week has nothing left. */
  const nextWeekFirst = computed(() => weeks.value?.nextWeek.sessions[0]);

  const daysOf = (p: ReturnType<typeof planWeek> | undefined) =>
    Array.from({ length: 7 }, (_, i) => {
      const date = addDays(startOfWeek(todayIso()), i);
      return {
        date,
        session: p?.sessions.find((s) => s.date === date),
        slot: p?.closedSlots.find((s) => s.date === date),
      };
    });
  const days = computed(() => daysOf(plan.value));

  /** The same week if the session of that day is missed: the following ones move. */
  const daysIfMissed = (date: string) =>
    base.value
      ? daysOf(
          planWeek({
            ...base.value,
            weekStart: startOfWeek(todayIso()),
            fromDate: addDays(date, 1),
          }),
        )
      : [];

  const frequencyNote = computed(() =>
    settings.value
      ? needsFrequencyNote(settings.value.model, settings.value.sessionsPerWeek)
      : false,
  );

  return { settings, plan, days, daysIfMissed, frequencyNote, nextWeekFirst };
}
