<script setup lang="ts">
import { IonButton } from '@ionic/vue';
import { Minus, Plus } from 'lucide-vue-next';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { OWN_REP_RANGE, repRangeFor, validRepRange } from '@/domain/progression';
import type { Exercise, RepRange } from '@/domain/types';
import { useSettings } from '@/ui/useSettings';

/**
 * Reps to aim for on this machine only: two steppers. The load goes up once
 * every set reaches the max. "Reset" goes back to the usual range.
 */
const props = defineProps<{ exercise: Exercise }>();
const { t } = useI18n();
const { settings, updateSettings } = useSettings();

const own = computed(() => settings.value?.machineRepRanges?.[props.exercise.id]);
const usual = computed(() => repRangeFor(props.exercise, settings.value?.repRange));
const range = computed(() => own.value ?? usual.value);

async function save(next: RepRange | undefined): Promise<void> {
  const { [props.exercise.id]: _old, ...others } = settings.value?.machineRepRanges ?? {};
  await updateSettings({
    machineRepRanges: next ? { ...others, [props.exercise.id]: next } : others,
  });
}

/** One rep more or less; the other bound moves too when they would get too close. */
function change(bound: 'min' | 'max', delta: number): void {
  const current = range.value;
  let next = { ...current, [bound]: current[bound] + delta };
  if (next.max - next.min < OWN_REP_RANGE.width) {
    next =
      bound === 'max'
        ? { min: next.max - OWN_REP_RANGE.width, max: next.max }
        : { min: next.min, max: next.min + OWN_REP_RANGE.width };
  }
  if (validRepRange(next)) void save(next);
}
const canChange = (bound: 'min' | 'max', delta: number) => {
  const value = range.value[bound] + delta;
  return bound === 'min'
    ? value >= OWN_REP_RANGE.lowest && value + OWN_REP_RANGE.width <= OWN_REP_RANGE.highest
    : value <= OWN_REP_RANGE.highest && value - OWN_REP_RANGE.width >= OWN_REP_RANGE.lowest;
};
</script>

<template>
  <div class="rep-range" role="group" :aria-label="t('exercise.range.title')">
    <div v-for="bound in ['min', 'max'] as const" :key="bound" class="bound">
      <span class="label">{{ t(`exercise.range.${bound}`) }}</span>
      <div class="stepper">
        <button
          type="button"
          :disabled="!canChange(bound, -1)"
          :aria-label="t(`exercise.range.less.${bound}`)"
          @click="change(bound, -1)"
        >
          <Minus :size="20" aria-hidden="true" />
        </button>
        <output :data-testid="`range-${bound}`">{{ range[bound] }}</output>
        <button
          type="button"
          :disabled="!canChange(bound, 1)"
          :aria-label="t(`exercise.range.more.${bound}`)"
          @click="change(bound, 1)"
        >
          <Plus :size="20" aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
  <p class="small">
    {{ own ? t('exercise.range.mine') : t('exercise.range.usual') }}
  </p>
  <ion-button v-if="own" size="small" fill="clear" @click="save(undefined)">
    {{ t('exercise.range.reset', { min: usual.min, max: usual.max }) }}
  </ion-button>
</template>

<style scoped>
.rep-range {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.bound {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.label {
  font-size: 0.85rem;
  font-weight: 700;
}
.stepper {
  display: flex;
  align-items: center;
  gap: 8px;
}
.stepper button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  background: var(--tr-surface-2, var(--ion-color-light));
  color: var(--ion-color-primary);
}
.stepper button:disabled {
  opacity: 0.35;
}
output {
  min-width: 2ch;
  font-size: 1.6rem;
  font-weight: 800;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.small {
  margin: 8px 0 0;
  font-size: 0.85rem;
  color: var(--ion-color-medium);
}
</style>
