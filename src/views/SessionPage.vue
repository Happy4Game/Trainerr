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
  IonLabel,
  IonList,
  IonModal,
  IonPage,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Alternative } from '@/domain/busyMachine';
import { crowdedFallback } from '@/domain/busyMachine';
import type { CatalogExercise } from '@/data/catalog/catalog';
import type { Exercise } from '@/domain/types';
import PlateCalculator from '@/ui/session/PlateCalculator.vue';
import RestTimer from '@/ui/session/RestTimer.vue';
import DiscomfortCard from '@/ui/session/DiscomfortCard.vue';
import SetEntry from '@/ui/session/SetEntry.vue';
import { updateSettings, useSettings } from '@/ui/useSettings';
import { startOfWeek } from '@/domain/dates';
import type { DiscomfortResponse, DiscomfortZone } from '@/domain/advice';
import { useSession } from '@/ui/session/useSession';

const { t, n, locale } = useI18n();
const session = useSession();
const { phase, template, preview, active, step, warmup, restEndsAt, summary, crowded } = session;

const busyFor = ref<string>();
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
const kg = (value: number) => t('exercise.kg', { load: n(value) });
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

    <ion-content class="ion-padding">
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
            <template v-if="preview.length > 0">
              <ol class="plan">
                <li v-for="e in preview" :key="e.id">
                  {{ exerciseName(e) }}
                  <span class="muted"> · {{ kg(session.proposalFor(e.id)?.loadKg ?? 0) }}</span>
                </li>
              </ol>
              <ion-button expand="block" size="large" @click="session.start()">
                {{ t('session.start') }}
              </ion-button>
            </template>
            <template v-else>
              <p>{{ t('session.noFavorites', { template: t(`templates.${template.id}`) }) }}</p>
              <ion-button expand="block" fill="outline" router-link="/tabs/catalog">
                {{ t('session.goToCatalog') }}
              </ion-button>
            </template>
          </ion-card-content>
        </ion-card>
      </template>

      <!-- Pendant la séance -->
      <template v-else-if="phase === 'active' && active">
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
            <ion-list>
              <ion-item
                v-for="alternative in busyAlternatives"
                :key="alternative.exercise.id"
                button
                @click="choose(alternative)"
              >
                <ion-label class="ion-text-wrap">
                  <h3>{{ exerciseName(alternative.exercise) }}</h3>
                  <p>
                    {{ t(`session.alternative.${alternative.kind}`) }}
                    <template v-if="alternative.loadKg !== undefined">
                      · {{ kg(alternative.loadKg) }}
                    </template>
                  </p>
                </ion-label>
              </ion-item>
            </ion-list>
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

        <template v-if="step?.kind === 'exercise'">
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
          @click="session.finish()"
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
          <p>{{ t('session.summary.workload', { kg: n(Math.round(summary.workloadKg)) }) }}</p>
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
  padding-inline-start: 1.2em;
}
.plan li {
  margin-block: 4px;
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
.finish {
  margin-block-start: 24px;
}
</style>
