import { computed } from 'vue';
import { addDays, startOfWeek } from '@/domain/dates';
import { planWeek } from '@/domain/planning';
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

  const planFrom = (weekStart: string) => {
    const s = settings.value;
    if (!s) return undefined;
    return planWeek({
      weekStart,
      rotation: rotationFor(s.model),
      ...(session.lastDoneTemplateId.value
        ? { lastDoneTemplateId: session.lastDoneTemplateId.value }
        : {}),
      sessionsPerWeek: s.sessionsPerWeek,
      sessionMinutes: s.sessionMinutes,
      freeSlots: s.freeSlots,
      blockedSlots: s.blockedSlots,
      otherSports: s.otherSport ? [s.otherSport] : [],
    });
  };
  const plan = computed(() => planFrom(startOfWeek(todayIso())));
  /** First session of next week, for when this week has nothing left. */
  const nextWeekFirst = computed(() => planFrom(addDays(startOfWeek(todayIso()), 7))?.sessions[0]);

  const days = computed(() =>
    Array.from({ length: 7 }, (_, i) => {
      const date = addDays(startOfWeek(todayIso()), i);
      return { date, session: plan.value?.sessions.find((s) => s.date === date) };
    }),
  );

  const frequencyNote = computed(() =>
    settings.value
      ? needsFrequencyNote(settings.value.model, settings.value.sessionsPerWeek)
      : false,
  );

  return { settings, plan, days, frequencyNote, nextWeekFirst };
}
