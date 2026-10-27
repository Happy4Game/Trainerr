import { computed, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { loadChange, type LoadChange } from '@/domain/sessionPreview';
import type { Exercise } from '@/domain/types';
import { useUnits } from '@/ui/useUnits';
import { useSession } from './useSession';

/**
 * What the session of the day brings, shown on Today and on Session: the
 * loads going up and the muscles it catches up on the week.
 */
export function usePlanInsights(exercises: Ref<readonly Exercise[]>) {
  const { t } = useI18n();
  const { load: kg } = useUnits();
  const session = useSession();

  /** Only a step up is shown: a lighter week or a pause is planned. */
  const changeFor = (id: string): LoadChange =>
    loadChange({
      proposedKg: session.proposalFor(id)?.loadKg ?? 0,
      lastLoadsKg: session.lastTimeSets(id).map((s) => s.loadKg),
      assisted: session.entryOf(id)?.exercise.assisted === true,
    });
  const changeLabel = (change: LoadChange) =>
    change.kind === 'up'
      ? t('today.change.up', { delta: kg(change.deltaKg) })
      : t('today.change.first');
  /** "+2,5 kg" or "1re fois", or nothing. */
  const changeText = (id: string): string | undefined => {
    const change = changeFor(id);
    return change.kind === 'up' || change.kind === 'first' ? changeLabel(change) : undefined;
  };

  const goingUp = computed(
    () => exercises.value.filter((e) => changeFor(e.id).kind === 'up').length,
  );
  /** Muscles behind on their week that this session works: "it catches up calves". */
  const catchUp = computed(() => {
    const worked = new Set(exercises.value.flatMap((e) => e.primaryMuscles));
    return session.neglected.value.filter((m) => worked.has(m));
  });
  const catchUpText = computed(() =>
    catchUp.value.length > 0
      ? t('today.catchUp', { muscles: catchUp.value.map((m) => t(`muscles.${m}`)).join(', ') })
      : undefined,
  );

  return { changeFor, changeLabel, changeText, goingUp, catchUp, catchUpText };
}
