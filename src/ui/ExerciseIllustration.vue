<script setup lang="ts">
import { Pause, Play } from 'lucide-vue-next';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ExerciseIllustration } from '@/data/catalog/exerciseImages';

const props = defineProps<{ illustration: ExerciseIllustration; name: string }>();

const FRAME_MS = 1400;
const { t } = useI18n();

const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const animated = computed(() => props.illustration.images.length > 1 && !reducedMotion);
const playing = ref(true);
const frame = ref(0);
let timer: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  if (!animated.value) return;
  timer = setInterval(() => {
    if (playing.value) frame.value = (frame.value + 1) % props.illustration.images.length;
  }, FRAME_MS);
});
onBeforeUnmount(() => clearInterval(timer));

const src = (file: string) => `${import.meta.env.BASE_URL}exercise-images/${file}`;
const authors = computed(() => [
  ...new Map(props.illustration.images.map((i) => [i.author + i.license, i])).values(),
]);
</script>

<template>
  <figure class="illustration">
    <div
      class="frames"
      :class="{ animated }"
      role="img"
      :aria-label="t('exercise.illustration.label', { name })"
    >
      <img
        v-for="(image, index) in illustration.images"
        :key="image.file"
        :src="src(image.file)"
        alt=""
        loading="lazy"
        :class="{ visible: !animated || index === frame }"
      />
    </div>
    <button
      v-if="animated"
      type="button"
      class="toggle"
      :aria-label="t(playing ? 'exercise.illustration.pause' : 'exercise.illustration.play')"
      @click="playing = !playing"
    >
      <Pause v-if="playing" :size="20" aria-hidden="true" />
      <Play v-else :size="20" aria-hidden="true" />
    </button>
    <figcaption>
      {{ t('exercise.illustration.caption', { exercise: illustration.wgerName }) }}
      <template v-for="(image, index) in authors" :key="image.file">
        <span v-if="index > 0">, </span>
        <a v-if="image.authorUrl" :href="image.authorUrl" target="_blank" rel="noopener">{{
          image.author
        }}</a>
        <template v-else>{{ image.author }}</template>
        (<a :href="image.licenseUrl" target="_blank" rel="noopener">{{ image.license }}</a
        >)
      </template>
      —
      <a :href="illustration.sourceUrl" target="_blank" rel="noopener">wger.de</a>
    </figcaption>
  </figure>
</template>

<style scoped>
.illustration {
  position: relative;
  margin: 0;
}
.frames {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  gap: 8px;
  padding: 8px;
  border-radius: 12px;
  /* The drawings are black on white: keep a white card in the dark theme too. */
  background: #fff;
}
.frames img {
  width: 100%;
  max-height: 260px;
  object-fit: contain;
}
.frames.animated {
  grid-template-columns: 1fr;
}
.frames.animated img {
  grid-area: 1 / 1;
  opacity: 0;
  transition: opacity 0.35s ease-in-out;
}
.frames.animated img.visible {
  opacity: 1;
}
.toggle {
  position: absolute;
  inset-block-start: 8px;
  inset-inline-end: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  background: rgb(0 0 0 / 55%);
  color: #fff;
}
figcaption {
  margin-block-start: 6px;
  font-size: 0.8rem;
  color: var(--ion-color-medium);
}
</style>
