<script setup lang="ts">
import { IonButton, IonItem, IonLabel, IonListHeader, IonToggle } from '@ionic/vue';
import { useI18n } from 'vue-i18n';
import UpdatePanel from '@/ui/UpdatePanel.vue';
import { useUpdates } from '@/ui/updates';
import { useSettings } from '@/ui/useSettings';

const { t } = useI18n();
const { settings, updateSettings } = useSettings();
const { supported, installed, state, check } = useUpdates();
</script>

<template>
  <template v-if="supported && settings">
    <ion-list-header>{{ t('updates.title') }}</ion-list-header>
    <ion-item lines="none">
      <ion-label class="ion-text-wrap">
        <p v-if="installed">
          {{
            t('updates.installed', { version: installed.versionName, code: installed.versionCode })
          }}
        </p>
      </ion-label>
      <ion-button slot="end" :disabled="state.kind === 'checking'" @click="check">
        {{ t('updates.check') }}
      </ion-button>
    </ion-item>
    <ion-item lines="none">
      <UpdatePanel />
    </ion-item>
    <ion-item>
      <ion-toggle
        :checked="settings.autoUpdateCheck !== false"
        @ion-change="updateSettings({ autoUpdateCheck: $event.detail.checked })"
      >
        <ion-label class="ion-text-wrap">
          {{ t('updates.auto') }}
          <p>{{ t('updates.autoHelp') }}</p>
        </ion-label>
      </ion-toggle>
    </ion-item>
  </template>
</template>
