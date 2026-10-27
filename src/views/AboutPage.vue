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
import { useFeedbackLink } from '@/ui/feedback';

const { t } = useI18n();
const feedback = useFeedbackLink();
const paragraphs = ['p1', 'p2', 'p3', 'p4'] as const;
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"
          ><ion-back-button default-href="/tabs/settings" :text="t('common.back')"
        /></ion-buttons>
        <ion-title>{{ t('about.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <blockquote>
        <p v-for="p in paragraphs" :key="p">{{ t(`about.${p}`) }}</p>
      </blockquote>
      <ion-button expand="block" fill="outline" :href="feedback">{{
        t('about.report')
      }}</ion-button>
      <p class="small">{{ t('feedback.help') }}</p>
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
