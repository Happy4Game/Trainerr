<script setup lang="ts">
import { CalendarCheck, ChevronRight } from 'lucide-vue-next';
import EmptyState from '@/ui/EmptyState.vue';
import { useTemplateName } from '@/ui/useTemplateName';
import {
  IonContent,
  IonHeader,
  IonLabel,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { recordsBySession, sessionWorkload } from '@/domain/stats';
import BodyView from '@/ui/BodyView.vue';
import { useSession } from '@/ui/session/useSession';
import { useUnits } from '@/ui/useUnits';
import StatsView from '@/ui/StatsView.vue';

const VIEWS = ['sessions', 'stats', 'body'] as const;
const view = ref<(typeof VIEWS)[number]>('sessions');

const { t, n, locale } = useI18n();
const templateLabel = useTemplateName();
const session = useSession();
const { load } = useUnits();

const sessions = computed(() => [...session.history.value].reverse());
/** Records on the real load: less help on an assisted machine is a record too. */
const records = computed(() => recordsBySession(session.realHistory.value));
const isRecord = (sessionId: string, exerciseId: string) =>
  records.value.get(sessionId)?.has(exerciseId) === true;

const formatDate = (date: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale.value, { ...options, timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  );
const dateLabel = (date: string) =>
  formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' });

/** Most recent month first, sessions newest first inside it. */
const months = computed(() => {
  const groups: { key: string; title: string; sessions: typeof sessions.value }[] = [];
  for (const s of sessions.value) {
    const key = s.date.slice(0, 7);
    let group = groups.at(-1);
    if (group?.key !== key) {
      group = { key, title: formatDate(s.date, { month: 'long', year: 'numeric' }), sessions: [] };
      groups.push(group);
    }
    group.sessions.push(s);
  }
  return groups;
});

const nameOf = (id: string) => {
  const e = session.entryOf(id)?.exercise;
  return e ? (locale.value.startsWith('fr') ? e.name : e.nameEn) : id;
};

type LoggedSet = { exerciseId: string; loadKg: number; reps: number; warmup?: boolean };

/** One line per exercise, in the order done, with its work sets. */
function exercises(sets: readonly LoggedSet[]) {
  const byExercise = new Map<string, string[]>();
  for (const set of sets) {
    if (set.warmup) continue;
    const list = byExercise.get(set.exerciseId) ?? [];
    list.push(`${load(set.loadKg)} × ${n(set.reps)}`);
    byExercise.set(set.exerciseId, list);
  }
  return [...byExercise.entries()].map(([id, sets]) => ({ id, name: nameOf(id), sets }));
}
const workSets = (sets: readonly LoggedSet[]) => sets.filter((set) => !set.warmup).length;
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ t('tabs.history') }}</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment
          :value="view"
          @ion-change="view = ($event.detail.value as (typeof VIEWS)[number]) ?? 'sessions'"
        >
          <ion-segment-button v-for="v in VIEWS" :key="v" :value="v">
            <ion-label>{{ t(`history.views.${v}`) }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <StatsView v-if="view === 'stats'" />
      <BodyView v-else-if="view === 'body'" />
      <EmptyState
        v-else-if="sessions.length === 0"
        :icon="CalendarCheck"
        :title="t('emptyStates.history')"
        :text="t('history.empty')"
        :action="t('emptyStates.start')"
        to="/tabs/session"
      />
      <template v-else>
        <section v-for="month in months" :key="month.key" class="month">
          <h2>
            <span class="month-name">{{ month.title }}</span>
            <span class="month-count">{{ t('history.sessions', month.sessions.length) }}</span>
          </h2>
          <ul class="sessions">
            <li v-for="s in month.sessions" :key="s.id">
              <router-link
                :to="`/tabs/history/${s.id}`"
                class="card"
                :aria-label="
                  t('history.edit', {
                    session: `${templateLabel(s.templateId)} · ${dateLabel(s.date)}`,
                  })
                "
              >
                <div class="head">
                  <div class="date" aria-hidden="true">
                    <span class="weekday">{{ formatDate(s.date, { weekday: 'short' }) }}</span>
                    <span class="number">{{ formatDate(s.date, { day: 'numeric' }) }}</span>
                  </div>
                  <div class="title">
                    <h3>{{ templateLabel(s.templateId) }}</h3>
                    <p class="figures">
                      {{
                        [
                          t('customSession.exercises', exercises(s.sets).length),
                          t('history.sets', workSets(s.sets)),
                          t('history.lifted', { load: load(Math.round(sessionWorkload(s))) }),
                        ].join(' · ')
                      }}
                    </p>
                  </div>
                  <ChevronRight :size="20" class="chevron" aria-hidden="true" />
                </div>
              </router-link>
              <ul
                class="exercises"
                :aria-label="t('history.exercisesOf', { session: templateLabel(s.templateId) })"
              >
                <li v-for="e in exercises(s.sets)" :key="e.id">
                  <span class="exercise-name">
                    {{ e.name }}
                    <span
                      v-if="isRecord(s.id, e.id)"
                      class="record"
                      role="img"
                      :aria-label="t('history.record')"
                      >🏆</span
                    >
                  </span>
                  <span class="chips">
                    <span v-for="(set, i) in e.sets" :key="i" class="chip">{{ set }}</span>
                  </span>
                </li>
              </ul>
              <p v-if="s.note" class="note">« {{ s.note }} »</p>
            </li>
          </ul>
        </section>
      </template>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.month + .month {
  margin-block-start: 24px;
}
.month h2 {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin: 0 4px 10px;
  font-size: 1.1rem;
  font-weight: 800;
}
.month-name::first-letter {
  text-transform: uppercase;
}
.month-count {
  color: var(--ion-color-medium-shade);
  font-size: 0.85rem;
  font-weight: 600;
}
.sessions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.sessions > li {
  overflow: hidden;
  border-radius: var(--app-radius);
  background: var(--ion-card-background);
  box-shadow: var(--app-shadow);
}
.card {
  display: block;
  padding: 12px 12px 8px;
  color: inherit;
  text-decoration: none;
}
.head {
  display: flex;
  align-items: center;
  gap: 12px;
}
.date {
  display: flex;
  flex: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(var(--ion-color-primary-rgb), 0.12);
  color: var(--ion-color-primary);
  line-height: 1.05;
}
.weekday {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: capitalize;
}
.number {
  font-size: 1.15rem;
  font-weight: 800;
}
.title {
  flex: 1;
  min-width: 0;
}
.title h3 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
}
.figures {
  margin: 2px 0 0;
  color: var(--ion-color-medium-shade);
  font-size: 0.85rem;
}
.chevron {
  flex: none;
  color: var(--ion-color-medium);
}
.exercises {
  margin: 0;
  padding: 0 12px 10px;
  list-style: none;
}
.exercises li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px 8px;
  padding-block: 8px;
  border-block-start: 1px solid var(--ion-color-light);
}
.exercise-name {
  font-weight: 600;
}
.record {
  margin-inline-start: 4px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.chip {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--ion-color-light);
  font-size: 0.82rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.note {
  margin: 0;
  padding: 0 12px 12px;
  color: var(--ion-color-medium-shade);
  font-style: italic;
}
</style>
