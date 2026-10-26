<script setup lang="ts">
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CalendarCheck,
  ChartLine,
  Flame,
  Minus,
  Scale,
  Trophy,
} from 'lucide-vue-next';
import EmptyState from '@/ui/EmptyState.vue';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonToggle,
} from '@ionic/vue';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { SOURCES } from '@/data/content/sources';
import {
  allTrends,
  bodyWeightTrend,
  recentRecords,
  regularity,
  trainingBalance,
  weeklyVolume,
  type ExerciseTrend,
  type TrendVerdict,
} from '@/domain/insights';
import { MUSCLES } from '@/domain/muscles';
import {
  monthSummary,
  personalRecords,
  volumeStatus,
  WEEKLY_SETS_TARGET,
  weeklyWorkload,
  weeksOnPace,
} from '@/domain/stats';
import type { Exercise } from '@/domain/types';
import LineChart from '@/ui/charts/LineChart.vue';
import TrendChart from '@/ui/charts/TrendChart.vue';
import { drawRecap } from '@/ui/recapImage';
import { shareOrDownload } from '@/ui/shareFile';
import { useSession } from '@/ui/session/useSession';
import { todayIso } from '@/ui/useWeekPlan';
import { useSettings } from '@/ui/useSettings';
import { useUnits } from '@/ui/useUnits';

const { t, n, locale } = useI18n();
const session = useSession();
const { settings } = useSettings();
// Real loads: an assisted pull-up counts as body weight − help.
const sessions = session.realHistory;
const { load, symbol, toDisplay } = useUnits();
const today = todayIso();

const nameOf = (id: string) => {
  const e = session.entryOf(id)?.exercise;
  return e ? (locale.value.startsWith('fr') ? e.name : e.nameEn) : id;
};
const shortDate = (date: string) =>
  new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  );
/** "+7,5 kg", "−2,5 kg", "0 kg". */
const signed = (kg: number) => (kg > 0 ? `+${load(kg)}` : kg < 0 ? `−${load(-kg)}` : load(0));

// ---- Am I progressing? ----
const trends = computed(() => allTrends(sessions.value, today));
const selected = ref<string>();
watch(
  trends,
  (list) => {
    if (!selected.value || !list.some((tr) => tr.exerciseId === selected.value)) {
      // The most worked exercise of the last sessions: usually the one that matters.
      selected.value = [...list].sort((a, b) => b.sessions - a.sessions)[0]?.exerciseId;
    }
  },
  { immediate: true },
);
const trend = computed(() => trends.value.find((tr) => tr.exerciseId === selected.value));
const VERDICT_ICON: Record<TrendVerdict, typeof ArrowUpRight> = {
  progressing: ArrowUpRight,
  steady: Minus,
  stalled: Minus,
  regressing: ArrowDownRight,
  tooEarly: Activity,
};
const trendLine = (tr: ExerciseTrend) =>
  tr.verdict === 'tooEarly'
    ? t('stats.progress.tooEarly')
    : t('stats.progress.change', { change: signed(tr.changeKg), weeks: tr.weeks }, tr.weeks);
const chartPoints = computed(() =>
  (trend.value?.points ?? []).map((p) => ({
    label: shortDate(p.date),
    value: toDisplay(p.oneRepMax),
    value2: toDisplay(p.bestSet.loadKg),
  })),
);
const counts = computed(() => {
  const by = (v: TrendVerdict) => trends.value.filter((tr) => tr.verdict === v);
  return { up: by('progressing'), stalled: by('stalled'), down: by('regressing') };
});

