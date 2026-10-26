<script setup lang="ts">
import { IonButton } from '@ionic/vue';
import { useI18n } from 'vue-i18n';
import { useUpdates } from '@/ui/updates';

/** What to do with a new version: shown in the banner and in the settings. */
defineProps<{ compact?: boolean }>();
const emit = defineEmits<{ later: [] }>();

const { t } = useI18n();
const { state, install, openInstallSettings, check } = useUpdates();
</script>

<template>
  <div class="update" role="status">
    <template v-if="state.kind === 'available'">
      <p>
        <strong>{{ t('updates.available', { version: state.update.versionName }) }}</strong>
      </p>
      <p v-if="!compact && state.update.notes" class="notes">{{ state.update.notes }}</p>
      <ion-button size="small" @click="install(state.update)">
        {{ t('updates.install') }}
      </ion-button>
      <ion-button v-if="compact" size="small" fill="clear" @click="emit('later')">
        {{ t('updates.later') }}
      </ion-button>
    </template>
    <template v-else-if="state.kind === 'downloading'">
      <p>{{ t('updates.downloading', { percent: Math.max(0, state.percent) }) }}</p>
      <progress max="100" :value="Math.max(0, state.percent)" />
    </template>
    <template v-else-if="state.kind === 'needsPermission'">
      <p>{{ t('updates.permission') }}</p>
      <ion-button size="small" @click="openInstallSettings">
        {{ t('updates.allow') }}
      </ion-button>
      <ion-button size="small" fill="outline" @click="check">
        {{ t('updates.retry') }}
      </ion-button>
    </template>
    <p v-else-if="state.kind === 'upToDate' && !compact">{{ t('updates.upToDate') }}</p>
    <p v-else-if="state.kind === 'checking' && !compact">{{ t('updates.checking') }}</p>
    <p v-else-if="state.kind === 'error' && !compact">
      {{ t('updates.error', { message: state.message }) }}
    </p>
  </div>
</template>

<style scoped>
.update p {
  margin: 0 0 6px;
}
.notes {
  white-space: pre-line;
  font-size: 0.9rem;
  color: var(--ion-color-medium-shade);
}
progress {
  width: 100%;
}
</style>
