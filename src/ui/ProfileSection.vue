<script setup lang="ts">
import { IonButton, IonInput, IonItem, IonLabel, IonListHeader } from '@ionic/vue';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { parseLoad } from '@/domain/loadSteps';
import { useSession } from '@/ui/session/useSession';
import { useUnits } from '@/ui/useUnits';

const { t } = useI18n();
const session = useSession();
const { load: kg, symbol, fromInput } = useUnits();

const weight = ref('');
const saved = ref(false);

async function save(): Promise<void> {
  const typed = parseLoad(weight.value);
  if (typed === undefined) return;
  await session.saveBodyWeight(fromInput(typed));
  weight.value = '';
  saved.value = true;
}
</script>

<template>
  <ion-list-header>{{ t('settings.profile.title') }}</ion-list-header>
  <ion-item>
    <ion-input
      v-model="weight"
      :label="t('settings.profile.weight', { unit: symbol })"
      label-placement="stacked"
      inputmode="decimal"
      enterkeyhint="done"
      :placeholder="session.bodyWeight.value !== undefined ? kg(session.bodyWeight.value) : ''"
      @keyup.enter="save"
    />
    <ion-button slot="end" @click="save">{{ t('settings.profile.save') }}</ion-button>
  </ion-item>
  <ion-item lines="none">
    <ion-label class="ion-text-wrap">
      <p aria-live="polite">
        {{
          saved
            ? t('settings.profile.saved')
            : session.bodyWeight.value !== undefined
              ? t('settings.profile.current', { weight: kg(session.bodyWeight.value) })
              : t('settings.profile.none')
        }}
      </p>
      <p>{{ t('settings.profile.help') }}</p>
    </ion-label>
  </ion-item>
</template>
