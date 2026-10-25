<script setup lang="ts">
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonInput,
  IonProgressBar,
} from '@ionic/vue';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { comebackStartLoad, returnToLevel, type PauseLength } from '@/domain/comeback';
import { parseLoad, type LoadSteps } from '@/domain/loadSteps';
import { useSession } from '@/ui/session/useSession';
import { useUnits } from '@/ui/useUnits';

/**
 * Load the user lifts on this machine. Out of comeback mode it is the usual
 * load, the start of the first session; in comeback mode, the pre-break level.
 */
const props = defineProps<{
  exerciseId: string;
  pause?: PauseLength | undefined;
  steps: LoadSteps;
}>();
const mode = computed(() => (props.pause ? 'comeback' : 'usual'));

const { t } = useI18n();
const session = useSession();
const { load, symbol, fromInput, toDisplay } = useUnits();

const reference = computed(() =>
  session.references.value.find((r) => r.exerciseId === props.exerciseId),
);
const loadText = ref('');
const saved = ref(false);
const repsText = ref('');
watch(
  reference,
  (r) => {
    loadText.value = r ? String(toDisplay(r.loadKg)) : '';
    repsText.value = r ? String(r.reps) : '';
  },
  { immediate: true },
);

const startLoad = computed(() =>
  reference.value && props.pause && props.steps.length > 0
    ? comebackStartLoad({
        referenceKg: reference.value.loadKg,
        pause: props.pause,
        steps: props.steps,
      })
    : undefined,
);
const best = computed(() => session.bestSinceComeback(props.exerciseId));
const gauge = computed(() =>
  props.pause && reference.value && best.value !== undefined
    ? returnToLevel({ currentKg: best.value, referenceKg: reference.value.loadKg })
    : undefined,
);

async function save(): Promise<void> {
  const typed = parseLoad(loadText.value);
  const reps = parseLoad(repsText.value);
  if (typed === undefined || reps === undefined) return;
  await session.saveReference(props.exerciseId, fromInput(typed), reps);
  saved.value = true;
}
</script>

<template>
  <ion-card>
    <ion-card-header>
      <ion-card-title>{{ t(`comeback.${mode}.title`) }}</ion-card-title>
    </ion-card-header>
    <ion-card-content>
      <p>{{ t(`comeback.${mode}.help`) }}</p>
      <div class="inputs">
        <ion-input
          v-model="loadText"
          fill="outline"
          :label="t('comeback.load', { unit: symbol })"
          label-placement="stacked"
          inputmode="decimal"
        />
        <ion-input
          v-model="repsText"
          fill="outline"
          :label="t('comeback.reps')"
          label-placement="stacked"
          inputmode="decimal"
        />
        <ion-button @click="save">{{ t('comeback.save') }}</ion-button>
      </div>
      <p v-if="saved" class="saved" role="status">{{ t('comeback.saved') }}</p>
      <p v-if="startLoad !== undefined">
        {{ t('comeback.start', { load: load(startLoad) }) }}
      </p>
      <template v-if="gauge && reference">
        <p>
          {{
            t('comeback.gauge', {
              current: load(best ?? 0),
              reference: load(reference.loadKg),
              percent: gauge.percent,
            })
          }}
        </p>
        <ion-progress-bar :value="Math.min(1, gauge.percent / 100)" :aria-hidden="true" />
        <p v-if="gauge.reached" class="reached" role="status">{{ t('comeback.reached') }}</p>
      </template>
    </ion-card-content>
  </ion-card>
</template>

<style scoped>
.inputs {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 8px;
  align-items: center;
  margin-block: 8px;
}
.saved {
  color: var(--ion-color-success);
}
.reached {
  font-weight: 600;
  color: var(--ion-color-success);
}
</style>