// ---- Do my muscles get enough? ----
const exercisesById = computed(() => {
  const map = new Map<string, Exercise>();
  for (const s of sessions.value) {
    for (const set of s.sets) {
      const exercise = session.entryOf(set.exerciseId)?.exercise;
      if (exercise) map.set(set.exerciseId, exercise);
    }
  }
  return map;
});
const volume = computed(() => weeklyVolume(sessions.value, exercisesById.value, today));
const muscleRows = computed(() =>
  MUSCLES.map((m) => ({ muscle: m, sets: volume.value.perMuscle[m] ?? 0 }))
    .filter((row) => row.sets > 0 || volume.value.lagging.includes(row.muscle))
    .sort((a, b) => b.sets - a.sets),
);
const SCALE = 24;
const schoenfeld = SOURCES.find((s) => s.id === 'schoenfeld2017');
const muscleList = (muscles: readonly string[]) =>
  new Intl.ListFormat(locale.value, { type: 'conjunction' }).format(
    muscles.map((m) => t(`muscles.${m}`).toLowerCase()),
  );

// ---- Is my training balanced? ----
const balance = computed(() => trainingBalance(sessions.value, exercisesById.value, today));
const pushShare = computed(() => {
  const { push, pull } = balance.value.sets;
  return push + pull > 0 ? push / (push + pull) : 0.5;
});

// ---- Am I regular? ----
const reg = computed(() => regularity(sessions.value, today));
const pace = computed(() =>
  settings.value ? weeksOnPace(sessions.value, settings.value.sessionsPerWeek, today) : undefined,
);
const weekDays = computed(() =>
  (reg.value.calendar[0] ?? []).map((d) =>
    new Intl.DateTimeFormat(locale.value, { weekday: 'narrow', timeZone: 'UTC' }).format(
      new Date(`${d.date}T00:00:00Z`),
    ),
  ),
);
const trainedDays = computed(() => reg.value.calendar.flat().filter((d) => d.trained).length);

// ---- What did I beat lately? ----
const recent = computed(() => recentRecords(sessions.value, today));
const allRecords = computed(() =>
  [...personalRecords(sessions.value).entries()].sort((a, b) =>
    nameOf(a[0]).localeCompare(nameOf(b[0]), locale.value),
  ),
);

// ---- Is my body weight moving? ----
const body = computed(() => bodyWeightTrend(session.weighings.value, today));

// ---- Am I doing more than before? ----
const workload = computed(() => weeklyWorkload(sessions.value).slice(-8));

/** The 3 things to know, before the details. */
const headlines = computed(() => {
  const lines: { key: string; tone: 'good' | 'warn' | 'info'; text: string }[] = [];
  const { up, stalled, down } = counts.value;
  if (up.length > 0) {
    lines.push({ key: 'up', tone: 'good', text: t('stats.brief.up', up.length) });
  }
  if (stalled.length > 0 || down.length > 0) {
    const names = [...stalled, ...down].slice(0, 2).map((tr) => nameOf(tr.exerciseId));
    lines.push({
      key: 'stalled',
      tone: 'warn',
      text: t(
        'stats.brief.stalled',
        { names: new Intl.ListFormat(locale.value).format(names) },
        stalled.length + down.length,
      ),
    });
  }
  if (volume.value.lagging.length > 0) {
    lines.push({
      key: 'lagging',
      tone: 'warn',
      text: t('stats.brief.lagging', { muscles: muscleList(volume.value.lagging.slice(0, 3)) }),
    });
  }
  const target = settings.value?.sessionsPerWeek;
  if (target !== undefined) {
    lines.push({
      key: 'pace',
      tone: reg.value.perWeek >= target ? 'good' : 'info',
      text: t(
        'stats.brief.pace',
        { perWeek: n(reg.value.perWeek), target },
        reg.value.perWeek < 2 ? 1 : 2,
      ),
    });
  }
  return lines.slice(0, 4);
});

