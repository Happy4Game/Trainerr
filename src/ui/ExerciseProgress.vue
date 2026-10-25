<script setup lang="ts">
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle } from '@ionic/vue';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { LoadSteps } from '@/domain/loadSteps';
import { suggestLoadForReps } from '@/domain/oneRepMax';
import { strengthCurve } from '@/domain/stats';
import { detectStagnation } from '@/domain/tracking';
import LineChart from '@/ui/charts/LineChart.vue';
import { useSession } from '@/ui/session/useSession';
import { useUnits } from '@/ui/useUnits';

const props = defineProps<{ exerciseId: string; name: string; steps: LoadSteps }>();

const { t, locale } = useI18n();
const session = useSession();
const { load, toDisplay, symbol } = useUnits();

const curve = computed(() => strengthCurve(session.history.value, props.exerciseId));
const best = computed(() => Math.max(0, ...curve.value.map((p) => p.oneRepMax)));
const shortDate = (date: string) =>
  new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  );
/** "How much for X reps?" from the best estimated 1RM, rounded down to a machine step. */
const targets = computed(() =>
  best.value > 0 && props.steps.length > 0
    ? [8, 10, 12].map((reps) => ({
        reps,
        loadKg: suggestLoadForReps(best.value, reps, props.steps),
      }))
    : [],
);
</script>

<template>
  <ion-card v-if="curve.length > 0">
    <ion-card-header>
      <ion-card-title>{{ t('progress.title') }}</ion-card-title>
    </ion-card-header>
    <ion-card-content>
      <LineChart
        v-if="curve.length > 1"
        :points="curve.map((p) => ({ label: shortDate(p.date), value: toDisplay(p.oneRepMax) }))"
        :description="t('progress.description', { name, sessions: curve.length })"
        :unit="t('stats.strength.unit', { unit: symbol })"
      />
      <p>{{ t('progress.best', { load: load(best) }) }}</p>
      <p v-if="detectStagnation(curve)" class="note" role="note">
        {{ t('stats.strength.stagnation') }}
      </p>
      <h3>{{ t('progress.forReps') }}</h3>
      <ul class="targets">
        <li v-for="target in targets" :key="target.reps">
          {{ t('progress.target', { reps: target.reps, load: load(target.loadKg) }) }}
        </li>
      </ul>
    </ion-card-content>
  </ion-card>
</template>

<style scoped>
h3 {
  margin-block: 12px 4px;
  font-size: 1rem;
}
.targets {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 0;
  list-style: none;
}
.note {
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--ion-color-warning);
  color: var(--ion-color-warning-contrast);
}
</style>
