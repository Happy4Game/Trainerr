<script setup lang="ts">
import {
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { sessionWorkload } from '@/domain/stats';
import BodyView from '@/ui/BodyView.vue';
import { useSession } from '@/ui/session/useSession';
import StatsView from '@/ui/StatsView.vue';

const VIEWS = ['sessions', 'stats', 'body'] as const;
const view = ref<(typeof VIEWS)[number]>('sessions');

const { t, n, locale } = useI18n();
const session = useSession();

const sessions = computed(() => [...session.history.value].reverse());
const dateLabel = (date: string) =>
  new Intl.DateTimeFormat(locale.value, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
const nameOf = (id: string) => {
  const e = session.entryOf(id)?.exercise;
  return e ? (locale.value.startsWith('fr') ? e.name : e.nameEn) : id;
};

/** One line per exercise: "Leg press: 107 × 10, 107 × 10". */
function lines(
  sets: readonly { exerciseId: string; loadKg: number; reps: number; warmup?: boolean }[],
) {
  const byExercise = new Map<string, string[]>();
  for (const set of sets) {
    if (set.warmup) continue;
    const list = byExercise.get(set.exerciseId) ?? [];
    list.push(`${n(set.loadKg)} × ${n(set.reps)}`);
    byExercise.set(set.exerciseId, list);
  }
  return [...byExercise.entries()].map(([id, sets]) => `${nameOf(id)} : ${sets.join(', ')}`);
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ t('tabs.history') }}</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment
          :value="view"
          @ion-change="view = ($event.detail.value as (typeof VIEWS)[number]) ?? 'sessions'"
        >
          <ion-segment-button v-for="v in VIEWS" :key="v" :value="v">
            <ion-label>{{ t(`history.views.${v}`) }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <StatsView v-if="view === 'stats'" />
      <BodyView v-else-if="view === 'body'" />
      <p v-else-if="sessions.length === 0">{{ t('history.empty') }}</p>
      <ion-list v-else>
        <ion-item v-for="s in sessions" :key="s.id">
          <ion-label class="ion-text-wrap">
            <h2>{{ t(`templates.${s.templateId}`) }} · {{ dateLabel(s.date) }}</h2>
            <p>{{ t('history.workload', { kg: n(Math.round(sessionWorkload(s))) }) }}</p>
            <p v-for="line in lines(s.sets)" :key="line">{{ line }}</p>
            <p v-if="s.note" class="note">« {{ s.note }} »</p>
          </ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>
