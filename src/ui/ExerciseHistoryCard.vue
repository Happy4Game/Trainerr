<script setup lang="ts">
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle } from '@ionic/vue';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import ExerciseHistoryList from '@/ui/session/ExerciseHistoryList.vue';
import ExerciseHistoryModal from '@/ui/session/ExerciseHistoryModal.vue';
import { useLoadLabel } from '@/ui/session/useLoadLabel';
import { useSession } from '@/ui/session/useSession';

/** On the machine card: the last sessions with it, set by set, and the whole history. */
const props = defineProps<{ exerciseId: string; name: string }>();

/** Sessions shown on the card itself: the rest is one tap away. */
const SHOWN = 3;

const { t, n } = useI18n();
const session = useSession();
const loadLabel = useLoadLabel();
const sessions = computed(() =>
  session.lastTimes(props.exerciseId, Infinity).filter((past) => past.sets.length > 0),
);
const setText = (set: { loadKg: number; reps: number }) =>
  `${loadLabel(props.exerciseId, set.loadKg)} × ${n(set.reps)}`;
const open = ref(false);
</script>

<template>
  <ion-card v-if="sessions.length > 0" data-testid="exercise-history">
    <ion-card-header>
      <ion-card-title>{{ t('exercise.history.title') }}</ion-card-title>
    </ion-card-header>
    <ion-card-content>
      <ExerciseHistoryList :sessions="sessions.slice(0, SHOWN)" :set-text="setText" />
      <ion-button
        v-if="sessions.length > SHOWN"
        fill="clear"
        size="small"
        class="all"
        @click="open = true"
      >
        {{ t('session.history.open', sessions.length) }} ›
      </ion-button>
      <ExerciseHistoryModal
        :open="open"
        :name="name"
        :sessions="sessions"
        :set-text="setText"
        @close="open = false"
      />
    </ion-card-content>
  </ion-card>
</template>

<style scoped>
.all {
  margin-top: 4px;
  --padding-start: 0;
}
</style>
