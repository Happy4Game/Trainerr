<script setup lang="ts">
import { IonButton, IonChip, IonLabel } from '@ionic/vue';
import { Mic, Minus, Plus } from 'lucide-vue-next';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { stepDown, stepUp } from '@/domain/loadSteps';
import type { Difficulty } from '@/domain/types';
import { parseVoiceSet } from '@/domain/voiceInput';
import { setAdvice, type SetAdvice } from '@/domain/setAdvice';
import { useSession } from './useSession';
import { illustrationFor } from '@/data/catalog/exerciseImages';
import { createRecognition, voiceSupported } from './voice';
import { useUnits } from '@/ui/useUnits';

const props = defineProps<{ exerciseId: string }>();
const emit = defineEmits<{ busy: []; plates: [loadKg: number] }>();

const { t, n, locale } = useI18n();
const session = useSession();

const entry = computed(() => session.entryOf(props.exerciseId));
const proposal = computed(() => session.proposalFor(props.exerciseId));
const cardLink = computed(() => `/tabs/session/exercise/${encodeURIComponent(props.exerciseId)}`);
const thumbnail = computed(() => {
  const image = illustrationFor(props.exerciseId)?.images[0];
  return image ? `${import.meta.env.BASE_URL}exercise-images/${image.file}` : undefined;
});
const steps = computed(() => (entry.value ? session.stepsOf(entry.value) : []));
const done = computed(() => session.workSetsInSession(props.exerciseId).length);
const target = computed(() => session.plannedSets(props.exerciseId));

const load = ref(0);
const reps = ref(0);
const incomplete = ref(false);
const slowTempo = ref(false);
const heard = ref<Difficulty>();
const listening = ref(false);

// Pre-filled with the proposal: the user only corrects what changed.
watch(
  [() => props.exerciseId, done, proposal],
  () => {
    if (!proposal.value) return;
    load.value = proposal.value.loadKg;
    reps.value = proposal.value.targetReps;
    incomplete.value = false;
    slowTempo.value = false;
    heard.value = undefined;
  },
  { immediate: true },
);

const partnerName = computed(() => {
  const id = session.supersetPartner(props.exerciseId);
  const e = id ? session.entryOf(id)?.exercise : undefined;
  return e ? (locale.value.startsWith('fr') ? e.name : e.nameEn) : undefined;
});
const name = computed(() =>
  entry.value
    ? locale.value.startsWith('fr')
      ? entry.value.exercise.name
      : entry.value.exercise.nameEn
    : '',
);
const { load: kg, fromInput } = useUnits();

function lighter(): void {
  load.value = stepDown(steps.value, load.value) ?? load.value;
}
function heavier(): void {
  load.value = stepUp(steps.value, load.value) ?? load.value;
}
function changeReps(delta: number): void {
  reps.value = Math.max(0, reps.value + delta);
}

// Last session with this exercise, and the advice for this set compared with the previous one.
const previousToday = computed(() => session.workSetsInSession(props.exerciseId).at(-1));
/** Help lines for the first two sessions only: then the screen stays short. */
const learning = computed(() => session.history.value.length < 2);
const lastTime = computed(() => session.lastTimeSets(props.exerciseId));
const usual = computed(() =>
  session.references.value.find((r) => r.exerciseId === props.exerciseId),
);
const lastTimeText = computed(() =>
  lastTime.value.map((set) => `${kg(set.loadKg)} × ${n(set.reps)}`).join(', '),
);
const advice = computed<SetAdvice>(() =>
  proposal.value ? setAdvice(proposal.value, session.previousFor(props.exerciseId)) : 'first',
);
const ADVICE_ICON: Record<SetAdvice, string> = {
  moreLoad: '↑',
  moreReps: '↗',
  same: '=',
  lighter: '↓',
  first: '★',
  comeback: '↺',
};

const DIFFICULTIES: { value: Difficulty; color: string }[] = [
  { value: 'easy', color: 'success' },
  { value: 'ok', color: 'primary' },
  { value: 'hard', color: 'warning' },
  { value: 'fail', color: 'danger' },
];

async function validate(difficulty: Difficulty): Promise<void> {
  await session.logSet({
    exerciseId: props.exerciseId,
    loadKg: load.value,
    reps: reps.value,
    difficulty,
    ...(incomplete.value ? { completeReps: false } : {}),
    ...(slowTempo.value ? { slowTempo: true } : {}),
  });
}

function listen(): void {
  const recognition = createRecognition(locale.value);
  if (!recognition) return;
  listening.value = true;
  recognition.onresult = (event) => {
    const heardSet = parseVoiceSet(event.results[0]?.[0]?.transcript ?? '');
    // Spoken numbers are in the user's unit.
    if (heardSet.loadKg !== undefined) load.value = fromInput(heardSet.loadKg);
    if (heardSet.reps !== undefined) reps.value = heardSet.reps;
    heard.value = heardSet.difficulty;
  };
  recognition.onend = () => (listening.value = false);
  recognition.start();
}
</script>

