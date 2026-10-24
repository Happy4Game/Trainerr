<script setup lang="ts">
import {
  IonButton,
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
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { weeksOnPace } from '@/domain/stats';
import { useSession } from '@/ui/session/useSession';
import { todayIso, useWeekPlan } from '@/ui/useWeekPlan';

const { t } = useI18n();
const session = useSession();
const { settings, days } = useWeekPlan();
const { phase, template, active, history } = session;

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
            <ion-button fill="clear" router-link="/tabs/planning">{{
              t('today.seePlanning')
            }}</ion-button>
          </ion-card-content>
        </ion-card>
      </template>
    </ion-content>
  </ion-page>
</template>
