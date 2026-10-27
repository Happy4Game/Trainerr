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
import { CHANGELOG } from '@/data/content/changelog';

const { t, locale } = useI18n();
const day = (iso: string) =>
  new Intl.DateTimeFormat(locale.value, { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(`${iso}T12:00:00Z`),
  );
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"
          ><ion-back-button default-href="/tabs/settings" :text="t('common.back')"
        /></ion-buttons>
        <ion-title>{{ t('changelog.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-card v-for="entry in CHANGELOG" :key="entry.id">
        <ion-card-header>
          <ion-card-subtitle>{{ day(entry.date) }}</ion-card-subtitle>
          <ion-card-title>{{ t(`changelog.titles.${entry.id}`) }}</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ul>
            <li v-for="item in entry.items" :key="item">{{ t(`changelog.items.${item}`) }}</li>
          </ul>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<style scoped>
ul {
  margin: 0;
  padding-inline-start: 1.2rem;
}
li + li {
  margin-top: 6px;
}
</style>