<template>
  <section v-if="entry && proposal" class="entry" :aria-label="name">
    <router-link :to="cardLink" class="header" :aria-label="t('session.seeCard', { name })">
      <img v-if="thumbnail" :src="thumbnail" alt="" class="thumb" />
      <span class="title">
        <h2>{{ name }}</h2>
        <span class="hint">{{ t('session.seeMovement') }} ›</span>
      </span>
    </router-link>

    <div class="set-number">
      <strong>{{
        t('session.setNumber', { current: Math.min(done + 1, target), total: target })
      }}</strong>
      <ion-button
        v-if="session.canAddSet(exerciseId)"
        size="small"
        fill="outline"
        class="extra-set"
        :aria-label="t('session.extraSet.label')"
        @click="session.extraSet(exerciseId)"
      >
        {{ t('session.extraSet.short') }}
      </ion-button>
    </div>
    <div v-if="partnerName" class="superset" role="note">
      <span>{{ t('session.superset', { name: partnerName }) }}</span>
      <ion-button
        size="small"
        fill="outline"
        color="light"
        :aria-label="t('session.splitNamed', { name: partnerName })"
        @click="session.splitSuperset(exerciseId)"
      >
        {{ t('session.split') }}
      </ion-button>
    </div>

    <!-- What was done before, and what to do now -->
    <div class="coach" :class="advice" role="note">
      <p v-if="previousToday" class="before">
        {{
          t('session.coach.previousSet', {
            set: `${kg(previousToday.loadKg)} × ${n(previousToday.reps)}`,
          })
        }}
      </p>
      <p v-else-if="lastTime.length > 0" class="before">
        {{ t('session.coach.lastTime', { sets: lastTimeText }) }}
      </p>
      <p v-else-if="usual" class="before">
        {{ t('session.coach.usual', { set: `${kg(usual.loadKg)} × ${n(usual.reps)}` }) }}
      </p>
      <p v-else class="before">{{ t('session.coach.noHistory') }}</p>
      <p class="advice">
        <span class="arrow" aria-hidden="true">{{ ADVICE_ICON[advice] }}</span>
        {{
          t(`session.coach.advice.${advice}`, {
            load: kg(proposal.loadKg),
            reps: n(proposal.targetReps),
          })
        }}
      </p>
      <p class="why">{{ t(`session.reason.${proposal.reason}`) }}</p>
    </div>
    <p v-if="proposal.reminders.includes('rangeOfMotion')" class="reminder" role="note">
      {{ t('session.reminder.rangeOfMotion') }}
    </p>
    <p v-if="proposal.reminders.includes('technique')" class="reminder" role="note">
      {{ t('session.reminder.technique') }}
    </p>

    <h3 class="step"><span class="badge">1</span> {{ t('session.steps.do') }}</h3>
    <p v-if="learning" class="help">{{ t('session.steps.doHelp') }}</p>
    <div class="stepper">
      <span class="stepper-label">{{ t('session.load') }}</span>
      <ion-button fill="outline" :aria-label="t('session.lighter')" @click="lighter">
        <Minus :size="24" aria-hidden="true" />
      </ion-button>
      <output class="value" data-testid="load">{{ kg(load) }}</output>
      <ion-button fill="outline" :aria-label="t('session.heavier')" @click="heavier">
        <Plus :size="24" aria-hidden="true" />
      </ion-button>
    </div>
    <div class="stepper">
      <span class="stepper-label">{{ t('session.reps') }}</span>
      <ion-button fill="outline" :aria-label="t('session.fewerReps')" @click="changeReps(-1)">
        <Minus :size="24" aria-hidden="true" />
      </ion-button>
      <output class="value" data-testid="reps">{{ n(reps) }}</output>
      <ion-button fill="outline" :aria-label="t('session.moreReps')" @click="changeReps(1)">
        <Plus :size="24" aria-hidden="true" />
      </ion-button>
      <ion-button fill="clear" :aria-label="t('session.halfRep')" @click="changeReps(0.5)">
        +½
      </ion-button>
    </div>

    <h3 class="step"><span class="badge">2</span> {{ t('session.howWasIt') }}</h3>
    <p v-if="learning" class="help">{{ t('session.steps.feelHelp') }}</p>
    <div class="difficulties">
      <ion-button
        v-for="d in DIFFICULTIES"
        :key="d.value"
        :color="d.color"
        :fill="heard && heard !== d.value ? 'outline' : 'solid'"
        :aria-label="t(`difficulty.${d.value}`)"
        @click="validate(d.value)"
      >
        <span class="difficulty">
          <span class="difficulty-name">{{ t(`difficulty.${d.value}`) }}</span>
          <span class="difficulty-hint">{{ t(`session.difficultyHint.${d.value}`) }}</span>
        </span>
      </ion-button>
    </div>

    <details class="more">
      <summary>{{ t('session.moreOptions') }}</summary>
      <div class="flags">
        <ion-chip
          :outline="!incomplete"
          v-bind="incomplete ? { color: 'warning' } : {}"
          role="switch"
          :aria-checked="incomplete"
          @click="incomplete = !incomplete"
        >
          <ion-label>{{ t('session.incomplete') }}</ion-label>
        </ion-chip>
        <ion-chip
          :outline="!slowTempo"
          v-bind="slowTempo ? { color: 'tertiary' } : {}"
          role="switch"
          :aria-checked="slowTempo"
          @click="slowTempo = !slowTempo"
        >
          <ion-label>{{ t('session.slowTempo') }}</ion-label>
        </ion-chip>
      </div>
      <ion-button
        v-if="voiceSupported()"
        fill="outline"
        color="medium"
        :disabled="listening"
        @click="listen"
      >
        <Mic :size="18" aria-hidden="true" class="icon" />
        {{ listening ? t('session.voice.listening') : t('session.voice.start') }}
      </ion-button>
    </details>

    <div class="tools">
      <ion-button fill="outline" color="medium" @click="emit('busy')">
        {{ t('session.busy') }}
      </ion-button>
      <ion-button
        v-if="entry.exercise.equipment === 'barbell'"
        fill="outline"
        color="medium"
        @click="emit('plates', load)"
      >
        {{ t('session.plates.open') }}
      </ion-button>
    </div>
  </section>
