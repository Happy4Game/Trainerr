<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import { onMounted, onUnmounted } from 'vue';
import { checkWhenDue } from '@/ui/updates';

// Android only, if kept on in the settings. Android keeps the app in memory:
// coming back to it is not a new launch, so the check also runs then.
const check = () => void checkWhenDue().catch(() => undefined);
const onVisible = () => {
  if (document.visibilityState === 'visible') check();
};
onMounted(() => {
  check();
  document.addEventListener('visibilitychange', onVisible);
});
onUnmounted(() => document.removeEventListener('visibilitychange', onVisible));
</script>

<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>
