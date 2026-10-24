<script setup lang="ts">
import {
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
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { openAppDatabase } from '@/data/appDatabase';

const { t } = useI18n();

type DatabaseStatus =
  { state: 'loading' } | { state: 'ready'; version: number } | { state: 'error'; message: string };

const status = ref<DatabaseStatus>({ state: 'loading' });

onMounted(async () => {
  try {
    const { schemaVersion } = await openAppDatabase();
    status.value = { state: 'ready', version: schemaVersion };
  } catch (error) {
    status.value = {
      state: 'error',
      message: error instanceof Error ? error.message : String(error),
    };
  }
});
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ t('tabs.today') }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p>{{ t('today.comingSoon') }}</p>
      <ion-card>
        <ion-card-header>
          <ion-card-title>{{ t('today.database.title') }}</ion-card-title>
        </ion-card-header>
        <ion-card-content role="status">
          <template v-if="status.state === 'loading'">{{ t('today.database.loading') }}</template>
          <template v-else-if="status.state === 'ready'">
            {{ t('today.database.ready', { version: status.version }) }}
          </template>
          <template v-else>{{ t('today.database.error', { message: status.message }) }}</template>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>
