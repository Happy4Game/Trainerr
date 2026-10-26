<script setup lang="ts">
import { useTemplateName } from '@/ui/useTemplateName';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonItem,
  IonModal,
  IonPage,
  IonTextarea,
  IonToggle,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { computed, ref, watch } from 'vue';
import { illustrationFor } from '@/data/catalog/exerciseImages';
import { useI18n } from 'vue-i18n';
import type { Alternative } from '@/domain/busyMachine';
import { crowdedFallback } from '@/domain/busyMachine';
import type { CatalogExercise } from '@/data/catalog/catalog';
import type { Exercise } from '@/domain/types';
import PlateCalculator from '@/ui/session/PlateCalculator.vue';
import RestTimer from '@/ui/session/RestTimer.vue';
import MobilityCard from '@/ui/MobilityCard.vue';
import DiscomfortCard from '@/ui/session/DiscomfortCard.vue';
import SetEntry from '@/ui/session/SetEntry.vue';
import ReplaceCard from '@/ui/session/ReplaceCard.vue';
import { useSessionNotification } from '@/ui/session/useSessionNotification';
import { useLoadLabel } from '@/ui/session/useLoadLabel';
import ExercisePicker from '@/ui/ExercisePicker.vue';
import SessionPlanList from '@/ui/session/SessionPlanList.vue';
import SessionOverview from '@/ui/session/SessionOverview.vue';
import SetEditModal from '@/ui/session/SetEditModal.vue';
import { Pencil } from 'lucide-vue-next';
import { useUnits } from '@/ui/useUnits';
import { updateSettings, useSettings } from '@/ui/useSettings';
import { startOfWeek } from '@/domain/dates';
import type { DiscomfortResponse, DiscomfortZone } from '@/domain/advice';
import { useSession } from '@/ui/session/useSession';
import { syncStats } from '@/ui/friends';
import { todayIso } from '@/ui/useWeekPlan';

const { t, n, locale } = useI18n();
const templateLabel = useTemplateName();
const session = useSession();
useSessionNotification();
const { phase, template, preview, readyMade, active, step, warmup, restEndsAt, summary, crowded } =
  session;
const { previousExercise } = session;

const busyFor = ref<string>();
/** Machine being swapped for another one doing the same movement. */
const replacing = ref<string>();
const overviewOpen = ref(false);
const content = ref<{ $el: { scrollToTop: (duration?: number) => Promise<void> } }>();

/** Exercises of the session in order: done, current, then the ones to come. */
const progress = computed(() => {
  const queue = active.value?.plan.queue;
  if (!queue) return [];
  const current = step.value?.kind === 'exercise' ? step.value.exerciseId : undefined;
  const ids = [
    ...new Set([...queue.done, ...queue.pending, ...queue.waiting.map((w) => w.exerciseId)]),
  ];
  return ids.map((id) => ({
    id,
    name: nameOf(id),
    status: (queue.done.includes(id) ? 'done' : id === current ? 'current' : 'next') as
      'done' | 'current' | 'next',
  }));
});
const currentIndex = computed(() => progress.value.findIndex((e) => e.status === 'current'));

/**
 * Between two machines, a screen says it clearly: the exercise just finished,
 * the next machine, and a button once there. Not inside a superset.
 */
const arrivedAt = ref<string>();
const nextMachine = computed(() => {
  const s = step.value;
  const queue = active.value?.plan.queue;
  if (s?.kind !== 'exercise' || !queue || queue.done.length === 0) return undefined;
  if (s.exerciseId === arrivedAt.value) return undefined;
  if (session.setsInSession(s.exerciseId).length > 0) return undefined;
  const partner = session.supersetPartner(s.exerciseId);
  if (partner && session.setsInSession(partner).length > 0) return undefined;
  const image = illustrationFor(s.exerciseId)?.images[0];
  return {
    id: s.exerciseId,
    finished: queue.done.at(-1),
    sets: session.plannedSets(s.exerciseId),
    loadKg: session.proposalFor(s.exerciseId)?.loadKg,
    ...(image ? { thumbnail: `${import.meta.env.BASE_URL}exercise-images/${image.file}` } : {}),
  };
});
// A session that starts (e.g. from the ready-made sessions, far down the page) starts at the top.
watch(phase, (now, before) => {
  if (now === 'active' && before !== 'active') void content.value?.$el.scrollToTop(0);
});
// A new exercise starts at the top of the screen.
watch(
  () => (step.value?.kind === 'exercise' ? step.value.exerciseId : undefined),
  (id, previous) => {
    if (id && previous && id !== previous) void content.value?.$el.scrollToTop(300);
  },
);
const pickingExercise = ref(false);
async function addExercise(id: string): Promise<void> {
  pickingExercise.value = false;
  await session.addExerciseNow(id);
}
const reportingDiscomfort = ref(false);
const { settings: appSettings } = useSettings();
// Supersets are offered, never imposed: on by default only if chosen in the settings.
const supersetChoice = ref<boolean>();
const useSupersets = computed(() => supersetChoice.value ?? appSettings.value?.supersets ?? false);
const customSessions = computed(() => appSettings.value?.customSessions ?? []);

