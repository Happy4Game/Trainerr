<script setup lang="ts">
import { useTemplateName } from '@/ui/useTemplateName';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { Check, Settings, TrendingUp } from 'lucide-vue-next';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { openAppDatabase } from '@/data/appDatabase';
import { listBadges, type EarnedBadge } from '@/data/repositories/badgeRepository';
import { useI18n } from 'vue-i18n';
import { weeksOnPace } from '@/domain/stats';
import { estimateMinutes, loadChange, type LoadChange } from '@/domain/sessionPreview';
import { useLoadLabel } from '@/ui/session/useLoadLabel';
import { useUnits } from '@/ui/useUnits';
import AdviceCard from '@/ui/AdviceCard.vue';
import { illustrationFor } from '@/data/catalog/exerciseImages';
import { useSession } from '@/ui/session/useSession';
import { todayIso, useWeekPlan } from '@/ui/useWeekPlan';

const { t, locale } = useI18n();
const router = useRouter();
const templateLabel = useTemplateName();
const session = useSession();
const { settings, days } = useWeekPlan();
const { phase, template, active, history, preview } = session;

/** The machines of the next session, as small drawings: the session at a glance. */
const planIds = computed(() =>
  active.value
    ? active.value.plan.exercises.map((e) => e.exerciseId)
    : preview.value.map((e) => e.id),
);
const planCount = computed(() => planIds.value.length);
const loadOf = useLoadLabel();
const { load: kg } = useUnits();

interface PreviewRow {
  readonly id: string;
  readonly name: string;
  readonly thumbnail?: string;
  /** "2 × 67,5 kg" */
  readonly detail: string;
  readonly change?: LoadChange;
  readonly done: boolean;
}
/**
 * Each exercise with its sets and load. Only a step up is shown: a lighter
 * week or a pause is planned, there is nothing to worry about.
 */
const rows = computed<PreviewRow[]>(() =>
  planIds.value.map((id) => {
    const exercise = session.entryOf(id)?.exercise;
    const image = illustrationFor(id)?.images[0];
    const sets = session.plannedSets(id);
    const proposed = session.proposalFor(id)?.loadKg ?? 0;
    const doneSets = session.workSetsInSession(id).length;
    return {
      id,
      name: exercise ? (locale.value.startsWith('fr') ? exercise.name : exercise.nameEn) : id,
      ...(image ? { thumbnail: `${import.meta.env.BASE_URL}exercise-images/${image.file}` } : {}),
      detail: t('today.line', { sets, load: loadOf(id, proposed) }),
      ...(active.value && doneSets > 0
        ? {}
        : {
            change: loadChange({
              proposedKg: proposed,
              lastLoadsKg: session.lastTimeSets(id).map((s) => s.loadKg),
              assisted: exercise?.assisted === true,
            }),
          }),
      done: !!active.value && doneSets >= sets,
    };
  }),
);
const totalSets = computed(() =>
  planIds.value.reduce((total, id) => total + session.plannedSets(id), 0),
);
const minutes = computed(() => estimateMinutes(totalSets.value));
const doneCount = computed(() => rows.value.filter((r) => r.done).length);
const goingUp = computed(() => rows.value.filter((r) => r.change?.kind === 'up').length);
const changeLabel = (change: LoadChange) =>
  change.kind === 'up'
    ? t('today.change.up', { delta: kg(change.deltaKg) })
    : t('today.change.first');

const badges = ref<EarnedBadge[]>([]);
async function loadBadges(): Promise<void> {
  const { db } = await openAppDatabase();
  badges.value = await listBadges(db);
}
onMounted(loadBadges);
watch(history, loadBadges);

const today = computed(() => days.value.find((d) => d.date === todayIso()));