// Shareable recap of the current month, loads hidden unless asked.
const showLoads = ref(false);
async function shareRecap(): Promise<void> {
  const month = today.slice(0, 7);
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
    <!-- En bref : ce qu'il faut retenir, avant le détail -->
    <section class="brief" :aria-label="t('stats.brief.title')">
      <p class="tr-eyebrow">{{ t('stats.brief.title') }}</p>
      <ul>
        <li v-for="line in headlines" :key="line.key" :class="line.tone">
          <span class="dot" aria-hidden="true" />{{ line.text }}
        </li>
      </ul>
    </section>

    <!-- Est-ce que je progresse ? -->
    <ion-card class="stat">
      <ion-card-header>
        <ion-card-subtitle>{{ t('stats.progress.question') }}</ion-card-subtitle>
        <ion-card-title>{{ t('stats.progress.title') }}</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <div class="chips" role="radiogroup" :aria-label="t('stats.progress.exercise')">
          <button
            v-for="tr in trends"
            :key="tr.exerciseId"
            type="button"
            role="radio"
            class="chip"
            :class="[tr.verdict, { on: tr.exerciseId === selected }]"
            :aria-checked="tr.exerciseId === selected"
            @click="selected = tr.exerciseId"
          >
            <component :is="VERDICT_ICON[tr.verdict]" :size="16" aria-hidden="true" />
            {{ nameOf(tr.exerciseId) }}
          </button>
        </div>

        <template v-if="trend">
          <div class="headline">
            <div>
              <span class="big tr-number">{{
                load(Math.round(trend.points.at(-1)?.oneRepMax ?? 0))
              }}</span>
              <span class="tr-muted small">{{ t('stats.progress.oneRepMax') }}</span>
            </div>
            <span class="badge" :class="trend.verdict">
              {{ t(`stats.progress.verdict.${trend.verdict}`) }}
            </span>
          </div>
          <p class="trend-line" :class="trend.verdict" data-testid="trend">
            {{ trendLine(trend) }}
          </p>
          <TrendChart
            v-if="trend.points.length > 1"
            :points="chartPoints"
            :format="(v) => `${n(Math.round(v))}`"
            :legend="t('stats.progress.legend', { unit: symbol })"
            :legend2="t('stats.progress.legend2', { unit: symbol })"
            :description="
              t('stats.progress.description', {
                exercise: nameOf(trend.exerciseId),
                line: trendLine(trend),
                sessions: trend.sessions,
              })
            "
          />
          <p class="advice" :class="trend.verdict" role="note">
            {{
              t(`stats.progress.advice.${trend.verdict}`, {
                sessions: trend.sessionsSinceBest,
                missing: Math.max(1, 2 - trend.sessions),
              })
            }}
          </p>
          <p class="source">{{ t('stats.progress.formula') }}</p>
        </template>
      </ion-card-content>
    </ion-card>

    <!-- Mes muscles reçoivent-ils assez de travail ? -->
    <ion-card class="stat">
      <ion-card-header>
        <ion-card-subtitle>{{ t('stats.volume.question') }}</ion-card-subtitle>
        <ion-card-title>{{ t('stats.volume.title') }}</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <p class="small tr-muted">
          {{
            volume.weeks > 0
              ? t('stats.volume.period', volume.weeks)
              : t('stats.volume.periodCurrent')
          }}
        </p>
        <ul class="bars">
          <li v-for="row in muscleRows" :key="row.muscle">
            <span class="bar-label">{{ t(`muscles.${row.muscle}`) }}</span>
            <span class="track" aria-hidden="true">
              <span class="zone" />
              <span
                class="fill"
                :class="volumeStatus(row.sets)"
                :style="{ width: `${Math.min(100, (row.sets / SCALE) * 100)}%` }"
              />
            </span>
            <span class="bar-value" :class="volumeStatus(row.sets)">
              {{ t(`stats.volume.${volumeStatus(row.sets)}`, { sets: n(row.sets) }) }}
            </span>
          </li>
        </ul>
        <p class="legend small tr-muted">
          <span class="zone-swatch" aria-hidden="true" />
          {{ t('stats.volume.zone', WEEKLY_SETS_TARGET) }}
        </p>
        <p v-if="volume.lagging.length > 0" class="advice stalled" role="note">
          {{
            t(
              'stats.volume.lagging',
              { muscles: muscleList(volume.lagging.slice(0, 4)) },
              volume.lagging.length > 4 ? 2 : 1,
            )
          }}
        </p>
        <p v-else class="advice progressing" role="note">{{ t('stats.volume.allGood') }}</p>
        <p v-if="schoenfeld" class="source">
          <a :href="schoenfeld.url" target="_blank" rel="noopener">{{
            t('stats.volume.source')
          }}</a>
        </p>
      </ion-card-content>
    </ion-card>

    <!-- Mon entraînement est-il équilibré ? -->
    <ion-card class="stat">
      <ion-card-header>
        <ion-card-subtitle>{{ t('stats.balance.question') }}</ion-card-subtitle>
        <ion-card-title>{{ t('stats.balance.title') }}</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <div class="split" role="img" :aria-label="t('stats.balance.pushPullLabel', balance.sets)">
          <div class="split-labels">
            <span>{{ t('stats.balance.push', { sets: balance.sets.push }) }}</span>
            <span>{{ t('stats.balance.pull', { sets: balance.sets.pull }) }}</span>
          </div>
          <div class="split-bar">
            <span class="a" :style="{ width: `${pushShare * 100}%` }" />
            <span class="b" />
          </div>
        </div>
        <div
          class="split"
          role="img"
          :aria-label="
            t('stats.balance.upperLowerLabel', {
              upper: balance.sets.push + balance.sets.pull,
              legs: balance.sets.legs,
            })
          "
        >
          <div class="split-labels">
            <span>{{
              t('stats.balance.upper', { sets: balance.sets.push + balance.sets.pull })
            }}</span>
            <span>{{ t('stats.balance.legs', { sets: balance.sets.legs }) }}</span>
          </div>
          <div class="split-bar">
            <span class="a" :style="{ width: `${(1 - balance.legsShare) * 100}%` }" />
            <span class="b" />
          </div>
        </div>
        <p
          class="advice"
          :class="
            balance.pushPull === 'balanced' && balance.upperLower === 'balanced'
              ? 'progressing'
              : 'stalled'
          "
          role="note"
        >
          <template v-if="balance.pushPull !== 'balanced' && balance.pushPull !== 'unknown'">
            {{ t(`stats.balance.${balance.pushPull}`) }}
          </template>
          <template v-if="balance.upperLower !== 'balanced' && balance.upperLower !== 'unknown'">
            {{ t(`stats.balance.${balance.upperLower}`) }}
          </template>
          <template v-if="balance.pushPull === 'balanced' && balance.upperLower === 'balanced'">
            {{ t('stats.balance.ok') }}
          </template>
        </p>
        <p class="source">{{ t('stats.balance.period') }}</p>
      </ion-card-content>
    </ion-card>

    <!-- Suis-je régulier ? -->
    <ion-card class="stat">
      <ion-card-header>
        <ion-card-subtitle>{{ t('stats.regularity.question') }}</ion-card-subtitle>
        <ion-card-title>{{ t('stats.regularity.title') }}</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <div class="kpis">
          <div
            class="kpi"
            role="group"
            :aria-label="t('stats.regularity.perWeek', { value: n(reg.perWeek) })"
          >
            <CalendarCheck :size="20" aria-hidden="true" />
            <strong class="tr-number">{{ n(reg.perWeek) }}</strong>
            <span>{{ t('stats.regularity.perWeekShort') }}</span>
          </div>
          <div
            class="kpi"
            role="group"
            :aria-label="t('stats.regularity.pace', pace?.current ?? 0)"
          >
            <Flame :size="20" aria-hidden="true" />
            <strong class="tr-number">{{ n(pace?.current ?? 0) }}</strong>
            <span>{{ t('stats.regularity.paceShort', pace?.current ?? 0) }}</span>
          </div>
          <div
            class="kpi"
            role="group"
            :aria-label="
              reg.daysSinceLast
                ? t('stats.regularity.since', reg.daysSinceLast)
                : t('stats.regularity.sinceToday')
            "
          >
            <Activity :size="20" aria-hidden="true" />
            <strong class="tr-number">{{ n(reg.daysSinceLast ?? 0) }}</strong>
            <span>{{ t('stats.regularity.sinceShort', reg.daysSinceLast ?? 0) }}</span>
          </div>
        </div>
        <table class="heatmap" :aria-label="t('stats.regularity.calendar', { count: trainedDays })">
          <thead>
            <tr>
              <th v-for="(d, i) in weekDays" :key="i" scope="col">{{ d }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(week, w) in reg.calendar" :key="w">
              <td
                v-for="day in week"
                :key="day.date"
                :class="{ on: day.trained, future: day.future, today: day.date === today }"
                :title="shortDate(day.date)"
              />
            </tr>
          </tbody>
        </table>
        <p class="source">
          {{
            t('stats.regularity.target', {
              target: settings?.sessionsPerWeek ?? 0,
              best: pace?.best ?? 0,
            })
          }}
        </p>
      </ion-card-content>
    </ion-card>

    <!-- Qu'ai-je battu récemment ? -->
    <ion-card class="stat">
      <ion-card-header>
        <ion-card-subtitle>{{ t('stats.records.question') }}</ion-card-subtitle>
        <ion-card-title>{{ t('stats.records.title') }}</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <ul v-if="recent.length > 0" class="records">
          <li v-for="r in recent" :key="r.exerciseId" class="record">
            <Trophy :size="22" aria-hidden="true" class="trophy" />
            <span class="record-name">{{ nameOf(r.exerciseId) }}</span>
            <span class="record-load tr-number">{{ load(r.loadKg) }} × {{ n(r.reps) }}</span>
            <span class="record-detail">
              {{ shortDate(r.date) }} ·
              {{ t('stats.records.oneRepMax', { load: load(Math.round(r.oneRepMax)) }) }}
            </span>
          </li>
        </ul>
        <p v-else class="tr-muted">{{ t('stats.records.none') }}</p>
        <details class="all-records">
          <summary>{{ t('stats.records.all', allRecords.length) }}</summary>
          <ul class="records">
            <li v-for="[id, record] in allRecords" :key="id" class="record compact">
              <span class="record-name">{{ nameOf(id) }}</span>
              <span class="record-load tr-number">
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
        </details>
      </ion-card-content>
    </ion-card>

    <!-- Mon poids bouge-t-il ? -->
    <ion-card class="stat">
      <ion-card-header>
        <ion-card-subtitle>{{ t('stats.body.question') }}</ion-card-subtitle>
        <ion-card-title>{{ t('stats.body.title') }}</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <template v-if="body">
          <div class="headline">
            <div>
              <span class="big tr-number">{{ load(body.latestKg) }}</span>
              <span class="tr-muted small">{{ t('stats.body.latest') }}</span>
            </div>
            <span v-if="body.perWeekKg !== undefined" class="badge steady">
              <Scale :size="16" aria-hidden="true" />
              {{ t('stats.body.perWeek', { change: signed(body.perWeekKg) }) }}
            </span>
          </div>
          <TrendChart
            v-if="body.points.length > 1"
            :points="
              body.points.map((p) => ({ label: shortDate(p.date), value: toDisplay(p.weightKg) }))
            "
            :format="(v) => n(Math.round(v * 10) / 10)"
            :legend="t('stats.body.legend', { unit: symbol })"
            :description="t('stats.body.description', { count: body.points.length })"
          />
          <p class="source">
            {{ body.perWeekKg === undefined ? t('stats.body.needMore') : t('stats.body.help') }}
          </p>
        </template>
        <p v-else class="tr-muted">{{ t('stats.body.none') }}</p>
      </ion-card-content>
    </ion-card>

    <!-- Est-ce que j'en fais plus qu'avant ? -->
    <ion-card class="stat">
      <ion-card-header>
        <ion-card-subtitle>{{ t('stats.workload.question') }}</ion-card-subtitle>
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

    <ion-card class="stat">
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
.small {
  font-size: var(--tr-font-s);
}
.source {
  margin: var(--tr-space-3) 0 0;
  font-size: var(--tr-font-xs);
  color: var(--tr-text-muted);
}
.source a {
  color: var(--ion-color-primary);
}

/* En bref */
.brief {
  padding: var(--tr-space-4);
  border-radius: var(--tr-radius-l);
  background: var(--tr-surface);
  box-shadow: var(--tr-shadow-1);
  animation: tr-rise var(--tr-duration-slow) var(--tr-ease-out);
}
.brief .tr-eyebrow {
  margin: 0 0 var(--tr-space-2);
}
.brief ul {
  margin: 0;
  padding: 0;
  list-style: none;
}
.brief li {
  display: flex;
  gap: var(--tr-space-3);
  align-items: baseline;
  padding-block: 6px;
  font-size: var(--tr-font-m);
  font-weight: 600;
  line-height: 1.35;
}
.brief .dot {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  transform: translateY(1px);
}
.brief .good .dot {
  background: var(--ion-color-success);
}
.brief .warn .dot {
  background: var(--ion-color-warning);
}
.brief .info .dot {
  background: var(--ion-color-secondary);
}

.stat ion-card-subtitle {
  font-size: var(--tr-font-s);
  font-weight: 600;
}

/* Choix de l'exercice */
.chips {
  display: flex;
  gap: var(--tr-space-2);
  overflow-x: auto;
  padding-bottom: var(--tr-space-2);
  margin-inline: calc(-1 * var(--tr-space-4));
  padding-inline: var(--tr-space-4);
  scrollbar-width: none;
}
.chip {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 6px;
  min-height: var(--tr-touch);
  padding: 0 14px;
  border: 1.5px solid var(--tr-border);
  border-radius: var(--tr-radius-pill);
  background: transparent;
  color: var(--tr-text);
  font: inherit;
  font-size: var(--tr-font-s);
  font-weight: 600;
  white-space: nowrap;
  transition:
    background var(--tr-duration) var(--tr-ease-out),
    border-color var(--tr-duration) var(--tr-ease-out);
}
.chip.on {
  border-color: var(--ion-color-primary);
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
}
.chip.progressing:not(.on) svg {
  color: var(--ion-color-success);
}
.chip.stalled:not(.on) svg,
.chip.regressing:not(.on) svg {
  color: var(--ion-color-warning);
}

.headline {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--tr-space-3);
  margin-top: var(--tr-space-3);
}
.headline > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.big {
  font-size: var(--tr-font-xxl);
  color: var(--tr-text);
}
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: var(--tr-radius-pill);
  font-size: var(--tr-font-xs);
  font-weight: 800;
  white-space: nowrap;
  background: var(--tr-surface-2);
  color: var(--tr-text);
}
.badge.progressing {
  background: var(--ion-color-success);
  color: var(--ion-color-success-contrast);
}
.badge.stalled,
.badge.regressing {
  background: var(--ion-color-warning);
  color: var(--ion-color-warning-contrast);
}
.trend-line {
  margin: var(--tr-space-2) 0 var(--tr-space-3);
  font-size: var(--tr-font-l);
  font-weight: 800;
}
.advice {
  margin: var(--tr-space-3) 0 0;
  padding: var(--tr-space-3) var(--tr-space-4);
  border-radius: var(--tr-radius-m);
  border-inline-start: 4px solid var(--tr-border);
  background: var(--tr-surface-2);
  color: var(--tr-text);
  font-size: var(--tr-font-s);
  line-height: 1.45;
}
.advice.progressing {
  border-color: var(--ion-color-success);
}
.advice.stalled,
.advice.regressing {
  border-color: var(--ion-color-warning);
}
.advice.tooEarly,
.advice.steady {
  border-color: var(--ion-color-secondary);
}

