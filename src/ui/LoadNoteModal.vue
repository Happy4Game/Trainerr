<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { parseLoad } from '@/domain/loadSteps';
import { useSession } from '@/ui/session/useSession';
import { useUnits } from '@/ui/useUnits';

/** Notes the load lifted on a machine, from the catalog. */
const props = defineProps<{ exerciseId?: string | undefined; name: string }>();
const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
const session = useSession();
const { symbol, toDisplay, fromInput } = useUnits();
const loadText = ref('');
const repsText = ref('');
const invalid = ref(false);

watch(
  () => props.exerciseId,
  (id) => {
    const current = id ? session.myLoadFor(id) : undefined;
    loadText.value = current ? String(toDisplay(current.loadKg)) : '';
    repsText.value = current ? String(current.reps) : '';
    invalid.value = false;
  },
  { immediate: true },
);

async function save(): Promise<void> {
  const load = parseLoad(loadText.value);
  const reps = parseLoad(repsText.value);
  if (!props.exerciseId || load === undefined || reps === undefined || reps <= 0) {
    invalid.value = true;
    return;
  }
  await session.saveReference(props.exerciseId, fromInput(load), reps);
  emit('close');
}
</script>

<template>
  <ion-modal
    :is-open="exerciseId !== undefined"
    :initial-breakpoint="0.6"
    :breakpoints="[0, 0.6, 1]"
    @did-dismiss="emit('close')"
  >
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ t('myLoad.title') }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="emit('close')">{{ t('picker.cancel') }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p class="name">{{ name }}</p>
      <p class="help">{{ t('myLoad.help') }}</p>
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
      </div>
      <p v-if="invalid" role="alert" class="invalid">{{ t('myLoad.invalid') }}</p>
      <ion-button expand="block" size="large" @click="save">{{ t('comeback.save') }}</ion-button>
    </ion-content>
  </ion-modal>
</template>

<style scoped>
.name {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
}
.help {
  color: var(--ion-color-medium-shade);
}
.inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-block: 12px;
}
.invalid {
  color: var(--ion-color-danger);
}
</style>
