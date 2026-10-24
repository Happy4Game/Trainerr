<script setup lang="ts">
import { IonButton } from '@ionic/vue';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ endsAt: number }>();
const emit = defineEmits<{ done: [] }>();

const { t } = useI18n();
const now = ref(Date.now());
let timer: ReturnType<typeof setInterval> | undefined;

// The end time is absolute: the countdown stays right after the screen was off.
const remaining = computed(() => Math.max(0, Math.ceil((props.endsAt - now.value) / 1000)));
const label = computed(() => {
  const minutes = Math.floor(remaining.value / 60);
  return `${minutes}:${String(remaining.value % 60).padStart(2, '0')}`;
});

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now();
    if (remaining.value === 0) {
      clearInterval(timer);
      navigator.vibrate?.([300, 150, 300]);
      emit('done');
    }
  }, 250);
});
onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <div class="rest" role="timer" :aria-label="t('session.rest.label', { time: label })">
    <span class="title">{{ t('session.rest.title') }}</span>
    <span class="time" aria-hidden="true">{{ label }}</span>
    <ion-button fill="outline" size="small" @click="emit('done')">
      {{ t('session.rest.skip') }}
    </ion-button>
  </div>
</template>

<style scoped>
.rest {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-block-end: 12px;
  border-radius: 12px;
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
}
.title {
  flex: 1;
  font-weight: 600;
}
.time {
  font-size: 1.8rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}
ion-button {
  --color: var(--ion-color-primary-contrast);
  --border-color: var(--ion-color-primary-contrast);
}
</style>
