<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const paragraphs = ['p1', 'p2', 'p3', 'p4'] as const;
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/tabs/settings" /></ion-buttons>
        <ion-title>{{ t('about.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <blockquote>
        <p v-for="p in paragraphs" :key="p">{{ t(`about.${p}`) }}</p>
      </blockquote>
      <!-- Le moyen de contact (formulaire, e-mail ou page du projet) reste à choisir par Thibaut. -->
      <ion-button expand="block" fill="outline" disabled>{{ t('about.report') }}</ion-button>
      <p class="small">{{ t('about.reportSoon') }}</p>
      <ion-button expand="block" fill="clear" router-link="/tabs/settings/credits">
        {{ t('about.credits') }}
      </ion-button>
    </ion-content>
  </ion-page>
</template>

<style scoped>
blockquote {
  margin: 0;
  padding-inline-start: 12px;
  border-inline-start: 4px solid var(--ion-color-primary);
}
.small {
  color: var(--ion-color-medium);
  font-size: 0.85rem;
}
</style>
