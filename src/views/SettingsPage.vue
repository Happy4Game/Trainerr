<script setup lang="ts">
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonPage,
  IonToggle,
  IonTitle,
  IonToolbar,
  useIonRouter,
} from '@ionic/vue';
import { useI18n } from 'vue-i18n';
import type { NotificationKind } from '@/domain/notifications';
import { askNotificationPermission, rescheduleNotifications } from '@/ui/notifications';
import { useSession } from '@/ui/session/useSession';
import { useSettings } from '@/ui/useSettings';

const { t } = useI18n();
const router = useIonRouter();
const { settings, updateSettings } = useSettings();
const session = useSession();

const KINDS: NotificationKind[] = [
  'sessionReminder',
  'nudge',
  'record',
  'streak',
  'backToLevel',
  'tip',
];

async function setNotifications(enabled: boolean): Promise<void> {
  if (!settings.value) return;
  const granted = enabled ? await askNotificationPermission() : false;
  const saved = await updateSettings({
    notifications: { ...settings.value.notifications, enabled: granted },
  });
  await rescheduleNotifications(saved);
}

async function setKind(kind: NotificationKind, on: boolean): Promise<void> {
  if (!settings.value) return;
  const prefs = settings.value.notifications;
  const saved = await updateSettings({
    notifications: { ...prefs, kinds: { ...prefs.kinds, [kind]: on } },
  });
  await rescheduleNotifications(saved);
}

async function setSupersets(on: boolean): Promise<void> {
  await updateSettings({ supersets: on });
  await session.reload();
}

async function redoQuestionnaire(): Promise<void> {
  await updateSettings({ onboarded: false });
  router.navigate('/onboarding', 'root', 'replace');
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/tabs/today" /></ion-buttons>
        <ion-title>{{ t('settings.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list v-if="settings">
        <ion-list-header>{{ t('settings.content') }}</ion-list-header>
        <ion-item router-link="/tabs/settings/tips" detail>
          <ion-label>{{ t('tips.title') }}</ion-label>
        </ion-item>
        <ion-item router-link="/tabs/settings/about" detail>
          <ion-label>{{ t('about.title') }}</ion-label>
        </ion-item>
        <ion-item router-link="/tabs/settings/credits" detail>
          <ion-label>{{ t('credits.title') }}</ion-label>
        </ion-item>

        <ion-list-header>{{ t('settings.workout') }}</ion-list-header>
        <ion-item>
          <ion-toggle
            :checked="settings.supersets"
            @ion-change="setSupersets($event.detail.checked)"
          >
            {{ t('settings.supersets') }}
          </ion-toggle>
        </ion-item>
        <ion-item button @click="redoQuestionnaire">
          <ion-label>{{ t('settings.redo') }}</ion-label>
        </ion-item>

        <ion-list-header>{{ t('settings.notifications') }}</ion-list-header>
        <ion-item>
          <ion-toggle
            :checked="settings.notifications.enabled"
            @ion-change="setNotifications($event.detail.checked)"
          >
            {{ t('settings.notificationsAll') }}
          </ion-toggle>
        </ion-item>
        <ion-item v-for="kind in KINDS" :key="kind">
          <ion-toggle
            :checked="settings.notifications.kinds[kind]"
            :disabled="!settings.notifications.enabled"
            @ion-change="setKind(kind, $event.detail.checked)"
          >
            {{ t(`settings.kinds.${kind}`) }}
          </ion-toggle>
        </ion-item>
        <ion-item lines="none">
          <ion-label class="ion-text-wrap">
            <p>
              {{
                t('settings.quietHours', {
                  start: settings.notifications.quietHours.start,
                  end: settings.notifications.quietHours.end,
                })
              }}
            </p>
          </ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>
