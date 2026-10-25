<script setup lang="ts">
import { IonButton, IonItem, IonLabel, IonListHeader } from '@ionic/vue';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { openAppDatabase } from '@/data/appDatabase';
import {
  deleteAllUserData,
  exportBackup,
  exportSetsCsv,
  importBackup,
  type Backup,
} from '@/data/repositories/backupRepository';
import ImportCsv from '@/ui/ImportCsv.vue';
import { todayIso } from '@/ui/useWeekPlan';

const { t } = useI18n();
const confirming = ref(false);
const message = ref('');
const fileInput = ref<HTMLInputElement>();

/**
 * Saves a file through the browser. On the phone build, the Capacitor
 * Filesystem / Share plugins will replace this (step 9, see PROGRESS.md).
 */
function download(name: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

async function exportJson(): Promise<void> {
  const { db } = await openAppDatabase();
  const backup = await exportBackup(db);
  download(`trainerr-${todayIso()}.json`, JSON.stringify(backup, null, 1), 'application/json');
}

async function exportCsv(): Promise<void> {
  const { db } = await openAppDatabase();
  download(`trainerr-series-${todayIso()}.csv`, await exportSetsCsv(db), 'text/csv;charset=utf-8');
}

async function onFile(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const backup = JSON.parse(await file.text()) as Backup;
    const { db } = await openAppDatabase();
    await importBackup(db, backup);
    window.location.reload();
  } catch (error) {
    message.value = error instanceof Error ? error.message : String(error);
  }
}

async function deleteAll(): Promise<void> {
  const { db } = await openAppDatabase();
  await deleteAllUserData(db);
  window.location.reload();
}
</script>

<template>
  <ion-list-header>{{ t('data.title') }}</ion-list-header>
  <ion-item lines="none">
    <ion-label class="ion-text-wrap">
      <p>{{ t('data.privacy') }}</p>
    </ion-label>
  </ion-item>
  <div class="actions">
    <ion-button expand="block" fill="outline" @click="exportJson">{{
      t('data.export')
    }}</ion-button>
    <ion-button expand="block" fill="outline" @click="exportCsv">{{
      t('data.exportCsv')
    }}</ion-button>
    <ion-button expand="block" fill="outline" @click="fileInput?.click()">
      {{ t('data.import') }}
    </ion-button>
    <input
      ref="fileInput"
      type="file"
      accept="application/json,.json"
      hidden
      :aria-label="t('data.import')"
      @change="onFile"
    />
    <p v-if="message" role="alert">{{ message }}</p>

    <h3 class="sub">{{ t('importCsv.title') }}</h3>
    <ImportCsv />

    <ion-button
      v-if="!confirming"
      expand="block"
      color="danger"
      fill="outline"
      @click="confirming = true"
    >
      {{ t('data.delete') }}
    </ion-button>
    <div v-else class="confirm" role="alertdialog" :aria-label="t('data.confirmTitle')">
      <p>{{ t('data.confirm') }}</p>
      <ion-button expand="block" color="danger" @click="deleteAll">{{
        t('data.confirmYes')
      }}</ion-button>
      <ion-button expand="block" fill="clear" @click="confirming = false">{{
        t('data.cancel')
      }}</ion-button>
    </div>
  </div>
</template>

<style scoped>
.actions {
  padding-inline: 16px;
  padding-block-end: 24px;
}
.sub {
  margin-block: 16px 0;
  font-size: 1rem;
}
.confirm {
  padding: 12px;
  border: 1px solid var(--ion-color-danger);
  border-radius: 12px;
}
</style>
