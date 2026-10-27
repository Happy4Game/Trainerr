import { useI18n } from 'vue-i18n';
import { averageSpeedKmh, paceSeconds, type CardioEntry } from '@/domain/cardio';

/** Names and one-line summaries of cardio entries: "20 min · 8,4 km · 25,2 km/h · 142 bpm". */
export function useCardioText() {
  const { t, n } = useI18n();
  const one = (value: number) => n(value, { maximumFractionDigits: 1 });
  const pace = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  function detail(entry: CardioEntry): string {
    const speed = averageSpeedKmh(entry);
    const perKm = paceSeconds(entry);
    const parts = [
      t('cardio.units.minutes', { n: one(entry.minutes) }),
      entry.distanceKm !== undefined && t('cardio.units.km', { n: one(entry.distanceKm) }),
      perKm !== undefined &&
        (entry.cardioId === 'rower'
          ? t('cardio.units.pace500', { pace: pace(perKm) })
          : entry.cardioId === 'treadmill' || entry.cardioId === 'outdoorRun'
            ? t('cardio.units.pace', { pace: pace(perKm) })
            : false),
      speed !== undefined && entry.cardioId !== 'rower' && t('cardio.units.kmh', { n: one(speed) }),
      entry.inclinePct !== undefined && t('cardio.units.incline', { n: one(entry.inclinePct) }),
      entry.level !== undefined && t('cardio.units.level', { n: one(entry.level) }),
      entry.cadence !== undefined && t('cardio.units.cadence', { n: one(entry.cadence) }),
      entry.avgHr !== undefined && t('cardio.units.bpm', { n: entry.avgHr }),
      entry.calories !== undefined && t('cardio.units.kcal', { n: entry.calories }),
    ];
    return parts.filter((p): p is string => typeof p === 'string').join(' · ');
  }

  return {
    name: (cardioId: string) => t(`cardio.machines.${cardioId}`),
    detail,
  };
}
