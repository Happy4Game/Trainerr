<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { Settings } from 'lucide-vue-next';
import { computed, onMounted, ref, watch } from 'vue';
import { openAppDatabase } from '@/data/appDatabase';
import { listBadges, type EarnedBadge } from '@/data/repositories/badgeRepository';
import { useI18n } from 'vue-i18n';
import { weeksOnPace } from '@/domain/stats';
import AdviceCard from '@/ui/AdviceCard.vue';
import { useSession } from '@/ui/session/useSession';
import { todayIso, useWeekPlan } from '@/ui/useWeekPlan';

const { t } = useI18n();
const session = useSession();
const { settings, days } = useWeekPlan();
const { phase, template, active, history } = session;

const badges = ref<EarnedBadge[]>([]);
async function loadBadges(): Promise<void> {
  const { db } = await openAppDatabase();
  badges.value = await listBadges(db);
}
onMounted(loadBadges);
watch(history, loadBadges);

const today = computed(() => days.value.find((d) => d.date === todayIso()));
const doneThisWeek = computed(
  () =>
    new Set(
      history.value.map((s) => s.date).filter((date) => days.value.some((d) => d.date === date)),
    ).size,
);
const streak = computed(() =>
  settings.value
    ? weeksOnPace(history.value, settings.value.sessionsPerWeek, todayIso())
    : undefined,
);
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ t('tabs.today') }}</ion-title>
        <ion-buttons slot="end">
          <ion-button router-link="/tabs/settings" :aria-label="t('settings.title')">
            <Settings :size="24" aria-hidden="true" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p v-if="phase === 'loading'" role="status">{{ t('catalog.loading') }}</p>
      <template v-else>
        <ion-card>
          <ion-card-header>
            <ion-card-title v-if="active">
              {{ t('today.inProgress', { template: t(`templates.${active.templateId}`) }) }}
            </ion-card-title>
            <ion-card-title v-else-if="template">
              {{ t('session.next', { template: t(`templates.${template.id}`) }) }}
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p v-if="!active && today?.session">
              {{ t('today.plannedAt', { start: today.session.start }) }}
            </p>
            <p v-else-if="!active">{{ t('today.restDay') }}</p>
            <ion-button expand="block" size="large" router-link="/tabs/session">
              {{ active ? t('today.resume') : t('today.go') }}
            </ion-button>
          </ion-card-content>
        </ion-card>

        <ion-card v-if="settings">
          <ion-card-header>
            <ion-card-title>{{ t('today.week') }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p>
              {{ t('today.weekCount', { done: doneThisWeek, target: settings.sessionsPerWeek }) }}
            </p>
            <p v-if="streak && streak.current > 0">
              {{ t('today.streak', streak.current) }}
            </p>
            <p v-if="badges.length > 0" class="badges">
              <span v-for="badge in badges" :key="badge.code" class="badge">
                <span aria-hidden="true">🏅</span> {{ t(`badges.${badge.code}`) }}
              </span>
            </p>
            <ion-button fill="clear" router-link="/tabs/planning">{{
              t('today.seePlanning')
            }}</ion-button>
          </ion-card-content>
        </ion-card>

        <AdviceCard />
      </template>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-block: 8px;
}
.badge {
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--ion-color-light);
  color: var(--ion-color-light-contrast);
  font-size: 0.85rem;
}
</style>
