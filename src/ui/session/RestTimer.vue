<script setup lang="ts">
import { IonButton } from '@ionic/vue';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ endsAt: number }>();
const emit = defineEmits<{ done: []; adjust: [seconds: number] }>();

const { t } = useI18n();
const now = ref(Date.now());
// Full length of the rest, for the ring; grows when the rest is extended.
const total = ref(Math.max(1, props.endsAt - Date.now()));
watch(
  () => props.endsAt,
  (endsAt) => (total.value = Math.max(total.value, endsAt - Date.now(), 1)),
);
let timer: ReturnType<typeof setInterval> | undefined;

// The end time is absolute: the countdown stays right after the screen was off.
const remainingMs = computed(() => Math.max(0, props.endsAt - now.value));
const remaining = computed(() => Math.ceil(remainingMs.value / 1000));
const label = computed(() => {
  const minutes = Math.floor(remaining.value / 60);
  return `${minutes}:${String(remaining.value % 60).padStart(2, '0')}`;
});
const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const dash = computed(() => CIRCUMFERENCE * (remainingMs.value / total.value));

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
    <svg class="ring" viewBox="0 0 64 64" aria-hidden="true">
      <circle class="track" cx="32" cy="32" :r="RADIUS" />
      <circle
        class="progress"
        cx="32"
        cy="32"
        :r="RADIUS"
        :stroke-dasharray="`${dash} ${CIRCUMFERENCE}`"
      />
    </svg>
    <div class="text">
      <span class="title">{{ t('session.rest.title') }}</span>
      <span class="time" aria-hidden="true">{{ label }}</span>
    </div>
    <div class="actions">
      <ion-button fill="clear" size="small" @click="emit('adjust', -15)">
        −15 s<span class="visually-hidden">{{ t('session.rest.less') }}</span>
      </ion-button>
      <ion-button fill="clear" size="small" @click="emit('adjust', 30)">
        +30 s<span class="visually-hidden">{{ t('session.rest.more') }}</span>
      </ion-button>
      <ion-button fill="outline" size="small" @click="emit('done')">
        {{ t('session.rest.skip') }}
      </ion-button>
    </div>
  </div>
</template>

<style scoped>
.rest {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  margin-block-end: 12px;
  border-radius: var(--app-radius);
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
}
.ring {
  flex: none;
  width: 56px;
  height: 56px;
  transform: rotate(-90deg);
}
.ring circle {
  fill: none;
  stroke-width: 6;
}
.track {
  stroke: rgb(255 255 255 / 25%);
}
.progress {
  stroke: currentcolor;
  stroke-linecap: round;
  transition: stroke-dasharray 0.25s linear;
}
.text {
  display: flex;
  flex: 1;
  flex-direction: column;
  line-height: 1.1;
}
.title {
  font-size: 0.85rem;
  font-weight: 600;
  opacity: 0.9;
}
.time {
  font-size: 1.9rem;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 2px;
  max-width: 50%;
}
.actions ion-button {
  margin: 0;
  --color: var(--ion-color-primary-contrast);
  --border-color: var(--ion-color-primary-contrast);
  font-variant-numeric: tabular-nums;
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
