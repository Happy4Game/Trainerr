<script setup lang="ts">
import { IonButton, IonChip, IonLabel } from '@ionic/vue';
import { Mic, Minus, Plus } from 'lucide-vue-next';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { stepDown, stepUp } from '@/domain/loadSteps';
import type { Difficulty } from '@/domain/types';
import { parseVoiceSet } from '@/domain/voiceInput';
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
    <p class="meta">
      {{ t('session.setNumber', { current: Math.min(done + 1, target), total: target }) }}
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
      · {{ t(`session.reason.${proposal.reason}`) }}
    </p>
    <p v-if="partnerName" class="superset" role="note">
      {{ t('session.superset', { name: partnerName }) }}
    </p>
    <p v-if="proposal.reminders.includes('rangeOfMotion')" class="reminder" role="note">
      {{ t('session.reminder.rangeOfMotion') }}
    </p>
    <p v-if="proposal.reminders.includes('technique')" class="reminder" role="note">
      {{ t('session.reminder.technique') }}
    </p>

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

    <p class="prompt">{{ t('session.howWasIt') }}</p>
    <div class="difficulties">
      <ion-button
        v-for="d in DIFFICULTIES"
        :key="d.value"
        :color="d.color"
        :fill="heard && heard !== d.value ? 'outline' : 'solid'"
        size="large"
        @click="validate(d.value)"
      >
        {{ t(`difficulty.${d.value}`) }}
      </ion-button>
    </div>

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
.meta {
  margin-block: 0 8px;
  color: var(--ion-color-medium);
}
.superset {
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--ion-color-tertiary);
  color: var(--ion-color-tertiary-contrast);
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
.prompt {
  margin-block: 12px 4px;
  font-weight: 600;
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
