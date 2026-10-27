<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonHeader,
  IonInput,
  IonModal,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/vue';
import { Minus, Plus } from 'lucide-vue-next';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { StoredSet } from '@/data/repositories/sessionRepository';
import { stepDown, stepUp } from '@/domain/loadSteps';
import type { Difficulty } from '@/domain/types';
import { useUnits } from '@/ui/useUnits';
import { useRirText } from './useRirText';
import { useSession } from './useSession';
import ExercisePicker from '@/ui/ExercisePicker.vue';

/**
 * Correction of a set already validated during the session: the load and the
 * reps typed exactly (47,5 kg, 8,5 reps) or by steps, how it went, the reps in
 * reserve and the note.
 */
const props = defineProps<{ set?: StoredSet | undefined; name: string }>();
const emit = defineEmits<{ close: [] }>();

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'ok', 'hard', 'fail'];
const { t, n } = useI18n();
const session = useSession();
const { symbol, toDisplay, fromInput } = useUnits();
const rirText = useRirText();
const RIR_VALUES = [0, 1, 2, 3, 4] as const;

const load = ref(0);
const reps = ref(0);
const difficulty = ref<Difficulty>('ok');
const rir = ref<number>();
const note = ref('');
/** What is typed in the fields, kept as text while typing. */
const loadText = ref('');
const repsText = ref('');
const invalid = ref(false);
const confirmingDelete = ref(false);
/** Logged on the wrong machine: moved to the right one, with the other sets of that machine. */
const pickingMachine = ref(false);
const moveAll = ref(true);
const sameMachine = computed(() =>
  props.set
    ? (session.active.value?.sets ?? []).filter((s) => s.exerciseId === props.set?.exerciseId)
    : [],
);
// The move waits for the picker to be fully closed: closing both windows at
// once left the session screen hidden from the screen reader and the taps.
const target = ref<string>();
function pickMachine(exerciseId: string): void {
  target.value = exerciseId;
  pickingMachine.value = false;
}
async function onPickerClosed(): Promise<void> {
  pickingMachine.value = false;
  const exerciseId = target.value;
  target.value = undefined;
  if (!props.set || !exerciseId) return;
  const ids = moveAll.value ? sameMachine.value.map((s) => s.id) : [props.set.id];
  await session.moveLoggedSets(ids, exerciseId);
  emit('close');
}
watch(
  () => props.set,
  (set) => {
    if (!set) return;
    setLoad(set.loadKg);
    setReps(set.reps);
    difficulty.value = set.difficulty;
    rir.value = set.rir;
    note.value = set.note ?? '';
    invalid.value = false;
    confirmingDelete.value = false;
  },
  { immediate: true },
);

const steps = computed(() => {
  const entry = props.set ? session.entryOf(props.set.exerciseId) : undefined;
  return entry ? session.stepsOf(entry) : [];
});

const round = (value: number, step: number) => Math.round(value / step) * step;
function setLoad(kg: number): void {
  load.value = kg;
  loadText.value = n(round(toDisplay(kg), 0.01));
}
function setReps(value: number): void {
  reps.value = value;
  repsText.value = n(value);
}
const parse = (text: string) => Number(text.trim().replace(',', '.'));

async function save(): Promise<void> {
  if (!props.set) return;
  const typedLoad = parse(loadText.value);
  const typedReps = round(parse(repsText.value), 0.5);
  invalid.value = !(loadText.value.trim() !== '' && typedLoad >= 0 && typedReps > 0);
  if (invalid.value) return;
  // The typed load, unless it is only the rounded display of the same load.
  const loadKg =
    loadText.value === n(round(toDisplay(load.value), 0.01)) ? load.value : fromInput(typedLoad);
  await session.editSessionSet(props.set.id, {
    loadKg,
    reps: typedReps,
    difficulty: difficulty.value,
    rir: rir.value,
    note: note.value,
  });
  emit('close');
}

async function remove(): Promise<void> {
  if (!props.set) return;
  await session.removeSessionSet(props.set.id);
  emit('close');
}
</script>