const remainingExercises = computed(() => {
  const s = active.value;
  if (!s) return [];
  return [...s.plan.queue.pending, ...s.plan.queue.waiting.map((w) => w.exerciseId)]
    .map((id) => session.entryOf(id)?.exercise)
    .filter((e): e is CatalogExercise => !!e);
});
const today = () => new Date().toISOString().slice(0, 10);
// Same discomfort reported again this week: the advice gets stronger.
const reportsThisWeek = computed(() => {
  const counts: Record<string, number> = {};
  for (const d of appSettings.value?.discomforts ?? []) {
    if (d.date >= startOfWeek(today())) counts[d.zone] = (counts[d.zone] ?? 0) + 1;
  }
  return counts;
});

async function onDiscomfort(response: DiscomfortResponse, zone: DiscomfortZone): Promise<void> {
  await session.removeExercises(
    response.stopSession ? remainingExercises.value.map((e) => e.id) : response.removeExerciseIds,
  );
  await updateSettings({
    discomforts: [...(appSettings.value?.discomforts ?? []), { date: today(), zone }].slice(-20),
  });
}
const busyAlternatives = ref<Alternative[]>([]);
const platesLoad = ref<number>();

const nameOf = (id: string) => {
  const entry = session.entryOf(id);
  if (!entry) return id;
  return locale.value.startsWith('fr') ? entry.exercise.name : entry.exercise.nameEn;
};
const exerciseName = (e: Exercise) => nameOf(e.id);
const thumbnailOf = (id: string) => {
  const image = illustrationFor(id)?.images[0];
  return image ? `${import.meta.env.BASE_URL}exercise-images/${image.file}` : undefined;
};
const musclesOf = (e: Exercise) => e.primaryMuscles.map((m) => t(`muscles.${m}`)).join(', ');
const loadOf = useLoadLabel();
/** "3 sets · 20 kg" under an exercise of the plan. */
const planDetail = (id: string) =>
  `${t('session.nextMachine.plan', session.plannedSets(id))} · ${loadOf(id, session.proposalFor(id)?.loadKg ?? 0)}`;
/** Card of a machine; a banner there leads back to the session. */
const suggestedBadge = (id: string) =>
  preview.value.length > 0 && readyMade.value?.suggestedIds.includes(id)
    ? t('session.readyMade.suggested')
    : undefined;
const cardLink = (id: string) => `/tabs/session/exercise/${encodeURIComponent(id)}`;
const { load: kg } = useUnits();

/** Ends the session, then updates the challenges in the background: offline is fine. */
async function finishSession(): Promise<void> {
  await session.finish();
  if (!appSettings.value) return;
  syncStats(appSettings.value, session.history.value, todayIso(), {
    exerciseName: nameOf,
    load: kg,
  }).catch(() => undefined);
}
const currentId = computed(() =>
  step.value?.kind === 'exercise' ? step.value.exerciseId : undefined,
);

async function onBusy(): Promise<void> {
  const id = currentId.value;
  if (!id) return;
  busyAlternatives.value = session.alternatives(id);
  busyFor.value = id;
  await session.markMachineBusy(id);
}
async function choose(alternative: Alternative): Promise<void> {
  await session.chooseAlternative(alternative);
  busyFor.value = undefined;
}

