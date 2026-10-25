import { addDays } from './dates';
import type { IsoDate, SessionLog } from './types';

/**
 * Text summary of the last 7 days sent to the AI coach, only after consent.
 * Exercise names and loads, no personal data (no name, no body measures).
 */
export function weekSummary(input: {
  sessions: readonly SessionLog[];
  today: IsoDate;
  sessionsPerWeek: number;
  exerciseName: (id: string) => string;
  discomforts: readonly { date: IsoDate; zone: string }[];
}): string {
  const since = addDays(input.today, -6);
  const recent = input.sessions.filter((s) => s.date >= since && s.date <= input.today);
  const lines = [
    `Objectif : ${input.sessionsPerWeek} séances par semaine. Séances ces 7 derniers jours : ${recent.length}.`,
  ];
  for (const session of recent) {
    const byExercise = new Map<string, string[]>();
    for (const set of session.sets) {
      if (set.warmup) continue;
      const list = byExercise.get(set.exerciseId) ?? [];
      list.push(
        `${set.loadKg} kg × ${set.reps} (${set.difficulty}${set.completeReps === false ? ', reps incomplètes' : ''})`,
      );
      byExercise.set(set.exerciseId, list);
    }
    lines.push(`- ${session.date} :`);
    for (const [id, sets] of byExercise)
      lines.push(`  ${input.exerciseName(id)} : ${sets.join(', ')}`);
  }
  const pains = input.discomforts.filter((d) => d.date >= since);
  if (pains.length > 0) {
    lines.push(`Gênes signalées : ${pains.map((d) => `${d.zone} (${d.date})`).join(', ')}.`);
  }
  return lines.join('\n');
}
