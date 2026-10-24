<script setup lang="ts">
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonSelect,
  IonSelectOption,
} from '@ionic/vue';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { addDays, startOfWeek } from '@/domain/dates';
import { MUSCLES, type MuscleId } from '@/domain/muscles';
import {
  personalRecords,
  strengthCurve,
  trainingDays,
  volumeStatus,
  WEEKLY_SETS_TARGET,
  weeklySetsPerMuscle,
  weeklyWorkload,
  weeksOnPace,
} from '@/domain/stats';
import { detectStagnation, pushPullBalance } from '@/domain/tracking';
import type { Exercise } from '@/domain/types';
import LineChart from '@/ui/charts/LineChart.vue';
import { useSession } from '@/ui/session/useSession';
import { todayIso } from '@/ui/useWeekPlan';
import { useSettings } from '@/ui/useSettings';

const { t, n, locale } = useI18n();
const session = useSession();
const { settings } = useSettings();
const sessions = session.history;

const nameOf = (id: string) => {
  const e = session.entryOf(id)?.exercise;
  return e ? (locale.value.startsWith('fr') ? e.name : e.nameEn) : id;
};
const shortDate = (date: string) =>
  new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  );

// Strength: estimated 1RM per session, warm-up and slow-tempo sets left out.
const exercisesDone = computed(() => [
  ...new Set(sessions.value.flatMap((s) => s.sets.map((set) => set.exerciseId))),
]);
const selected = ref<string>();
watch(
  exercisesDone,
  (ids) => {
    if (!selected.value || !ids.includes(selected.value)) selected.value = ids[0];
  },
  { immediate: true },
);
const curve = computed(() => (selected.value ? strengthCurve(sessions.value, selected.value) : []));
const curveDescription = computed(() => {
  const first = curve.value[0];
  const last = curve.value.at(-1);
  if (!first || !last || !selected.value) return '';
  const change = Math.round(((last.oneRepMax - first.oneRepMax) / first.oneRepMax) * 100);
  return t('stats.strength.description', {
    exercise: nameOf(selected.value),
    change: `${change >= 0 ? '+' : ''}${change}`,
    sessions: curve.value.length,
  });
});
const stagnating = computed(() => detectStagnation(curve.value));

const workload = computed(() => weeklyWorkload(sessions.value).slice(-8));

const exercisesById = computed(() => {
  const map = new Map<string, Exercise>();
  for (const id of exercisesDone.value) {
    const exercise = session.entryOf(id)?.exercise;
    if (exercise) map.set(id, exercise);
  }
  return map;
});
const thisWeek = startOfWeek(todayIso());
const setsPerMuscle = computed(() =>
  weeklySetsPerMuscle(sessions.value, exercisesById.value, thisWeek),
);
const muscleRows = computed(() =>
  MUSCLES.map((m) => ({ muscle: m, sets: setsPerMuscle.value[m] ?? 0 })).filter(
    (row) => row.sets > 0,
  ),
);
const balance = computed(() => pushPullBalance(setsPerMuscle.value));

// Regularity: the last 8 weeks, Monday first.
const days = computed(() => new Set(trainingDays(sessions.value)));
const heatmap = computed(() =>
  Array.from({ length: 8 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => addDays(addDays(thisWeek, (w - 7) * 7), d)),
  ),
);
const pace = computed(() =>
  settings.value
    ? weeksOnPace(sessions.value, settings.value.sessionsPerWeek, todayIso())
    : undefined,
);

const records = computed(() =>
  [...personalRecords(sessions.value).entries()].sort((a, b) =>
    nameOf(a[0]).localeCompare(nameOf(b[0]), locale.value),
  ),
);
const muscleLabel = (m: MuscleId) => t(`muscles.${m}`);
</script>

