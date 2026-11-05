<script setup lang="ts">
import { useTemplateName } from '@/ui/useTemplateName';
import { IonButton, IonInput, IonItem, IonLabel, IonListHeader } from '@ionic/vue';
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
import { buildCoachReport } from '@/data/content/coachReport';
import {
  decryptText,
  encryptionAvailable,
  encryptText,
  isEncryptedFile,
  type EncryptedFile,
} from '@/data/crypto/backupCrypto';
import ImportCsv from '@/ui/ImportCsv.vue';
import { useSession } from '@/ui/session/useSession';
import { shareOrDownload } from '@/ui/shareFile';
import { useSettings } from '@/ui/useSettings';
import { useUnits } from '@/ui/useUnits';
import { todayIso } from '@/ui/useWeekPlan';

const { t, locale } = useI18n();
const templateLabel = useTemplateName();
const confirming = ref(false);
const message = ref('');
const fileInput = ref<HTMLInputElement>();
const password = ref('');
/** Encrypted file waiting for its password. */
const pending = ref<EncryptedFile>();
const unlockPassword = ref('');
const session = useSession();
const { settings } = useSettings();
const { load } = useUnits();

async function backupText(): Promise<string> {
  const { db } = await openAppDatabase();
  return JSON.stringify(await exportBackup(db), null, 1);
}

async function exportJson(): Promise<void> {
  const content = new Blob([await backupText()], { type: 'application/json' });
  await shareOrDownload(`trainerr-${todayIso()}.json`, content, t('data.export'));
}

/** Encrypted with a password: can be stored on any cloud (Drive…) through the share menu. */
async function exportEncrypted(): Promise<void> {
  if (password.value.length < 8) {
    message.value = t('data.passwordTooShort');
    return;
  }
  const file = await encryptText(await backupText(), password.value);
  password.value = '';
  const content = new Blob([JSON.stringify(file)], { type: 'application/json' });
  await shareOrDownload(`trainerr-${todayIso()}.chiffre.json`, content, t('data.exportEncrypted'));
}

async function exportCsv(): Promise<void> {
  const { db } = await openAppDatabase();
  const content = new Blob([await exportSetsCsv(db)], { type: 'text/csv;charset=utf-8' });
  await shareOrDownload(`trainerr-series-${todayIso()}.csv`, content, t('data.exportCsv'));
}

async function shareWithCoach(): Promise<void> {
  const s = settings.value;
  if (!s) return;
  const nameOf = (id: string) => {
    const e = session.entryOf(id)?.exercise;
    return e ? (locale.value.startsWith('fr') ? e.name : e.nameEn) : id;
  };
  const html = buildCoachReport({
    generatedOn: todayIso(),
    program: [
      [t('coach.goal'), t(`onboarding.goal.${s.goal}`)],
      [t('planning.model'), t(`models.${s.model}`)],
      [t('planning.sessionsPerWeek'), String(s.sessionsPerWeek)],
      [t('coach.duration'), t(`onboarding.duration.${s.sessionMinutes}`)],
      ...(s.protectedZone
        ? [[t('coach.zone'), t(`zones.${s.protectedZone}`)] as [string, string]]
        : []),
    ],
    sessions: session.history.value,
    exerciseName: nameOf,
    templateName: (id) => templateLabel(id),
    loadLabel: load,
    difficultyLabel: (d) => t(`difficulty.${d}`),
    texts: {
      title: t('coach.title'),
      program: t('coach.program'),
      history: t('coach.history'),
      warmup: t('session.warmupShort'),
      note: t('coach.note'),
      rest: (time) => t('session.restTaken', { time }),
      averageRest: (time) => t('coach.averageRest', { time }),
    },
    lang: locale.value,
  });
  await shareOrDownload(
    `trainerr-coach-${todayIso()}.html`,
    new Blob([html], { type: 'text/html;charset=utf-8' }),
    t('coach.title'),
  );
}

async function restore(text: string): Promise<void> {
  const backup = JSON.parse(text) as Backup;
  const { db } = await openAppDatabase();
  await importBackup(db, backup);
  window.location.reload();
}

async function onFile(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const content = JSON.parse(await file.text()) as unknown;
    if (isEncryptedFile(content)) {
      pending.value = content;
      return;
    }
    await restore(JSON.stringify(content));
  } catch (error) {
    message.value = error instanceof Error ? error.message : String(error);
  }
}

async function unlock(): Promise<void> {
  if (!pending.value) return;
  try {
    await restore(await decryptText(pending.value, unlockPassword.value));
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
    <div v-if="pending" class="confirm">
      <p>{{ t('data.encryptedFile') }}</p>
      <ion-input
        v-model="unlockPassword"
        type="password"
        fill="outline"
        :label="t('data.password')"
        label-placement="stacked"
      />
      <ion-button expand="block" @click="unlock">{{ t('data.unlock') }}</ion-button>
    </div>

    <template v-if="encryptionAvailable()">
      <h3 class="sub">{{ t('data.encryptedTitle') }}</h3>
      <p class="hint">{{ t('data.encryptedHelp') }}</p>
      <ion-input
        v-model="password"
        type="password"
        fill="outline"
        :label="t('data.password')"
        label-placement="stacked"
      />
      <ion-button expand="block" fill="outline" @click="exportEncrypted">
        {{ t('data.exportEncrypted') }}
      </ion-button>
    </template>

    <h3 class="sub">{{ t('coach.section') }}</h3>
    <ion-button expand="block" fill="outline" @click="shareWithCoach">
      {{ t('coach.share') }}
    </ion-button>

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
.hint {
  font-size: 0.85rem;
  color: var(--ion-color-medium);
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