/** « Commencer » lance directement la séance proposée : pas d'écran intermédiaire. */
const starting = ref(false);
async function go(): Promise<void> {
  if (starting.value) return;
  starting.value = true;
  try {
    if (!active.value && preview.value.length > 0) await session.start();
    await router.push('/tabs/session');
  } finally {
    starting.value = false;
  }
}
const doneThisWeek = computed(
  () =>
    new Set(
      history.value.map((s) => s.date).filter((date) => days.value.some((d) => d.date === date)),
    ).size,
);
const streak = computed(() =>
  settings.value
    ? weeksOnPace(history.value, settings.value.sessionsPerWeek, todayIso())
    : undefined,
);
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ t('tabs.today') }}</ion-title>
        <ion-buttons slot="end">
          <ion-button router-link="/tabs/settings" :aria-label="t('settings.title')">
            <Settings :size="24" aria-hidden="true" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p v-if="phase === 'loading'" role="status">{{ t('catalog.loading') }}</p>
      <template v-else>
        <section class="hero" :aria-label="t('today.next')">
          <p class="eyebrow">
            {{
              active
                ? t('today.inProgressShort')
                : today?.session
                  ? t('today.plannedAt', { start: today.session.start })
                  : t('today.noPlan')
            }}
          </p>
          <h2 v-if="active">{{ templateLabel(active.templateId) }}</h2>
          <h2 v-else-if="template">{{ templateLabel(template.id) }}</h2>
          <p v-if="!active && !today?.session" class="hint">{{ t('today.restDay') }}</p>
          <p v-if="planCount > 0" class="meta">
            <span>{{ t('today.exercises', planCount) }}</span>
            <span>{{ t('session.menu.sets', totalSets) }}</span>
            <span>{{ t('session.menu.minutes', { minutes }) }}</span>
          </p>
          <p v-if="active && planCount > 0" class="hint">
            {{ t('today.doneOf', { done: doneCount, total: planCount }) }}
          </p>
          <p v-else-if="goingUp > 0" class="hint">{{ t('today.goingUp', goingUp) }}</p>
          <ol v-if="rows.length > 0" class="preview">
            <li v-for="row in rows" :key="row.id" :class="{ done: row.done }">
              <img v-if="row.thumbnail" :src="row.thumbnail" alt="" />
              <span class="preview-text">
                <span class="preview-name">{{ row.name }}</span>
                <span class="preview-detail">{{ row.detail }}</span>
              </span>
              <Check v-if="row.done" :size="20" :aria-label="t('today.exerciseDone')" />
              <span v-else-if="row.change?.kind === 'up'" class="change">
                <TrendingUp :size="14" aria-hidden="true" />
                {{ changeLabel(row.change) }}
              </span>
              <span v-else-if="row.change?.kind === 'first'" class="change first">
                {{ changeLabel(row.change) }}
              </span>
            </li>
          </ol>
          <ion-button expand="block" size="large" :disabled="starting" @click="go">
            {{ active ? t('today.resume') : t('today.go') }}
          </ion-button>
          <ion-button
            v-if="!active && planCount > 0"
            class="other"
            expand="block"
            fill="clear"
            router-link="/tabs/session"
          >
            {{ t('today.otherChoice') }}
          </ion-button>
        </section>

        <ion-card v-if="settings">
          <ion-card-header>
            <ion-card-title>{{ t('today.week') }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p class="week-count">
              <strong>{{ doneThisWeek }}</strong> / {{ settings.sessionsPerWeek }}
              <span>{{ t('today.weekSessions', settings.sessionsPerWeek) }}</span>
            </p>
            <div
              class="week-bar"
              role="progressbar"
              :aria-valuenow="doneThisWeek"
              aria-valuemin="0"
              :aria-valuemax="settings.sessionsPerWeek"
              :aria-label="
                t('today.weekCount', { done: doneThisWeek, target: settings.sessionsPerWeek })
              "
            >
              <span
                v-for="i in settings.sessionsPerWeek"
                :key="i"
                :class="{ filled: i <= doneThisWeek }"
              />
            </div>
            <p v-if="streak && streak.current > 0" class="streak">
              🔥 {{ t('today.streak', streak.current) }}
            </p>
            <p v-if="badges.length > 0" class="badges">
              <span v-for="badge in badges" :key="badge.code" class="badge">
                <span aria-hidden="true">🏅</span> {{ t(`badges.${badge.code}`) }}
              </span>
            </p>
            <ion-button fill="clear" router-link="/tabs/planning">{{
              t('today.seePlanning')
            }}</ion-button>
          </ion-card-content>
        </ion-card>

        <AdviceCard />
      </template>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.hero {
  position: relative;
  overflow: hidden;
  margin-block-end: var(--tr-space-4);
  padding: var(--tr-space-5);
  border-radius: var(--tr-radius-l);
  background: var(--tr-hero);
  color: var(--tr-hero-text);
  box-shadow: var(--tr-shadow-2);
  animation: tr-rise var(--tr-duration-slow) var(--tr-ease-out);
}
/* Halo discret en haut à droite : du relief sans image. */
.hero::after {
  content: '';
  position: absolute;
  inset-block-start: -60px;
  inset-inline-end: -60px;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: rgb(255 255 255 / 14%);
  pointer-events: none;
}
.hero h2 {
  margin: 2px 0 6px;
  font-size: var(--tr-font-xl);
  font-weight: var(--tr-weight-black);
  letter-spacing: -0.02em;
  line-height: 1.1;
}
.eyebrow {
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.85;
}
.hint {
  margin: 4px 0 10px;
  opacity: 0.85;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: var(--tr-space-2) 0;
}
.meta span {
  padding: 2px 10px;
  border-radius: var(--tr-radius-pill);
  background: rgb(255 255 255 / 18%);
  font-size: 0.9rem;
  font-weight: 700;
}
.preview {
  position: relative; /* above the halo */
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 6px;
  margin: var(--tr-space-3) 0 0;
  padding: 0;
  list-style: none;
}
.preview li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px;
  border-radius: 12px;
  background: rgb(0 0 0 / 14%);
}
.preview li.done {
  opacity: 0.6;
}
.preview img {
  flex: none;
  width: 40px;
  height: 40px;
  object-fit: contain;
  border-radius: 8px;
  background: #fff; /* dessins au trait noir : fond blanc dans les deux thèmes */
}
.preview-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}
.preview-name {
  font-weight: 700;
  line-height: 1.2;
}
.preview-detail {
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
  opacity: 0.9;
}
.change {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 2px;
  padding: 2px 8px;
  border-radius: var(--tr-radius-pill);
  background: var(--tr-hero-text);
  color: var(--ion-color-primary);
  font-size: 0.8rem;
  font-weight: 800;
  white-space: nowrap;
}
.change.first {
  background: rgb(255 255 255 / 18%);
  color: var(--tr-hero-text);
}
.hero ion-button:not(.other) {
  --background: var(--tr-hero-text);
  --color: var(--ion-color-primary);
  --border-radius: var(--tr-radius-m);
  margin-block-start: var(--tr-space-4);
  min-height: 56px;
  font-size: 1.1rem;
}
.hero ion-button.other {
  --color: var(--tr-hero-text);
  margin-block-start: var(--tr-space-2);
  min-height: 48px;
}
.week-count {
  margin: 0 0 var(--tr-space-3);
  font-size: var(--tr-font-m);
  color: var(--tr-text-muted);
}
.week-count strong {
  font-size: var(--tr-font-xxl);
  font-weight: var(--tr-weight-black);
  font-variant-numeric: tabular-nums;
  color: var(--tr-text);
}
.week-bar {
  display: flex;
  gap: 6px;
}
.week-bar span {
  flex: 1;
  height: 12px;
  border-radius: 6px;
  background: var(--ion-color-light);
}
.week-bar span.filled {
  background: var(--ion-color-primary);
}
.streak {
  margin-block: 12px 0;
  font-weight: 600;
}
.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-block: 8px;
}
.badge {
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--ion-color-light);
  color: var(--ion-color-light-contrast);
  font-size: 0.85rem;
}
</style>
