<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonSearchbar,
  IonThumbnail,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { isPopular } from '@/data/catalog/curated';
import { illustrationFor } from '@/data/catalog/exerciseImages';
import { compareCatalog, compareNames, matchesSearch } from '@/domain/catalogSearch';
import { useCatalog } from '@/ui/useCatalog';

/** Chooses one exercise of the catalog: my machines and popular ones first. */
const props = defineProps<{ open: boolean; title: string; exclude?: readonly string[] }>();
const emit = defineEmits<{ pick: [exerciseId: string]; close: [] }>();

const SHOWN = 40;
const { t, locale } = useI18n();
const { entries } = useCatalog();
const query = ref('');

const rows = computed(() => {
  const french = locale.value.startsWith('fr');
  const excluded = new Set(props.exclude ?? []);
  return entries.value
    .filter((entry) => !excluded.has(entry.exercise.id))
    .filter((entry) =>
      matchesSearch(
        [entry.exercise.name, entry.exercise.nameEn, ...entry.exercise.aliases],
        query.value,
      ),
    )
    .map((entry) => {
      const image = illustrationFor(entry.exercise.id)?.images[0];
      return {
        id: entry.exercise.id,
        name: french ? entry.exercise.name : entry.exercise.nameEn,
        favorite: entry.favorite,
        popular: isPopular(entry.exercise.id),
        illustrated: image !== undefined,
        ...(image ? { thumbnail: `${import.meta.env.BASE_URL}exercise-images/${image.file}` } : {}),
      };
    })
    .sort(compareCatalog(compareNames(locale.value)))
    .slice(0, SHOWN);
});

function pick(id: string): void {
  query.value = '';
  emit('pick', id);
}
</script>

<template>
  <ion-modal :is-open="open" @did-dismiss="emit('close')">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ title }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="emit('close')">{{ t('picker.cancel') }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          v-model="query"
          :debounce="150"
          :placeholder="t('catalog.search')"
          :aria-label="t('catalog.search')"
        />
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list>
        <ion-item v-for="row in rows" :key="row.id" button @click="pick(row.id)">
          <ion-thumbnail slot="start" class="thumbnail" aria-hidden="true">
            <img v-if="row.thumbnail" :src="row.thumbnail" alt="" loading="lazy" />
          </ion-thumbnail>
          <ion-label class="ion-text-wrap">
            <h2>{{ row.name }}</h2>
            <p v-if="row.favorite">{{ t('picker.mine') }}</p>
            <p v-else-if="row.popular">{{ t('picker.popular') }}</p>
          </ion-label>
        </ion-item>
      </ion-list>
      <p v-if="rows.length === 0" class="ion-padding">{{ t('catalog.empty') }}</p>
    </ion-content>
  </ion-modal>
</template>

<style scoped>
.thumbnail {
  --size: 48px;
  --border-radius: 8px;
  background: #fff;
}
.thumbnail img {
  object-fit: contain;
}
</style>
