<script setup lang="ts">
import {
  IonBackButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { useI18n } from 'vue-i18n';
import { sourceById } from '@/data/content/sources';
import { TIPS } from '@/data/content/tips';

const { t } = useI18n();
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"
          ><ion-back-button default-href="/tabs/settings" :text="t('common.back')"
        /></ion-buttons>
        <ion-title>{{ t('tips.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-card v-for="tip in TIPS" :key="tip.id">
        <ion-card-header>
          <ion-card-subtitle>{{ t(`tips.themes.${tip.theme}`) }}</ion-card-subtitle>
          <ion-card-title>{{ t(`tips.items.${tip.id}.title`) }}</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p>{{ t(`tips.items.${tip.id}.body`) }}</p>
          <p class="source">
            <template v-if="tip.status === 'sourced'">
              {{ t('tips.source') }}
              <template v-for="(id, index) in tip.sourceIds" :key="id">
                <span v-if="index > 0">, </span>
                <a :href="sourceById(id)?.url" target="_blank" rel="noopener">
                  {{ sourceById(id)?.label }}
                </a>
              </template>
            </template>
            <template v-else-if="tip.status !== 'none'">{{
              t(`tips.status.${tip.status}`)
            }}</template>
          </p>
        </ion-card-content>
      </ion-card>
      <p class="source">{{ t('tips.disclaimer') }}</p>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.source {
  margin-block-start: 8px;
  font-size: 0.8rem;
  color: var(--ion-color-medium);
}
</style>
