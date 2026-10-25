<script setup lang="ts">
import { IonButton, IonChip, IonInput, IonItem, IonLabel, IonList, IonNote } from '@ionic/vue';
import { X } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { defaultStepsFor, parseLoad, uniformSteps } from '@/domain/loadSteps';
import type { Equipment } from '@/domain/types';
import { useUnits } from '@/ui/useUnits';

const props = defineProps<{ steps: readonly number[]; equipment: Equipment }>();
const emit = defineEmits<{ change: [steps: number[]] }>();

const { t } = useI18n();
const { load: kg, symbol, fromInput } = useUnits();

const newStep = ref('');
const invalid = ref(false);
const first = ref('');
const increment = ref('');
const last = ref('');

const defaults = computed(() => defaultStepsFor(props.equipment).slice(0, 6).map(kg).join(', '));

function add(): void {
  const typed = parseLoad(newStep.value);
  invalid.value = typed === undefined;
  if (typed === undefined) return;
  emit('change', [...props.steps, fromInput(typed)]);
  newStep.value = '';
}

function remove(load: number): void {
  emit(
    'change',
    props.steps.filter((step) => step !== load),
  );
}

const generated = computed(() => {
  const [a, step, b] = [first.value, increment.value, last.value].map(parseLoad);
  if (a === undefined || step === undefined || b === undefined || b < a) return undefined;
  const steps = uniformSteps(a, b, step);
  return steps.length <= 200 ? steps.map(fromInput) : undefined;
});

function generate(): void {
  if (generated.value) emit('change', [...props.steps, ...generated.value]);
}
</script>

<template>
  <ion-list lines="none">
    <ion-item>
      <ion-label class="ion-text-wrap">
        <p>{{ t('exercise.steps.help') }}</p>
        <p v-if="steps.length === 0">{{ t('exercise.steps.defaults', { steps: defaults }) }}</p>
      </ion-label>
    </ion-item>
    <div class="chips" data-testid="load-steps">
      <ion-chip v-for="load in steps" :key="load" outline>
        <ion-label>{{ kg(load) }}</ion-label>
        <button
          type="button"
          class="remove"
          :aria-label="t('exercise.steps.remove', { load: kg(load) })"
          @click="remove(load)"
        >
          <X :size="18" aria-hidden="true" />
        </button>
      </ion-chip>
    </div>
    <ion-item>
      <ion-input
        v-model="newStep"
        :label="t('exercise.steps.add', { unit: symbol })"
        label-placement="stacked"
        inputmode="decimal"
        enterkeyhint="done"
        :error-text="t('exercise.steps.invalid')"
        :class="{ 'ion-invalid ion-touched': invalid }"
        @keyup.enter="add"
      />
      <ion-button slot="end" @click="add">{{ t('exercise.steps.addButton') }}</ion-button>
    </ion-item>
    <ion-item>
      <ion-label>
        <h3>{{ t('exercise.steps.generate.title', { unit: symbol }) }}</h3>
      </ion-label>
    </ion-item>
    <div class="generator">
      <ion-input
        v-model="first"
        fill="outline"
        :label="t('exercise.steps.generate.first')"
        label-placement="stacked"
        inputmode="decimal"
      />
      <ion-input
        v-model="increment"
        fill="outline"
        :label="t('exercise.steps.generate.increment')"
        label-placement="stacked"
        inputmode="decimal"
      />
      <ion-input
        v-model="last"
        fill="outline"
        :label="t('exercise.steps.generate.last')"
        label-placement="stacked"
        inputmode="decimal"
      />
    </div>
    <ion-item>
      <ion-note v-if="generated" slot="start"
        >{{ generated.slice(0, 4).map(kg).join(', ') }}…</ion-note
      >
      <ion-button slot="end" :disabled="!generated" @click="generate">
        {{ t('exercise.steps.generate.button') }}
      </ion-button>
    </ion-item>
  </ion-list>
</template>

<style scoped>
.chips {
  display: flex;
  flex-wrap: wrap;
  padding-inline: 12px;
}
.remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  min-height: 32px;
  margin-inline-start: 4px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
}
.generator {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding-inline: 16px;
}
</style>
