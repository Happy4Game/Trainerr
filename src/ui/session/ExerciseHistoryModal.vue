<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { useI18n } from 'vue-i18n';
import ExerciseHistoryList from './ExerciseHistoryList.vue';

interface PastSet {
  readonly loadKg: number;
  readonly reps: number;
}

/**
 * Every past session with one exercise, newest first, set by set: the whole
 * history of loads and reps, opened from the session screen or the card.
 */
defineProps<{
  open: boolean;
  name: string;
  sessions: readonly { readonly date: string; readonly sets: readonly PastSet[] }[];
  /** How a set reads on this machine (assisted, body weight, timed). */
  setText: (set: PastSet) => string;
}>();
const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
</script>

<template>
  <ion-modal :is-open="open" @did-dismiss="emit('close')">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ t('session.history.title') }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="emit('close')">{{ t('session.history.close') }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p class="name">{{ name }}</p>
      <p class="count">{{ t('session.history.count', sessions.length) }}</p>
      <ExerciseHistoryList :sessions="sessions" :set-text="setText" />
    </ion-content>
  </ion-modal>
</template>

<style scoped>
.name {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}
.count {
  margin-block: 2px 12px;
  color: var(--ion-color-medium);
}
</style>
