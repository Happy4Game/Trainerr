<script setup lang="ts">
import { ChartLine } from 'lucide-vue-next';
import EmptyState from '@/ui/EmptyState.vue';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonSelect,
  IonSelectOption,
  IonToggle,
} from '@ionic/vue';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { addDays, startOfWeek } from '@/domain/dates';
import { MUSCLES, type MuscleId } from '@/domain/muscles';
import {
  monthSummary,
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
import { drawRecap } from '@/ui/recapImage';
import { shareOrDownload } from '@/ui/shareFile';
import { useSession } from '@/ui/session/useSession';
import { todayIso } from '@/ui/useWeekPlan';
import { useSettings } from '@/ui/useSettings';
import { useUnits } from '@/ui/useUnits';

const { t, n, locale } = useI18n();
const session = useSession();
const { settings } = useSettings();
const sessions = session.history;
const { load, symbol, toDisplay } = useUnits();

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

// Most recent records first: the ones that matter right now.
const records = computed(() =>
  [...personalRecords(sessions.value).entries()].sort(
    (a, b) =>
      b[1].bestLoad.date.localeCompare(a[1].bestLoad.date) ||
      nameOf(a[0]).localeCompare(nameOf(b[0]), locale.value),
  ),
);

/** The month at a glance, above the charts. */
const kpis = computed(() => {
  const since = addDays(todayIso(), -29);
  const recent = sessions.value.filter((s) => s.date >= since);
  const lastWeeks = workload.value.slice(-4);
  const perWeek =
    lastWeeks.length > 0 ? lastWeeks.reduce((sum, w) => sum + w.workload, 0) / lastWeeks.length : 0;
  return [
    { key: 'sessions', value: n(recent.length), label: t('stats.kpi.sessions', recent.length) },
    {
      key: 'pace',
      value: n(pace.value?.current ?? 0),
      label: t('stats.kpi.pace', pace.value?.current ?? 0),
    },
    {
      key: 'records',
      value: n(records.value.length),
      label: t('stats.kpi.records', records.value.length),
    },
    { key: 'workload', value: load(Math.round(perWeek)), label: t('stats.kpi.workload') },
  ];
});
const weekDays = computed(() =>
  Array.from({ length: 7 }, (_, d) =>
    new Intl.DateTimeFormat(locale.value, { weekday: 'narrow', timeZone: 'UTC' }).format(
      new Date(`${addDays(thisWeek, d)}T00:00:00Z`),
    ),
  ),
);
const muscleLabel = (m: MuscleId) => t(`muscles.${m}`);

// Shareable recap of the current month, loads hidden unless asked.
const showLoads = ref(false);
async function shareRecap(): Promise<void> {
  const month = todayIso().slice(0, 7);
  const summary = monthSummary(sessions.value, month);
  const monthName = new Intl.DateTimeFormat(locale.value, {
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${month}-15T00:00:00Z`));
  const recordsThisMonth = [...personalRecords(sessions.value).values()].filter((r) =>
    r.bestLoad.date.startsWith(month),
  ).length;
  const blob = await drawRecap({
    title: t('recap.title', { month: monthName }),
    lines: [
      t('recap.sessions', summary.sessions),
      t('recap.sets', summary.sets),
      t('recap.days', summary.trainingDays),
      ...(showLoads.value
        ? [t('recap.workload', { load: load(Math.round(summary.workloadKg)) })]
        : []),
      t('recap.records', recordsThisMonth),
    ],
    footer: t('recap.footer'),
  });
  await shareOrDownload(`trainerr-${month}.png`, blob, t('recap.share'));
}
</script>

<template>
  <EmptyState
    v-if="sessions.length === 0"
    :icon="ChartLine"
    :title="t('emptyStates.stats')"
    :text="t('emptyStates.statsText')"
    :action="t('emptyStates.start')"
    to="/tabs/session"
  />
  <template v-else>
    <div class="kpis">
      <div
        v-for="k in kpis"
        :key="k.key"
        class="kpi"
        role="group"
        :aria-label="`${k.value} ${k.label}`"
      >
        <strong>{{ k.value }}</strong>
        <span>{{ k.label }}</span>
      </div>
    </div>
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
          :points="curve.map((p) => ({ label: shortDate(p.date), value: toDisplay(p.oneRepMax) }))"
          :description="curveDescription"
          :unit="t('stats.strength.unit', { unit: symbol })"
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
        <p v-if="pace" class="pace">
          <strong
            ><span v-if="pace.current > 0" aria-hidden="true">🔥 </span
            >{{ t('stats.regularity.pace', pace.current) }}</strong
          >
          <span class="small">{{ t('stats.regularity.best', { best: pace.best }) }}</span>
        </p>
        <table class="heatmap" :aria-label="t('stats.regularity.calendar', { count: days.size })">
          <thead>
            <tr>
              <th v-for="d in weekDays" :key="d" scope="col">{{ d }}</th>
            </tr>
          </thead>
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
          :points="
            workload.map((w) => ({ label: shortDate(w.weekStart), value: toDisplay(w.workload) }))
          "
          :description="t('stats.workload.description', { weeks: workload.length })"
          :unit="t('stats.workload.unit', { unit: symbol })"
        />
        <p v-else-if="workload[0]">
          {{ t('stats.workload.single', { load: load(Math.round(workload[0].workload)) }) }}
        </p>
      </ion-card-content>
    </ion-card>

    <ion-card>
      <ion-card-header>
        <ion-card-title>{{ t('stats.records.title') }}</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <ul class="records">
          <li v-for="[id, record] in records" :key="id" class="record">
            <span class="record-name">{{ nameOf(id) }}</span>
            <span class="record-load">
              {{ load(record.bestLoad.loadKg) }} × {{ n(record.bestLoad.reps) }}
            </span>
            <span class="record-detail">
              {{ shortDate(record.bestLoad.date) }} ·
              {{
                t('stats.records.oneRepMax', {
                  load: load(Math.round(record.bestOneRepMax.value)),
                })
              }}
            </span>
          </li>
        </ul>
      </ion-card-content>
    </ion-card>

    <ion-card>
      <ion-card-header>
        <ion-card-title>{{ t('recap.cardTitle') }}</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <ion-toggle v-model="showLoads">{{ t('recap.showLoads') }}</ion-toggle>
        <ion-button expand="block" fill="outline" class="ion-margin-top" @click="shareRecap">{{
          t('recap.share')
        }}</ion-button>
      </ion-card-content>
    </ion-card>
  </template>
</template>

<style scoped>
.kpis {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-block-end: 4px;
}
.kpi {
  display: flex;
  flex-direction: column;
  padding: 14px;
  border-radius: var(--app-radius);
  background: var(--ion-card-background);
  box-shadow: var(--app-shadow);
}
.kpi strong {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--ion-color-primary);
}
.kpi span {
  font-size: 0.85rem;
  color: var(--ion-color-medium-shade);
}
.pace {
  display: flex;
  flex-direction: column;
  margin-block-start: 0;
}
.records {
  margin: 0;
  padding: 0;
  list-style: none;
}
.record {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 2px 8px;
  padding-block: 10px;
  border-block-end: 1px solid var(--ion-color-light);
}
.record:last-child {
  border-block-end: 0;
}
.record-name {
  font-weight: 600;
  color: var(--ion-text-color, #000);
}
.record-load {
  font-weight: 800;
  color: var(--ion-color-primary);
  white-space: nowrap;
}
.record-detail {
  grid-column: 1 / -1;
  font-size: 0.8rem;
  color: var(--ion-color-medium-shade);
}
.toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
}
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
  width: 100%;
  border-spacing: 4px;
  table-layout: fixed;
}
.heatmap th {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--ion-color-medium-shade);
}
.heatmap td {
  height: 22px;
  border-radius: 6px;
  background: var(--ion-color-light);
}
.heatmap td.on {
  background: var(--ion-color-success);
}
.heatmap td.future {
  opacity: 0.35;
}
</style>
