<script setup lang="ts">
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
import ExercisePicker from '@/ui/ExercisePicker.vue';
import ExerciseRow from '@/ui/ExerciseRow.vue';
import { useUnits } from '@/ui/useUnits';
import { updateSettings, useSettings } from '@/ui/useSettings';
import { startOfWeek } from '@/domain/dates';
import type { DiscomfortResponse, DiscomfortZone } from '@/domain/advice';
import { useSession } from '@/ui/session/useSession';
import { syncStats } from '@/ui/friends';
import { todayIso } from '@/ui/useWeekPlan';

const { t, n, locale } = useI18n();
const session = useSession();
const { phase, template, preview, readyMade, active, step, warmup, restEndsAt, summary, crowded } =
  session;
const { previousExercise } = session;

const busyFor = ref<string>();
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
    status: queue.done.includes(id) ? 'done' : id === current ? 'current' : 'next',
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
/** "3 sets · 20 kg" under an exercise of the plan. */
const planDetail = (id: string) =>
  `${t('session.nextMachine.plan', session.plannedSets(id))} · ${kg(session.proposalFor(id)?.loadKg ?? 0)}`;
/** Card of a machine; a banner there leads back to the session. */
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

const loggedSets = computed(() =>
  (active.value?.sets ?? []).map((set) => ({
    ...set,
    label: `${nameOf(set.exerciseId)} — ${kg(set.loadKg)} × ${n(set.reps)}`,
  })),
);

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
          <template v-if="active"> · {{ t(`templates.${active.templateId}`) }}</template>
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
              {{ t('session.next', { template: t(`templates.${template.id}`) }) }}
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
            <template v-if="preview.length > 0">
              <ol class="plan">
                <li v-for="e in preview" :key="e.id">
                  <ExerciseRow
                    :exercise-id="e.id"
                    :name="exerciseName(e)"
                    :detail="planDetail(e.id)"
                    :to="cardLink(e.id)"
                  />
                </li>
              </ol>
              <ion-button expand="block" size="large" @click="session.start()">
                {{ t('session.start') }}
              </ion-button>
              <ion-button
                v-if="session.expressPreview.value.length > 0"
                expand="block"
                fill="outline"
                @click="session.start({ express: true })"
              >
                {{ t('session.express') }}
              </ion-button>
            </template>
            <template v-else-if="!readyMade">
              <p>{{ t('session.noFavorites', { template: t(`templates.${template.id}`) }) }}</p>
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
              <ol class="plan">
                <li v-for="e in readyMade.exercises" :key="e.id">
                  <ExerciseRow
                    :exercise-id="e.id"
                    :name="exerciseName(e)"
                    :detail="planDetail(e.id)"
                    :to="cardLink(e.id)"
                  >
                    <template #badge>
                      <span
                        v-if="preview.length > 0 && readyMade.suggestedIds.includes(e.id)"
                        class="tag"
                        >{{ t('session.readyMade.suggested') }}</span
                      >
                    </template>
                  </ExerciseRow>
                </li>
              </ol>
              <ion-button expand="block" size="large" @click="session.start({ readyMade: true })">
                {{ t('session.readyMade.start') }}
              </ion-button>
              <ion-button expand="block" fill="outline" @click="session.adoptReadyMade()">
                {{ t('session.readyMade.adopt', readyMade.suggestedIds.length) }}
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
              @click="session.start({ home: true })"
            >
              {{ t('session.home') }}
            </ion-button>
            <MobilityCard :muscles="template.muscles" />
          </ion-card-content>
        </ion-card>
      </template>

      <!-- Pendant la séance -->
      <template v-else-if="phase === 'active' && active">
        <ion-button
          v-if="previousExercise"
          fill="clear"
          size="small"
          class="go-back"
          @click="session.goBack()"
        >
          {{ t('session.goBack', { name: nameOf(previousExercise) }) }}
        </ion-button>
        <ion-button
          v-if="previousExercise && session.canAddSet(previousExercise)"
          fill="clear"
          size="small"
          class="go-back"
          @click="session.extraSet(previousExercise)"
        >
          {{ t('session.extraSet.previous', { name: nameOf(previousExercise) }) }}
        </ion-button>
        <RestTimer v-if="restEndsAt" :ends-at="restEndsAt" @done="session.endRest()" />

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

        <DiscomfortCard
          v-if="reportingDiscomfort"
          :remaining="remainingExercises"
          :reports-this-week="reportsThisWeek"
          @apply="onDiscomfort"
          @close="reportingDiscomfort = false"
        />

        <details v-if="progress.length > 1" class="progress">
          <summary :aria-label="t('session.progress.label')">
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
            <span class="see-all">{{ t('session.progress.seeAll') }}</span>
          </summary>
          <ol class="progress-list">
            <li
              v-for="e in progress"
              :key="e.id"
              :class="e.status"
              :aria-current="e.status === 'current' ? 'step' : undefined"
            >
              <span class="mark" aria-hidden="true">{{
                e.status === 'done' ? '✓' : e.status === 'current' ? '●' : '○'
              }}</span>
              <span class="visually-hidden">{{ t(`session.progress.status.${e.status}`) }}</span>
              {{ e.name }}
            </li>
          </ol>
        </details>

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
          <SetEntry :exercise-id="step.exerciseId" @busy="onBusy" @plates="platesLoad = $event" />
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
              {{ set.label }}
              <span class="muted">
                · {{ set.warmup ? t('session.warmupShort') : t(`difficulty.${set.difficulty}`) }}
              </span>
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
      <ion-card v-else-if="phase === 'finished' && summary">
        <ion-card-header>
          <ion-card-title>{{ t('session.summary.title') }}</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p>{{ t('session.summary.sets', summary.sets) }}</p>
          <p v-for="record in summary.records" :key="record.exerciseId" class="highlight">
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
          <p v-if="summary.weeksOnPace >= 2">
            {{ t('session.summary.streak', summary.weeksOnPace) }}
          </p>
          <p v-for="badge in summary.badges" :key="badge" class="highlight">
            {{ t('session.summary.badge', { badge: t(`badges.${badge}`) }) }}
          </p>
          <p>{{ t('session.summary.workload', { load: kg(Math.round(summary.workloadKg)) }) }}</p>
          <p v-if="summary.carryOver.length > 0">
            {{ t('session.carryOver', { names: summary.carryOver.map(nameOf).join(', ') }) }}
          </p>
          <ion-button expand="block" @click="session.closeSummary()">{{
            t('session.summary.close')
          }}</ion-button>
        </ion-card-content>
      </ion-card>

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
.plan {
  margin: 8px 0 12px;
  padding: 0;
  list-style: none;
}
.plan li + li {
  border-block-start: 1px solid var(--ion-color-light);
}
.ready-made {
  margin-block-start: 12px;
}
.ready-made h3 {
  margin: 0 0 4px;
  font-size: 1.05rem;
}
.tag {
  margin-inline-end: 6px;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--ion-color-light);
  color: var(--ion-color-light-contrast);
  font-size: 0.75rem;
}
.progress {
  margin-block: 4px 12px;
}
.progress summary {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  cursor: pointer;
  list-style: none;
}
.progress summary::-webkit-details-marker {
  display: none;
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
  color: var(--ion-color-primary);
}
.progress[open] .see-all {
  visibility: hidden;
}
.progress-list {
  margin-block-start: 8px !important;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.progress-list li {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.8rem;
  background: var(--ion-color-light);
  color: var(--ion-color-medium-shade);
}
.progress-list li.done {
  text-decoration: line-through;
}
.progress-list li.current {
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  font-weight: 700;
}
.mark {
  margin-inline-end: 4px;
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
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