const fallback = computed(() => {
  const s = active.value;
  if (!s || !crowded.value) return [];
  const toReplace = [...s.plan.queue.pending, ...s.plan.queue.waiting.map((w) => w.exerciseId)]
    .map((id) => session.entryOf(id)?.exercise)
    .filter((e): e is CatalogExercise => !!e);
  return crowdedFallback(toReplace, session.favoriteExercises.value);
});

/** Shortcut under the last set: every set of this machine today goes to the right one. */
const wrongMachine = ref<string>();
async function moveToRightMachine(toId: string): Promise<void> {
  const fromId = wrongMachine.value;
  wrongMachine.value = undefined;
  const ids = (active.value?.sets ?? []).filter((s) => s.exerciseId === fromId).map((s) => s.id);
  await session.moveLoggedSets(ids, toId);
}

const loggedSets = computed(() =>
  (active.value?.sets ?? []).map((set) => ({
    ...set,
    label: `${nameOf(set.exerciseId)} — ${loadOf(set.exerciseId, set.loadKg)} × ${n(set.reps)}`,
  })),
);

/** Set being corrected, and the last set logged (shown under the rest timer). */
const editing = ref<(typeof loggedSets.value)[number]>();
const lastLogged = computed(() => {
  const last = loggedSets.value.at(-1);
  return last && !last.warmup ? last : undefined;
});

