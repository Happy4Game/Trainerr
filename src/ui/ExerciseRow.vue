<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next';
import { computed } from 'vue';
import { illustrationFor } from '@/data/catalog/exerciseImages';

/** One exercise of a list: drawing, name, detail line; the whole row opens its card. */
const props = defineProps<{ exerciseId: string; name: string; detail?: string; to: string }>();

const thumbnail = computed(() => {
  const image = illustrationFor(props.exerciseId)?.images[0];
  return image ? `${import.meta.env.BASE_URL}exercise-images/${image.file}` : undefined;
});
</script>

<template>
  <router-link :to="to" class="row">
    <span class="thumb" aria-hidden="true">
      <img v-if="thumbnail" :src="thumbnail" alt="" loading="lazy" />
    </span>
    <span class="text">
      <span class="name">{{ name }}</span>
      <span v-if="detail" class="detail"><slot name="badge" />{{ detail }}</span>
    </span>
    <ChevronRight :size="20" aria-hidden="true" class="chevron" />
  </router-link>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  padding-block: 6px;
  color: inherit;
  text-decoration: none;
}
.thumb {
  flex: none;
  width: 52px;
  height: 52px;
  border-radius: 10px;
  /* Black-on-white drawings: white card in the dark theme too. */
  background: #fff;
  overflow: hidden;
}
.thumb img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}
.name {
  font-weight: 600;
}
.detail {
  font-size: 0.85rem;
  color: var(--ion-color-medium-shade);
}
.chevron {
  flex: none;
  color: var(--ion-color-medium);
}
</style>
