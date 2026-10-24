<script setup lang="ts">
import { IonLabel, IonPage, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs } from '@ionic/vue';
import { BookOpen, CalendarDays, Dumbbell, History, Sun } from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const tabs = [
  { name: 'today', href: '/tabs/today', icon: Sun },
  { name: 'session', href: '/tabs/session', icon: Dumbbell },
  { name: 'catalog', href: '/tabs/catalog', icon: BookOpen },
  { name: 'history', href: '/tabs/history', icon: History },
  { name: 'planning', href: '/tabs/planning', icon: CalendarDays },
] as const;
</script>

<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />
      <ion-tab-bar slot="bottom">
        <ion-tab-button v-for="tab in tabs" :key="tab.name" :tab="tab.name" :href="tab.href">
          <component :is="tab.icon" :size="24" aria-hidden="true" />
          <ion-label>{{ t(`tabs.${tab.name}`) }}</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>