async function logWarmup(): Promise<void> {
  const id = currentId.value;
  if (!id || !warmup.value) return;
  await session.logSet({
    exerciseId: id,
    loadKg: warmup.value.loadKg,
    reps: warmup.value.reps,
    difficulty: 'easy',
    warmup: true,
  });
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>
          {{ t('tabs.session') }}
          <template v-if="active"> · {{ templateLabel(active.templateId) }}</template>
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content ref="content" class="ion-padding">
      <p v-if="phase === 'loading' || session.catalogState.value.kind !== 'ready'" role="status">
        {{ t('catalog.loading') }}
      </p>
      <p v-else-if="phase === 'error'" role="alert">{{ session.errorMessage.value }}</p>

      <!-- Avant la séance -->
      <template v-else-if="phase === 'idle' && template">
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              {{ t('session.next', { template: templateLabel(template.id) }) }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p class="muted">
              {{
                session.cycle.value.light
                  ? t('cycle.light', session.cycle.value)
                  : t('cycle.week', session.cycle.value)
              }}
            </p>
            <ion-item lines="none" class="superset-choice">
              <ion-toggle
                :checked="useSupersets"
                @ion-change="supersetChoice = $event.detail.checked"
              >
                <span class="toggle-title">{{ t('session.supersetToggle') }}</span>
                <span class="toggle-help">{{ t('session.supersetToggleHelp') }}</span>
              </ion-toggle>
            </ion-item>
            <template v-if="preview.length > 0">
              <SessionPlanList
                :exercises="preview"
                :supersets="useSupersets"
                :name="exerciseName"
                :detail="planDetail"
                :to="cardLink"
              />
              <ion-button
                expand="block"
                size="large"
                @click="session.start({ supersets: useSupersets })"
              >
                {{ t('session.start') }}
              </ion-button>
              <ion-button
                v-if="session.expressPreview.value.length > 0"
                expand="block"
                fill="outline"
                @click="session.start({ express: true, supersets: useSupersets })"
              >
                {{ t('session.express') }}
              </ion-button>
              <ion-button expand="block" fill="clear" router-link="/tabs/session/presets">
                {{ t('presets.shortcut') }}
              </ion-button>
            </template>
            <template v-else-if="!readyMade">
              <p>{{ t('session.noFavorites', { template: templateLabel(template.id) }) }}</p>
              <ion-button expand="block" fill="outline" router-link="/tabs/catalog">
                {{ t('session.goToCatalog') }}
              </ion-button>
            </template>
            <!-- Not enough favorites: a ready-made session with popular machines. -->
            <section v-if="readyMade" class="ready-made" :aria-label="t('session.readyMade.title')">
              <h3>{{ t('session.readyMade.title') }}</h3>
              <p class="muted">
                {{
                  preview.length === 0
                    ? t('session.readyMade.introNone')
                    : t('session.readyMade.intro', preview.length)
                }}
              </p>
              <SessionPlanList
                :exercises="readyMade.exercises"
                :supersets="useSupersets"
                :name="exerciseName"
                :detail="planDetail"
                :to="cardLink"
                :badge="suggestedBadge"
              />
              <ion-button
                expand="block"
                size="large"
                @click="session.start({ readyMade: true, supersets: useSupersets })"
              >
                {{ t('session.readyMade.start') }}
              </ion-button>
              <ion-button expand="block" fill="outline" @click="session.adoptReadyMade()">
                {{ t('session.readyMade.adopt', readyMade.suggestedIds.length) }}
              </ion-button>
              <ion-button expand="block" fill="clear" router-link="/tabs/session/presets">
                {{ t('presets.shortcut') }}
              </ion-button>
              <ion-button expand="block" fill="clear" router-link="/tabs/catalog">
                {{ t('session.goToCatalog') }}
              </ion-button>
            </section>
            <!-- At home, any exercise doable with the declared equipment: no favorite needed. -->
            <ion-button
              v-if="session.homePreview.value.length > 0"
              expand="block"
              fill="clear"
              @click="session.start({ home: true, supersets: useSupersets })"
            >
              {{ t('session.home') }}
            </ion-button>
            <MobilityCard :muscles="template.muscles" />
          </ion-card-content>
        </ion-card>

        <section class="my-sessions" :aria-label="t('presets.title')">
          <h2>{{ t('presets.title') }}</h2>
          <p class="muted">{{ t('presets.intro') }}</p>
          <ion-button expand="block" fill="outline" router-link="/tabs/session/presets">
            {{ t('presets.open') }}
          </ion-button>
        </section>

        <section class="my-sessions" :aria-label="t('customSession.mine')">
          <h2>{{ t('customSession.mine') }}</h2>
          <p v-if="customSessions.length === 0" class="muted">{{ t('customSession.intro') }}</p>
          <div v-for="c in customSessions" :key="c.id" class="custom">
            <div class="custom-text">
              <strong>{{ c.name }}</strong>
              <span class="muted">{{ t('customSession.exercises', c.exerciseIds.length) }}</span>
            </div>
            <ion-button
              fill="clear"
              size="small"
              :router-link="`/tabs/session/custom/${c.id}`"
              :aria-label="t('customSession.editNamed', { name: c.name })"
            >
              {{ t('customSession.edit') }}
            </ion-button>
            <ion-button
              size="small"
              :aria-label="t('customSession.startNamed', { name: c.name })"
              @click="session.start({ custom: c.id, supersets: useSupersets })"
            >
              {{ t('customSession.start') }}
            </ion-button>
          </div>
          <ion-button expand="block" fill="outline" router-link="/tabs/session/custom/new">
            {{ t('customSession.create') }}
          </ion-button>
        </section>
      </template>

      <!-- Pendant la séance -->
      <template v-else-if="phase === 'active' && active">
        <div v-if="previousExercise" class="previous">
          <span class="previous-name">
            {{ t('session.previous', { name: nameOf(previousExercise) }) }}
          </span>
          <ion-button
            fill="outline"
            size="small"
            :aria-label="t('session.goBack', { name: nameOf(previousExercise) })"
            @click="session.goBack()"
          >
            {{ t('session.goBackShort') }}
          </ion-button>
          <ion-button
            v-if="session.canAddSet(previousExercise)"
            fill="outline"
            size="small"
            :aria-label="t('session.extraSet.previous', { name: nameOf(previousExercise) })"
            @click="session.extraSet(previousExercise)"
          >
            {{ t('session.extraSet.short') }}
          </ion-button>
        </div>
        <RestTimer
          v-if="restEndsAt"
          :ends-at="restEndsAt"
          @done="session.endRest()"
          @adjust="session.adjustRest($event)"
        />
        <p v-if="lastLogged" :key="lastLogged.id" class="just-logged" role="status">
          ✓ {{ t('setEdit.last', { set: lastLogged.label }) }}
          <button type="button" class="link" @click="editing = lastLogged">
            {{ t('setEdit.fix') }}
          </button>
          <button type="button" class="link" @click="wrongMachine = lastLogged.exerciseId">
            {{ t('setEdit.wrongMachine.title') }}
          </button>
        </p>
        <ExercisePicker
          :open="wrongMachine !== undefined"
          :title="
            wrongMachine ? t('setEdit.wrongMachine.where', { name: nameOf(wrongMachine) }) : ''
          "
          :exclude="wrongMachine ? [wrongMachine] : []"
          @pick="moveToRightMachine"
          @close="wrongMachine = undefined"
        />
        <SetEditModal
          :set="editing"
          :name="editing ? nameOf(editing.exerciseId) : ''"
          @close="editing = undefined"
        />

        <div v-if="crowded" class="banner" role="note">
          <p>{{ t('session.crowded') }}</p>
          <ion-button
            v-for="swap in fallback"
            :key="swap.with.id"
            size="small"
            fill="outline"
            color="dark"
            @click="session.chooseAlternative({ kind: 'substitute', exercise: swap.with })"
          >
            {{
              t('session.replace', {
                from: exerciseName(swap.replaces),
                to: exerciseName(swap.with),
              })
            }}
          </ion-button>
        </div>

        <ion-card v-if="busyFor" class="busy">
          <ion-card-header>
            <ion-card-title>{{ t('session.busyTitle', { name: nameOf(busyFor) }) }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p>{{ t('session.busyHelp') }}</p>
            <ul class="alternatives">
              <li
                v-for="alternative in busyAlternatives"
                :key="alternative.exercise.id"
                class="alternative"
              >
                <img
                  v-if="thumbnailOf(alternative.exercise.id)"
                  :src="thumbnailOf(alternative.exercise.id)"
                  alt=""
                  class="alt-thumb"
                />
                <div class="alt-body">
                  <h3>{{ exerciseName(alternative.exercise) }}</h3>
                  <p class="alt-kind">{{ t(`session.alternative.${alternative.kind}`) }}</p>
                  <p class="alt-detail">
                    {{ musclesOf(alternative.exercise) }}
                    <template v-if="alternative.loadKg !== undefined">
                      · {{ kg(alternative.loadKg) }}
                    </template>
                  </p>
                  <div class="alt-actions">
                    <ion-button
                      size="small"
                      :aria-label="
                        t('session.alternative.choose', {
                          name: exerciseName(alternative.exercise),
                        })
                      "
                      @click="choose(alternative)"
                    >
                      {{ t('session.alternative.take') }}
                    </ion-button>
                    <ion-button
                      size="small"
                      fill="clear"
                      :router-link="cardLink(alternative.exercise.id)"
                    >
                      {{ t('session.seeMovement') }}
                    </ion-button>
                  </div>
                </div>
              </li>
            </ul>
            <p v-if="busyAlternatives.length === 0">{{ t('session.alternative.none') }}</p>
            <ion-button fill="clear" @click="busyFor = undefined">{{
              t('session.continue')
            }}</ion-button>
          </ion-card-content>
        </ion-card>

        <ReplaceCard v-if="replacing" :exercise-id="replacing" @close="replacing = undefined" />

        <DiscomfortCard
          v-if="reportingDiscomfort"
          :remaining="remainingExercises"
          :reports-this-week="reportsThisWeek"
          @apply="onDiscomfort"
          @close="reportingDiscomfort = false"
        />

        <button
          v-if="progress.length > 1"
          type="button"
          class="progress"
          :aria-label="t('session.overview.open')"
          @click="overviewOpen = true"
        >
          <span class="progress-title">
            {{
              currentIndex >= 0
                ? t('session.progress.title', {
                    current: currentIndex + 1,
                    total: progress.length,
                  })
                : t('session.progress.done', progress.filter((e) => e.status === 'done').length)
            }}
          </span>
          <span class="segments" aria-hidden="true">
            <span v-for="e in progress" :key="e.id" class="segment" :class="e.status" />
          </span>
          <span class="see-all">{{ t('session.progress.seeAll') }} ›</span>
        </button>
        <SessionOverview :open="overviewOpen" :exercises="progress" @close="overviewOpen = false" />

        <section
          v-if="nextMachine"
          class="next-machine"
          :aria-label="t('session.nextMachine.title')"
        >
          <p v-if="nextMachine.finished" class="finished" role="status">
            ✓ {{ t('session.nextMachine.finished', { name: nameOf(nextMachine.finished) }) }}
          </p>
          <p class="label">{{ t('session.nextMachine.title') }}</p>
          <img
            v-if="nextMachine.thumbnail"
            :src="nextMachine.thumbnail"
            alt=""
            class="next-thumb"
          />
          <h2>{{ nameOf(nextMachine.id) }}</h2>
          <p class="plan-line">
            {{ t('session.nextMachine.plan', nextMachine.sets) }}
            <template v-if="nextMachine.loadKg !== undefined">
              · {{ kg(nextMachine.loadKg) }}
            </template>
          </p>
          <ion-button expand="block" size="large" @click="arrivedAt = nextMachine.id">
            {{ t('session.nextMachine.go') }}
          </ion-button>
          <ion-button expand="block" fill="clear" :router-link="cardLink(nextMachine.id)">
            {{ t('session.seeMovement') }}
          </ion-button>
          <ion-button expand="block" fill="clear" color="medium" @click="onBusy">
            {{ t('session.busy') }}
          </ion-button>
        </section>

        <template v-else-if="step?.kind === 'exercise'">
          <ion-card v-if="warmup" class="warmup">
            <ion-card-content>
              <p>
                {{ t('session.warmup', { load: kg(warmup.loadKg), reps: warmup.reps }) }}
              </p>
              <ion-button size="small" @click="logWarmup">{{ t('session.warmupDone') }}</ion-button>
            </ion-card-content>
          </ion-card>
          <SetEntry
            :exercise-id="step.exerciseId"
            @busy="onBusy"
            @replace="replacing = step.exerciseId"
            @plates="platesLoad = $event"
          />
          <ion-button fill="outline" color="warning" @click="reportingDiscomfort = true">
            {{ t('discomfort.open') }}
          </ion-button>
          <ion-button fill="clear" color="medium" @click="session.skipExercise(step.exerciseId)">
            {{ t('session.skip') }}
          </ion-button>
        </template>

        <ion-card v-else-if="step?.kind === 'askIfFree'">
          <ion-card-header>
            <ion-card-title>{{
              t('session.isFree', { name: nameOf(step.exerciseId) })
            }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-button expand="block" @click="session.machineFree(step.exerciseId)">
              {{ t('session.free') }}
            </ion-button>
            <ion-button
              expand="block"
              fill="outline"
              @click="session.machineStillBusy(step.exerciseId)"
            >
              {{ t('session.stillBusy') }}
            </ion-button>
          </ion-card-content>
        </ion-card>

        <ion-card v-else-if="step?.kind === 'finished'">
          <ion-card-content>
            <p>{{ t('session.allDone') }}</p>
            <p v-if="step.carryOver.length > 0">
              {{ t('session.carryOver', { names: step.carryOver.map(nameOf).join(', ') }) }}
            </p>
          </ion-card-content>
        </ion-card>

        <ion-button expand="block" fill="outline" @click="pickingExercise = true">
          {{ t('session.addExercise') }}
        </ion-button>
        <ExercisePicker
          :open="pickingExercise"
          :title="t('session.addExercise')"
          :exclude="step?.kind === 'exercise' ? [step.exerciseId] : []"
          @pick="addExercise"
          @close="pickingExercise = false"
        />

        <section v-if="loggedSets.length > 0" class="logged">
          <h3>{{ t('session.logged') }}</h3>
          <ol>
            <li v-for="set in loggedSets" :key="set.id">
              <button
                type="button"
                class="logged-set"
                :aria-label="t('setEdit.open', { set: set.label })"
                @click="editing = set"
              >
                <span>
                  {{ set.label }}
                  <span class="muted">
                    ·
                    {{ set.warmup ? t('session.warmupShort') : t(`difficulty.${set.difficulty}`) }}
                  </span>
                </span>
                <Pencil :size="16" aria-hidden="true" />
              </button>
            </li>
          </ol>
          <ion-button fill="clear" size="small" @click="session.undoLastSet()">
            {{ t('session.undo') }}
          </ion-button>
        </section>

        <ion-item lines="none" class="note">
          <ion-textarea
            :model-value="active.note ?? ''"
            :label="t('session.note')"
            label-placement="stacked"
            :placeholder="t('session.notePlaceholder')"
            auto-grow
            :debounce="500"
            @ion-input="session.saveNote(String($event.detail.value ?? ''))"
          />
        </ion-item>

        <ion-button
          expand="block"
          color="dark"
          fill="outline"
          class="finish"
          @click="finishSession"
        >
          {{ t('session.finish') }}
        </ion-button>
      </template>

      <!-- Récap -->
      <section
        v-else-if="phase === 'finished' && summary"
        class="summary"
        :aria-label="t('session.summary.title')"
      >
        <div class="summary-hero">
          <span class="check" aria-hidden="true">✓</span>
          <h2>{{ t('session.summary.bravo') }}</h2>
          <p>{{ t('session.summary.title') }}</p>
        </div>
        <div class="tiles">
          <div
            class="tile"
            role="group"
            :aria-label="`${n(summary.sets)} ${t('session.summary.setsLabel', summary.sets)}`"
          >
            <strong>{{ n(summary.sets) }}</strong>
            <span>{{ t('session.summary.setsLabel', summary.sets) }}</span>
          </div>
          <div class="tile">
            <strong>{{ kg(Math.round(summary.workloadKg)) }}</strong>
            <span>{{ t('session.summary.workloadLabel') }}</span>
          </div>
          <div class="tile">
            <strong>{{ n(summary.records.length) }}</strong>
            <span>{{ t('session.summary.recordsLabel', summary.records.length) }}</span>
          </div>
        </div>
        <p v-for="record in summary.records" :key="record.exerciseId" class="highlight">
          🏆
          {{
            t('session.summary.record', {
              name: nameOf(record.exerciseId),
              load: kg(record.loadKg),
              reps: n(record.reps),
            })
          }}
        </p>
        <p v-for="id in summary.backToLevel" :key="`b${id}`" class="highlight">
          {{ t('session.summary.backToLevel', { name: nameOf(id) }) }}
        </p>
        <p v-for="badge in summary.badges" :key="badge" class="highlight">
          🏅 {{ t('session.summary.badge', { badge: t(`badges.${badge}`) }) }}
        </p>
        <p v-if="summary.weeksOnPace >= 2" class="note-line">
          🔥 {{ t('session.summary.streak', summary.weeksOnPace) }}
        </p>
        <p v-if="summary.carryOver.length > 0" class="note-line">
          {{ t('session.carryOver', { names: summary.carryOver.map(nameOf).join(', ') }) }}
        </p>
        <ion-button expand="block" size="large" @click="session.closeSummary()">{{
          t('session.summary.close')
        }}</ion-button>
      </section>

      <ion-modal :is-open="platesLoad !== undefined" @did-dismiss="platesLoad = undefined">
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ t('session.plates.title') }}</ion-title>
            <ion-button slot="end" fill="clear" @click="platesLoad = undefined">
              {{ t('session.plates.close') }}
            </ion-button>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <PlateCalculator v-if="platesLoad !== undefined" :load-kg="platesLoad" />
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.ready-made {
  margin-block-start: 12px;
}
.ready-made h3 {
  margin: 0 0 4px;
  font-size: 1.05rem;
}
.progress {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 48px;
  margin-block: 4px 12px;
  padding: 8px 12px;
  border: 0;
  border-radius: var(--app-radius-small);
  background: var(--ion-card-background);
  box-shadow: var(--app-shadow);
  color: inherit;
  font: inherit;
  text-align: start;
}
.progress-title {
  font-weight: 700;
  white-space: nowrap;
}
.segments {
  display: flex;
  gap: 4px;
}
.segment {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: var(--ion-color-light);
}
.segment.done {
  background: var(--ion-color-success);
}
.segment.current {
  background: var(--ion-color-primary);
}
.see-all {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--ion-color-primary);
  white-space: nowrap;
}
.next-machine {
  margin-block: 12px;
  padding: 16px;
  border-radius: 16px;
  border: 2px solid var(--ion-color-primary);
  text-align: center;
}
.next-machine .finished {
  margin: 0 0 12px;
  padding: 8px;
  border-radius: 8px;
  background: var(--ion-color-success);
  color: var(--ion-color-success-contrast);
  font-weight: 600;
}
.next-machine .label {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.8rem;
  color: var(--ion-color-primary);
}
.next-machine h2 {
  margin-block: 4px;
  font-size: 1.5rem;
}
.next-thumb {
  width: 160px;
  height: 160px;
  object-fit: contain;
  border-radius: 12px;
  background: #fff;
}
.plan-line {
  margin-block: 0 12px;
  color: var(--ion-color-medium-shade);
}
.alternatives {
  margin: 8px 0;
  padding: 0;
  list-style: none;
}
.alternative {
  display: flex;
  gap: 12px;
  padding-block: 10px;
  border-block-end: 1px solid var(--ion-color-light);
}
.alt-thumb {
  flex: none;
  width: 88px;
  height: 88px;
  object-fit: contain;
  border-radius: 10px;
  background: #fff;
}
.alt-body h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--ion-text-color, #000);
}
.alt-kind {
  margin: 2px 0 0;
  font-size: 0.8rem;
  color: var(--ion-color-primary);
}
.alt-detail {
  margin: 2px 0 4px;
  font-size: 0.85rem;
  color: var(--ion-color-medium-shade);
}
.alt-actions {
  display: flex;
  flex-wrap: wrap;
  margin-inline-start: -6px;
}
@media (prefers-reduced-motion: reduce) {
  .just-logged {
    animation: none;
  }
}
@keyframes pop-in {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(0.98);
  }
}
.just-logged {
  animation: pop-in 0.3s ease-out;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: -4px 0 12px;
  font-size: 0.9rem;
  color: var(--ion-color-medium-shade);
}
.link {
  min-height: 36px;
  padding: 0 4px;
  border: 0;
  background: none;
  color: var(--ion-color-primary);
  font: inherit;
  font-weight: 700;
  text-decoration: underline;
}
.logged-set {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 44px;
  padding: 4px 8px;
  border: 0;
  border-radius: var(--app-radius-small);
  background: none;
  color: inherit;
  font: inherit;
  text-align: start;
}
.logged-set:hover,
.logged-set:focus-visible {
  background: var(--ion-color-light);
}
.summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.summary-hero {
  padding: 24px 16px;
  border-radius: var(--app-radius);
  background: var(--ion-color-success);
  color: var(--ion-color-success-contrast);
  text-align: center;
}
.summary-hero .check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgb(255 255 255 / 25%);
  font-size: 2rem;
  font-weight: 800;
}
.summary-hero h2 {
  margin: 10px 0 2px;
  font-size: 1.8rem;
  font-weight: 800;
}
.summary-hero p {
  margin: 0;
  opacity: 0.9;
}
.tiles {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 6px;
  border-radius: var(--app-radius-small);
  background: var(--ion-card-background);
  box-shadow: var(--app-shadow);
  text-align: center;
}
.tile strong {
  font-size: 1.3rem;
}
.tile span {
  font-size: 0.8rem;
  color: var(--ion-color-medium-shade);
}
.summary .highlight,
.summary .note-line {
  margin: 0;
  padding: 10px 12px;
  border-radius: var(--app-radius-small);
  background: var(--ion-card-background);
}
.my-sessions {
  margin-block: 16px;
}
.my-sessions h2 {
  margin: 0 0 8px;
  font-size: 1.15rem;
  font-weight: 700;
}
.custom {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-block-end: 8px;
  padding: 10px 8px 10px 14px;
  border-radius: var(--app-radius);
  background: var(--ion-card-background);
  box-shadow: var(--app-shadow);
}
.custom-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}
.previous {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
  margin-block: 0 10px;
  font-size: 0.85rem;
  color: var(--ion-color-medium-shade);
}
.previous-name {
  flex: 1 1 12em;
}
.previous ion-button {
  margin: 0;
  --padding-start: 10px;
  --padding-end: 10px;
}
.superset-choice {
  --background: transparent;
  --padding-start: 0;
  margin-block: 4px;
}
.toggle-title {
  display: block;
  font-weight: 600;
}
.toggle-help {
  display: block;
  font-size: 0.8rem;
  color: var(--ion-color-medium-shade);
  white-space: normal;
}
.go-back {
  margin-inline-start: -8px;
  text-transform: none;
}
.muted {
  color: var(--ion-color-medium);
}
.banner {
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--ion-color-warning);
  color: var(--ion-color-warning-contrast);
}
.warmup {
  margin-inline: 0;
}
.logged h3 {
  margin-block: 20px 4px;
  font-size: 1rem;
}
.logged ol {
  padding-inline-start: 1.2em;
  margin-block: 0;
}
.highlight {
  font-weight: 600;
  color: var(--ion-color-success-shade);
}
.finish {
  margin-block-start: 24px;
}
</style>
