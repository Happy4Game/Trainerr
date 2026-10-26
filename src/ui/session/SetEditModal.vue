<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
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
import { useSession } from './useSession';
import ExercisePicker from '@/ui/ExercisePicker.vue';

/** Correction of a set already validated during the session. */
const props = defineProps<{ set?: StoredSet | undefined; name: string }>();
const emit = defineEmits<{ close: [] }>();

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'ok', 'hard', 'fail'];
const { t, n } = useI18n();
const session = useSession();
const { load: kg } = useUnits();

const load = ref(0);
const reps = ref(0);
const difficulty = ref<Difficulty>('ok');
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
    load.value = set.loadKg;
    reps.value = set.reps;
    difficulty.value = set.difficulty;
    confirmingDelete.value = false;
  },
  { immediate: true },
);

const steps = computed(() => {
  const entry = props.set ? session.entryOf(props.set.exerciseId) : undefined;
  return entry ? session.stepsOf(entry) : [];
});

async function save(): Promise<void> {
  if (!props.set) return;
  await session.editSessionSet(props.set.id, {
    loadKg: load.value,
    reps: reps.value,
    difficulty: difficulty.value,
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
    :initial-breakpoint="0.75"
    :breakpoints="[0, 0.75, 1]"
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
        <span class="label">{{ t('session.load') }}</span>
        <ion-button fill="outline" @click="load = stepDown(steps, load) ?? load">
          <span class="visually-hidden">{{ t('session.lighter') }}</span>
          <Minus :size="22" aria-hidden="true" />
        </ion-button>
        <output class="value">{{ kg(load) }}</output>
        <ion-button fill="outline" @click="load = stepUp(steps, load) ?? load">
          <span class="visually-hidden">{{ t('session.heavier') }}</span>
          <Plus :size="22" aria-hidden="true" />
        </ion-button>
      </div>
      <div class="stepper">
        <span class="label">{{ t('session.reps') }}</span>
        <ion-button fill="outline" @click="reps = Math.max(0, reps - 1)">
          <span class="visually-hidden">{{ t('session.fewerReps') }}</span>
          <Minus :size="22" aria-hidden="true" />
        </ion-button>
        <output class="value">{{ n(reps) }}</output>
        <ion-button fill="outline" @click="reps = reps + 1">
          <span class="visually-hidden">{{ t('session.moreReps') }}</span>
          <Plus :size="22" aria-hidden="true" />
        </ion-button>
      </div>
      <p class="label">{{ t('session.howWasIt') }}</p>
      <ion-segment
        :value="difficulty"
        @ion-change="difficulty = ($event.detail.value as Difficulty) ?? difficulty"
      >
        <ion-segment-button v-for="d in DIFFICULTIES" :key="d" :value="d">
          <ion-label>{{ t(`difficulty.${d}`) }}</ion-label>
        </ion-segment-button>
      </ion-segment>

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
  width: 4.5em;
  color: var(--ion-color-medium-shade);
}
p.label {
  width: auto;
  margin-block: 14px 6px;
}
.value {
  min-width: 5.5ch;
  font-size: 1.5rem;
  font-weight: 700;
  text-align: center;
  font-variant-numeric: tabular-nums;
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