/* Séries par muscle */
.bars {
  margin: var(--tr-space-2) 0 0;
  padding: 0;
  list-style: none;
}
.bars li {
  display: grid;
  grid-template-columns: 6.5em 1fr 4.8em;
  gap: var(--tr-space-2);
  align-items: center;
  min-height: 32px;
}
.bar-label {
  font-size: var(--tr-font-s);
  font-weight: 600;
}
.track {
  position: relative;
  height: 14px;
  border-radius: var(--tr-radius-pill);
  background: var(--tr-surface-2);
  overflow: hidden;
}
.zone,
.zone-swatch {
  background: color-mix(in srgb, var(--ion-color-success) 22%, transparent);
}
.zone {
  position: absolute;
  inset-block: 0;
  inset-inline-start: calc(10 / 24 * 100%);
  width: calc(10 / 24 * 100%);
}
.fill {
  position: absolute;
  inset-block: 3px;
  inset-inline-start: 3px;
  border-radius: var(--tr-radius-pill);
  background: var(--ion-color-warning);
  transition: width var(--tr-duration-slow) var(--tr-ease-out);
}
.fill.inRange {
  background: var(--ion-color-success);
}
.fill.above {
  background: var(--ion-color-secondary);
}
.bar-value {
  font-size: var(--tr-font-xs);
  font-weight: 700;
  text-align: end;
  white-space: nowrap;
}
.legend {
  display: flex;
  align-items: center;
  gap: var(--tr-space-2);
  margin: var(--tr-space-2) 0 0;
}
.zone-swatch {
  display: inline-block;
  width: 18px;
  height: 10px;
  border-radius: 3px;
}

