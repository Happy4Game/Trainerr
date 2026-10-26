<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import { onMounted } from 'vue';
import { checkAtStartup } from '@/ui/updates';

// Android only, once a day, and only if kept on in the settings.
onMounted(() => void checkAtStartup().catch(() => undefined));
</script>

<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>