</template>

<style scoped>
.extra-set {
  margin-inline: 4px;
  --padding-start: 8px;
  --padding-end: 8px;
  text-transform: none;
}
.header {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  color: inherit;
  text-decoration: none;
}
.header h2 {
  margin: 0;
}
.thumb {
  flex: none;
  width: 64px;
  height: 64px;
  object-fit: contain;
  border-radius: 8px;
  /* Black-on-white drawing: white card in the dark theme too. */
  background: #fff;
}
.hint {
  font-size: 0.85rem;
  color: var(--ion-color-primary);
}
h2 {
  margin-block: 0 4px;
  font-size: 1.4rem;
}
.set-number {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-block: 8px;
  font-size: 1.1rem;
}
.coach {
  margin-block: 8px 12px;
  padding: 10px 12px;
  border-radius: 12px;
  border-inline-start: 6px solid var(--ion-color-medium);
  background: var(--ion-color-light);
  color: var(--ion-color-light-contrast);
}
.coach.moreLoad,
.coach.moreReps {
  border-inline-start-color: var(--ion-color-success);
}
.coach.lighter {
  border-inline-start-color: var(--ion-color-warning);
}
.coach.first,
.coach.comeback {
  border-inline-start-color: var(--ion-color-primary);
}
.coach p {
  margin: 0;
}
.before,
.why {
  font-size: 0.9rem;
  color: var(--ion-color-medium-shade);
}
.coach .advice {
  margin-block: 4px;
  font-size: 1.15rem;
  font-weight: 700;
}
.arrow {
  display: inline-block;
  width: 1.4em;
  text-align: center;
}
.step {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-block: 16px 0;
  font-size: 1.05rem;
}
.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.6em;
  height: 1.6em;
  border-radius: 50%;
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  font-size: 0.9rem;
}
.help {
  margin-block: 2px 6px;
  font-size: 0.85rem;
  color: var(--ion-color-medium);
}
.difficulty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.difficulty-name {
  font-size: 1.05rem;
}
.difficulty-hint {
  font-size: 0.75rem;
  text-transform: none;
  font-weight: 400;
}
.more {
  margin-block-start: 12px;
}
.more summary {
  min-height: 44px;
  display: flex;
  align-items: center;
  cursor: pointer;
  color: var(--ion-color-primary);
}
.superset {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-block: 6px;
  padding: 8px 10px;
  border-radius: var(--app-radius-small);
  background: var(--ion-color-tertiary);
  color: var(--ion-color-tertiary-contrast);
}
.superset ion-button {
  margin: 0;
}
.reminder {
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--ion-color-warning);
  color: var(--ion-color-warning-contrast);
}
.stepper {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-block: 6px;
}
.stepper-label {
  width: 4.5em;
  color: var(--ion-color-medium);
}
.stepper ion-button {
  min-width: 56px;
  min-height: 52px;
}
.value {
  min-width: 5.5ch;
  font-size: 1.6rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: center;
}
.flags {
  display: flex;
  flex-wrap: wrap;
}
.difficulties {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.difficulties ion-button {
  margin: 0;
  min-height: 64px;
}
.tools {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-block-start: 12px;
}
.icon {
  margin-inline-end: 6px;
}
</style>