/* Équilibre */
.split {
  margin-block: var(--tr-space-3);
}
.split-labels {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: var(--tr-font-s);
  font-weight: 700;
}
.split-bar {
  display: flex;
  height: 14px;
  border-radius: var(--tr-radius-pill);
  overflow: hidden;
  gap: 3px;
}
.split-bar .a {
  background: var(--tr-chart-1);
  transition: width var(--tr-duration-slow) var(--tr-ease-out);
}
.split-bar .b {
  flex: 1;
  background: var(--tr-chart-2);
}

/* Régularité */
.kpis {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--tr-space-2);
  margin-bottom: var(--tr-space-4);
}
.kpi {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--tr-space-3);
  border-radius: var(--tr-radius-m);
  background: var(--tr-surface-2);
}
.kpi svg {
  color: var(--ion-color-primary);
}
.kpi strong {
  font-size: var(--tr-font-xl);
  color: var(--tr-text);
}
.kpi span {
  font-size: var(--tr-font-xs);
  color: var(--tr-text-muted);
  line-height: 1.25;
}
.heatmap {
  width: 100%;
  border-spacing: 4px;
  table-layout: fixed;
}
.heatmap th {
  font-size: var(--tr-font-xs);
  font-weight: 700;
  color: var(--tr-text-muted);
}
.heatmap td {
  height: 18px;
  border-radius: 5px;
  background: var(--tr-surface-2);
}
.heatmap td.on {
  background: var(--ion-color-primary);
}
.heatmap td.today {
  outline: 2px solid var(--tr-text-muted);
  outline-offset: -2px;
}
.heatmap td.future {
  opacity: 0.3;
}

/* Records */
.records {
  margin: 0;
  padding: 0;
  list-style: none;
}
.record {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 2px var(--tr-space-3);
  align-items: center;
  padding-block: var(--tr-space-3);
  border-block-end: 1px solid var(--tr-border);
}
.record:last-child {
  border-block-end: 0;
}
.record.compact {
  grid-template-columns: 1fr auto;
}
.trophy {
  grid-row: span 2;
  color: var(--ion-color-warning);
}
.record-name {
  font-weight: 700;
}
.record-load {
  font-size: var(--tr-font-m);
  color: var(--ion-color-primary);
  white-space: nowrap;
}
.record-detail {
  grid-column: 2 / -1;
  font-size: var(--tr-font-xs);
  color: var(--tr-text-muted);
}
.record.compact .record-detail {
  grid-column: 1 / -1;
}
.all-records {
  margin-top: var(--tr-space-3);
}
.all-records summary {
  min-height: var(--tr-touch);
  display: flex;
  align-items: center;
  font-weight: 700;
  color: var(--ion-color-primary);
  cursor: pointer;
}
</style>