<template>
  <p v-if="sessions.length === 0">{{ t('history.empty') }}</p>
  <template v-else>
    <ion-card>
      <ion-card-header>
        <ion-card-title>{{ t('stats.strength.title') }}</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <ion-item lines="none">
          <ion-select
            v-model="selected"
            :label="t('stats.strength.exercise')"
            interface="action-sheet"
          >
            <ion-select-option v-for="id in exercisesDone" :key="id" :value="id">
              {{ nameOf(id) }}
            </ion-select-option>
          </ion-select>
        </ion-item>
        <LineChart
          v-if="curve.length > 0"
          :points="curve.map((p) => ({ label: shortDate(p.date), value: p.oneRepMax }))"
          :description="curveDescription"
          :unit="t('stats.strength.unit')"
        />
        <p v-else>{{ t('stats.strength.none') }}</p>
        <p v-if="stagnating" class="note" role="note">{{ t('stats.strength.stagnation') }}</p>
      </ion-card-content>
    </ion-card>

    <ion-card>
      <ion-card-header>
        <ion-card-title>{{ t('stats.volume.title') }}</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <p class="small">{{ t('stats.volume.help', WEEKLY_SETS_TARGET) }}</p>
        <ul class="bars">
          <li v-for="row in muscleRows" :key="row.muscle">
            <span class="bar-label">{{ muscleLabel(row.muscle) }}</span>
            <span class="track" aria-hidden="true">
              <span class="zone" />
              <span
                class="fill"
                :class="volumeStatus(row.sets)"
                :style="{ width: `${Math.min(100, (row.sets / 24) * 100)}%` }"
              />
            </span>
            <span class="bar-value">{{
              t(`stats.volume.${volumeStatus(row.sets)}`, { sets: row.sets })
            }}</span>
          </li>
        </ul>
        <p v-if="balance.pushDominant" class="note" role="note">
          {{ t('stats.volume.pushDominant', balance) }}
        </p>
      </ion-card-content>
    </ion-card>

    <ion-card>
      <ion-card-header>
        <ion-card-title>{{ t('stats.regularity.title') }}</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <p v-if="pace">
          {{ t('stats.regularity.pace', { current: pace.current, best: pace.best }) }}
        </p>
        <table class="heatmap" :aria-label="t('stats.regularity.calendar', { count: days.size })">
          <tbody>
            <tr v-for="(week, w) in heatmap" :key="w">
              <td
                v-for="day in week"
                :key="day"
                :class="{ on: days.has(day), future: day > todayIso() }"
                :title="shortDate(day)"
              />
            </tr>
          </tbody>
        </table>
      </ion-card-content>
    </ion-card>

    <ion-card>
      <ion-card-header>
        <ion-card-title>{{ t('stats.workload.title') }}</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <LineChart
          v-if="workload.length > 1"
          :points="workload.map((w) => ({ label: shortDate(w.weekStart), value: w.workload }))"
          :description="t('stats.workload.description', { weeks: workload.length })"
          :unit="t('stats.workload.unit')"
        />
        <p v-else-if="workload[0]">
          {{ t('stats.workload.single', { kg: n(Math.round(workload[0].workload)) }) }}
        </p>
      </ion-card-content>
    </ion-card>

    <ion-card>
      <ion-card-header>
        <ion-card-title>{{ t('stats.records.title') }}</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <ul class="records">
          <li v-for="[id, record] in records" :key="id">
            <strong>{{ nameOf(id) }}</strong> :
            {{
              t('stats.records.load', {
                load: n(record.bestLoad.loadKg),
                reps: n(record.bestLoad.reps),
                date: shortDate(record.bestLoad.date),
              })
            }}
            ·
            {{ t('stats.records.oneRepMax', { value: n(Math.round(record.bestOneRepMax.value)) }) }}
          </li>
        </ul>
      </ion-card-content>
    </ion-card>
  </template>
</template>

<style scoped>
.small {
  font-size: 0.85rem;
  color: var(--ion-color-medium);
}
.note {
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--ion-color-warning);
  color: var(--ion-color-warning-contrast);
}
.bars {
  padding: 0;
  list-style: none;
}
.bars li {
  display: grid;
  grid-template-columns: 7.5em 1fr auto;
  gap: 8px;
  align-items: center;
  margin-block: 6px;
}
.bar-label {
  font-size: 0.85rem;
}
.track {
  position: relative;
  height: 12px;
  border-radius: 6px;
  background: var(--ion-color-step-100, #eee);
}
.zone {
  position: absolute;
  inset-block: 0;
  inset-inline-start: calc(10 / 24 * 100%);
  width: calc(10 / 24 * 100%);
  background: color-mix(in srgb, var(--ion-color-success) 30%, transparent);
}
.fill {
  position: absolute;
  inset-block: 3px;
  inset-inline-start: 0;
  border-radius: 3px;
  background: var(--ion-color-primary);
}
.bar-value {
  font-size: 0.8rem;
  white-space: nowrap;
}
.heatmap {
  border-spacing: 3px;
}
.heatmap td {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  background: var(--ion-color-step-150, #ddd);
}
.heatmap td.on {
  background: var(--ion-color-success);
}
.heatmap td.future {
  opacity: 0.35;
}
.records {
  padding-inline-start: 1em;
}
</style>
