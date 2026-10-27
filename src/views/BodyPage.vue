<script setup lang="ts">
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue';
import { useI18n } from 'vue-i18n';
import BodyView from '@/ui/BodyView.vue';
import { useBodyMeasurements } from '@/ui/body/useBodyMeasurements';

/**
 * Body tab: weight, measurements and photos. Apart from the sessions: what
 * changes on the body, not what was lifted.
 */
const { t } = useI18n();
const body = useBodyMeasurements();

// Ionic keeps the page alive between tabs: read again in case of a CSV
// import or a restored backup in the meantime.
onIonViewWillEnter(() => void body.reload());
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ t('tabs.body') }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <BodyView />
    </ion-content>
  </ion-page>
</template>