<template>
  <ion-modal
    :is-open="set !== undefined"
    :initial-breakpoint="1"
    :breakpoints="[0, 1]"
    @did-dismiss="emit('close')"
  >
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ t('setEdit.title') }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="emit('close')">{{ t('picker.cancel') }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p class="name">{{ name }}</p>
      <div class="stepper">
        <ion-button fill="outline" @click="setLoad(stepDown(steps, load) ?? load)">
          <span class="visually-hidden">{{ t('session.lighter') }}</span>
          <Minus :size="22" aria-hidden="true" />
        </ion-button>
        <ion-input
          v-model="loadText"
          class="value"
          type="text"
          inputmode="decimal"
          fill="outline"
          label-placement="stacked"
          :label="t('setEdit.load', { unit: symbol })"
        />
        <ion-button fill="outline" @click="setLoad(stepUp(steps, load) ?? load)">
          <span class="visually-hidden">{{ t('session.heavier') }}</span>
          <Plus :size="22" aria-hidden="true" />
        </ion-button>
      </div>
      <div class="stepper">
        <ion-button fill="outline" @click="setReps(Math.max(0.5, parse(repsText) - 1 || 0.5))">
          <span class="visually-hidden">{{ t('session.fewerReps') }}</span>
          <Minus :size="22" aria-hidden="true" />
        </ion-button>
        <ion-input
          v-model="repsText"
          class="value"
          type="text"
          inputmode="decimal"
          fill="outline"
          label-placement="stacked"
          :label="t('historyEdit.reps')"
        />
        <ion-button fill="outline" @click="setReps((parse(repsText) || 0) + 1)">
          <span class="visually-hidden">{{ t('session.moreReps') }}</span>
          <Plus :size="22" aria-hidden="true" />
        </ion-button>
      </div>
      <p class="hint">{{ t('setEdit.typeHint') }}</p>
      <p class="label">{{ t('session.howWasIt') }}</p>
      <ion-segment
        :value="difficulty"
        @ion-change="difficulty = ($event.detail.value as Difficulty) ?? difficulty"
      >
        <ion-segment-button v-for="d in DIFFICULTIES" :key="d" :value="d">
          <ion-label>{{ t(`difficulty.${d}`) }}</ion-label>
        </ion-segment-button>
      </ion-segment>

      <fieldset class="rir">
        <legend>{{ t('session.rir.label') }}</legend>
        <ion-chip
          v-for="value in RIR_VALUES"
          :key="value"
          :outline="rir !== value"
          v-bind="rir === value ? { color: 'primary' } : {}"
          role="radio"
          :aria-checked="rir === value"
          :aria-label="rirText(value)"
          @click="rir = rir === value ? undefined : value"
        >
          <ion-label>{{ value === 4 ? '4+' : value }}</ion-label>
        </ion-chip>
      </fieldset>
      <ion-input
        v-model="note"
        class="note"
        fill="outline"
        label-placement="stacked"
        :label="t('session.setNote.label')"
        :placeholder="t('session.setNote.placeholder')"
      />
      <p v-if="invalid" class="invalid" role="alert">{{ t('setEdit.invalid') }}</p>
      <ion-button expand="block" size="large" class="save" @click="save">
        {{ t('setEdit.save') }}
      </ion-button>
      <section class="wrong-machine" :aria-label="t('setEdit.wrongMachine.title')">
        <h3>{{ t('setEdit.wrongMachine.title') }}</h3>
        <ion-toggle
          v-if="sameMachine.length > 1"
          :checked="moveAll"
          @ion-change="moveAll = $event.detail.checked"
        >
          {{ t('setEdit.wrongMachine.all', { count: sameMachine.length, name }) }}
        </ion-toggle>
        <ion-button expand="block" fill="outline" @click="pickingMachine = true">
          {{ t('setEdit.wrongMachine.pick') }}
        </ion-button>
        <ExercisePicker
          :open="pickingMachine"
          :title="t('setEdit.wrongMachine.pick')"
          :exclude="set ? [set.exerciseId] : []"
          :suggested="set ? session.sameMovement(set.exerciseId) : []"
          @pick="pickMachine"
          @close="onPickerClosed"
        />
      </section>
      <ion-button
        v-if="!confirmingDelete"
        expand="block"
        fill="clear"
        color="danger"
        @click="confirmingDelete = true"
      >
        {{ t('setEdit.delete') }}
      </ion-button>
      <div v-else class="confirm" role="alertdialog" :aria-label="t('setEdit.delete')">
        <p>{{ t('setEdit.deleteConfirm') }}</p>
        <ion-button expand="block" color="danger" @click="remove">
          {{ t('setEdit.deleteYes') }}
        </ion-button>
      </div>
    </ion-content>
  </ion-modal>
</template>

<style scoped>
.name {
  margin: 0 0 8px;
  font-size: 1.2rem;
  font-weight: 700;
}
.stepper {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-block: 6px;
}
.stepper ion-button {
  min-width: 52px;
  min-height: 48px;
}
.label {
  margin-block: 14px 6px;
  color: var(--ion-color-medium-shade);
}
.value {
  flex: 1;
  font-size: 1.3rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.hint {
  margin-block: 4px 0;
  color: var(--ion-color-medium-shade);
  font-size: 0.85rem;
}
.rir {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin: 14px 0 0;
  padding: 0;
  border: 0;
}
.rir legend {
  margin-bottom: 4px;
  font-weight: 600;
}
.rir ion-chip {
  min-width: 48px;
  min-height: 48px;
  justify-content: center;
}
.note {
  margin-block-start: 12px;
}
.invalid {
  color: var(--ion-color-danger);
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
.save {
  margin-block-start: 20px;
}
.wrong-machine {
  margin-block: 16px 8px;
  padding-block-start: 8px;
  border-block-start: 1px solid var(--ion-color-light-shade);
}
.wrong-machine h3 {
  margin: 0 0 6px;
  font-size: 1rem;
}
.confirm {
  padding: 12px;
  border: 1px solid var(--ion-color-danger);
  border-radius: var(--app-radius-small);
}
.confirm p {
  margin-top: 0;
}
</style>
