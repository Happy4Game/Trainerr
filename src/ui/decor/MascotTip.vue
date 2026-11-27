<script setup lang="ts">
import { IonButton } from '@ionic/vue';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { todayIso } from '@/ui/today';
import { tipOfTheDay } from './mascotLines';
import MascotSays from './MascotSays.vue';

/**
 * On Today: the mascot gives the tip of the day ("Un autre" gives the next
 * one), in a mood that follows the day: asleep on a rest day, holding its
 * trophy once the session is done, waving otherwise.
 */
const props = defineProps<{ day: 'restDay' | 'done' | 'training' }>();
const { t } = useI18n();
const pose = computed(() =>
  props.day === 'restDay' ? 'sleep' : props.day === 'done' ? 'trophy' : 'wave',
);
const message = computed(() => {
  const advice = t('decor.tipOfTheDay', { tip: t(`tips.items.${tip.value}.title`) });
  return props.day === 'training' ? advice : `${t(`decor.today.${props.day}`)} ${advice}`;
});
const offset = ref(0);
const tip = computed(() => tipOfTheDay(todayIso(), offset.value));
</script>

<template>
  <MascotSays :message="message" :pose="pose">
    <div class="actions">
      <ion-button size="small" fill="clear" router-link="/tabs/settings/tips">
        {{ t('decor.readTip') }}
      </ion-button>
      <ion-button size="small" fill="clear" color="medium" @click="offset += 1">
        {{ t('decor.anotherTip') }}
      </ion-button>
    </div>
  </MascotSays>
</template>

<style scoped>
.actions {
  display: flex;
  flex-wrap: wrap;
  margin: var(--tr-space-1) calc(-1 * var(--tr-space-2)) calc(-1 * var(--tr-space-2));
}
</style>
