<script setup lang="ts">
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonTextarea,
} from '@ionic/vue';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ApiError, createApi } from '@/data/remote/api';
import { weekSummary } from '@/domain/weekSummary';
import { useSession } from '@/ui/session/useSession';
import { updateSettings, useSettings } from '@/ui/useSettings';
import { todayIso } from '@/ui/useWeekPlan';

const { t, locale } = useI18n();
const { settings } = useSettings();
const session = useSession();

const question = ref('');
const advice = ref('');
const error = ref('');
const loading = ref(false);
const showSummary = ref(false);

const ready = computed(() => Boolean(settings.value?.serverUrl && settings.value.account));
const summary = computed(() =>
  settings.value
    ? weekSummary({
        sessions: session.history.value,
        today: todayIso(),
        sessionsPerWeek: settings.value.sessionsPerWeek,
        exerciseName: (id) => {
          const e = session.entryOf(id)?.exercise;
          return e ? (locale.value.startsWith('fr') ? e.name : e.nameEn) : id;
        },
        discomforts: settings.value.discomforts ?? [],
      })
    : '',
);

const ERRORS = ['network', 'daily_limit', 'refused', 'unavailable'];

async function ask(): Promise<void> {
  const current = settings.value;
  if (!current?.serverUrl || !current.account) return;
  loading.value = true;
  error.value = '';
  try {
    advice.value = await createApi(current.serverUrl, current.account.token).advice(
      summary.value,
      question.value.trim(),
      locale.value,
    );
  } catch (e) {
    const code = e instanceof ApiError ? e.code : 'other';
    error.value = t(`advice.errors.${ERRORS.includes(code) ? code : 'other'}`);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <ion-card v-if="ready && settings">
    <ion-card-header>
      <ion-card-title>{{ t('advice.title') }}</ion-card-title>
    </ion-card-header>
    <ion-card-content>
      <template v-if="!settings.aiConsent">
        <p>{{ t('advice.consent') }}</p>
        <ion-button fill="clear" size="small" @click="showSummary = !showSummary">
          {{ t('advice.seeSummary') }}
        </ion-button>
        <pre v-if="showSummary" class="summary">{{ summary }}</pre>
        <ion-button expand="block" @click="updateSettings({ aiConsent: true })">
          {{ t('advice.agree') }}
        </ion-button>
      </template>
      <template v-else>
        <ion-textarea
          v-model="question"
          fill="outline"
          :label="t('advice.question')"
          label-placement="stacked"
          :maxlength="500"
          :auto-grow="true"
        />
        <ion-button expand="block" :disabled="loading" @click="ask">
          {{ loading ? t('advice.loading') : t('advice.ask') }}
        </ion-button>
        <p v-if="error" role="alert" class="alert">{{ error }}</p>
        <div v-if="advice" class="advice" aria-live="polite">
          <p class="warning">{{ t('advice.warning') }}</p>
          <p class="text">{{ advice }}</p>
        </div>
        <ion-button fill="clear" size="small" @click="updateSettings({ aiConsent: false })">
          {{ t('advice.withdraw') }}
        </ion-button>
      </template>
    </ion-card-content>
  </ion-card>
</template>

<style scoped>
.summary {
  white-space: pre-wrap;
  font-size: 0.8rem;
  padding: 8px;
  border-radius: 8px;
  background: var(--ion-color-light);
  color: var(--ion-color-light-contrast);
}
.alert {
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--ion-color-warning);
  color: var(--ion-color-warning-contrast);
}
.warning {
  font-size: 0.8rem;
  color: var(--ion-color-medium);
}
.text {
  white-space: pre-wrap;
}
</style>
