<script setup lang="ts">
import { IonButton } from '@ionic/vue';
import type { Component } from 'vue';

/** A screen with nothing yet: what it will show, and the step that fills it. */
defineProps<{ icon: Component; title: string; text: string; action?: string; to?: string }>();
const emit = defineEmits<{ act: [] }>();
</script>

<template>
  <div class="empty">
    <span class="badge" aria-hidden="true"><component :is="icon" :size="34" /></span>
    <h2>{{ title }}</h2>
    <p>{{ text }}</p>
    <ion-button v-if="action && to" :router-link="to">{{ action }}</ion-button>
    <ion-button v-else-if="action" @click="emit('act')">{{ action }}</ion-button>
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 22rem;
  margin: 32px auto;
  padding: 0 16px;
  text-align: center;
}
.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(var(--ion-color-primary-rgb), 0.12);
  color: var(--ion-color-primary);
}
h2 {
  margin: 16px 0 6px;
  font-size: 1.2rem;
  font-weight: 800;
}
p {
  margin: 0 0 16px;
  color: var(--ion-color-medium-shade);
}
</style>
