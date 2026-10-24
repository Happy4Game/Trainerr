<script setup lang="ts">
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/vue';
import { useI18n } from 'vue-i18n';

defineProps<{ titleKey: string; messageKey: string }>();

const { t } = useI18n();
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ t(titleKey) }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p>{{ t(messageKey) }}</p>
    </ion-content>
  </ion-page>
</template>
