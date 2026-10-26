<script setup lang="ts">
import { IonButton } from '@ionic/vue';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSettings } from '@/ui/useSettings';
import { playRestOver } from './restSound';

const props = defineProps<{ endsAt: number }>();
const emit = defineEmits<{ done: []; adjust: [seconds: number] }>();

const { t } = useI18n();
const { settings } = useSettings();
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
const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const dash = computed(() => CIRCUMFERENCE * (remainingMs.value / total.value));

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now();
    if (remaining.value === 0) {
      clearInterval(timer);
      navigator.vibrate?.([300, 150, 300, 150, 300]);
      if (settings.value?.restSound !== false) playRestOver();
      emit('done');
    }
  }, 250);
});
onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <div class="rest" role="timer" :aria-label="t('session.rest.label', { time: label })">
    <div class="dial">
      <svg class="ring" viewBox="0 0 120 120" aria-hidden="true">
        <circle class="track" cx="60" cy="60" :r="RADIUS" />
        <circle
          class="progress"
          cx="60"
          cy="60"
          :r="RADIUS"
          :stroke-dasharray="`${dash} ${CIRCUMFERENCE}`"
        />
      </svg>
      <div class="text">
        <span class="title">{{ t('session.rest.title') }}</span>
        <span class="time" aria-hidden="true">{{ label }}</span>
      </div>
    </div>
    <div class="actions">
      <ion-button fill="outline" @click="emit('adjust', -15)">
        −15 s<span class="visually-hidden">{{ t('session.rest.less') }}</span>
      </ion-button>
      <ion-button fill="outline" @click="emit('adjust', 30)">
        +30 s<span class="visually-hidden">{{ t('session.rest.more') }}</span>
      </ion-button>
      <ion-button class="skip" @click="emit('done')">
        {{ t('session.rest.skip') }}
      </ion-button>
    </div>
  </div>
</template>

<style scoped>
/* Grand anneau qui se vide : lisible à bout de bras, entre deux séries. */
.rest {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--tr-space-4);
  padding: var(--tr-space-5) var(--tr-space-4) var(--tr-space-4);
  margin-block-end: var(--tr-space-3);
  border-radius: var(--tr-radius-l);
  background: var(--tr-hero);
  color: var(--tr-hero-text);
  box-shadow: var(--tr-shadow-2);
  animation: tr-pop var(--tr-duration-slow) var(--tr-ease-spring);
}
.dial {
  position: relative;
  width: 176px;
  height: 176px;
}
.ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}
.ring circle {
  fill: none;
  stroke-width: 9;
}
.track {
  stroke: currentcolor;
  opacity: 0.2;
}
.progress {
  stroke: currentcolor;
  stroke-linecap: round;
  transition: stroke-dasharray 0.25s linear;
}
.text {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
.title {
  font-size: var(--tr-font-s);
  font-weight: 700;
  opacity: 0.85;
}
.time {
  margin-top: 4px;
  font-size: var(--tr-font-display);
  font-variant-numeric: tabular-nums;
  font-weight: var(--tr-weight-black);
  letter-spacing: -0.03em;
}
.actions {
  display: grid;
  grid-template-columns: 1fr 1fr 1.4fr;
  gap: var(--tr-space-2);
  width: 100%;
}
.actions ion-button {
  margin: 0;
  min-height: var(--tr-touch);
  --color: var(--tr-hero-text);
  --border-color: currentcolor;
  font-variant-numeric: tabular-nums;
}
.actions .skip {
  --background: var(--tr-hero-text);
  --color: var(--ion-color-primary);
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
