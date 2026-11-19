<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import { onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { onNotificationTap, refreshNotifications } from '@/ui/notifications';
import { checkWhenDue } from '@/ui/updates';
import { useAutoFinish } from '@/ui/session/useAutoFinish';
import { keepTodayUpToDate } from '@/ui/today';
import { syncCloudBackup } from '@/ui/cloudBackup';

const router = useRouter();
// A session left open once everything is done closes by itself after 10 min.
useAutoFinish();

// Android only, if kept on in the settings. Android keeps the app in memory:
// coming back to it is not a new launch, so the check also runs then.
const check = () => void checkWhenDue().catch(() => undefined);
// The reminders cover one week: planned again each time the app is opened,
// so that they never run out and never go off for a time already past.
const plan = () => void refreshNotifications();
const onVisible = () => {
  if (document.visibilityState !== 'visible') return;
  check();
  plan();
};
onMounted(() => {
  // Google backup: off unless the user turned it on (TrainerrBackupAgent.java).
  void syncCloudBackup();
  check();
  plan();
  void onNotificationTap((route) => void router.push(route));
  document.addEventListener('visibilitychange', onVisible);
});
// Today's date follows midnight, even when the app stays open overnight.
const stopToday = keepTodayUpToDate();
onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisible);
  stopToday();
});
</script>

<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>
