<script setup lang="ts">
import {
  IonButton,
  IonContent,
  IonHeader,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonList,
  IonPage,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonThumbnail,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { Star } from 'lucide-vue-next';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { CatalogEntry } from '@/data/repositories/catalogRepository';
import { illustrationFor } from '@/data/catalog/exerciseImages';
import { isPopular } from '@/data/catalog/curated';
import {
  catalogSection,
  compareCatalog,
  compareNames,
  matchesSearch,
  type CatalogSection,
} from '@/domain/catalogSearch';
import { useCatalog } from '@/ui/useCatalog';

const PAGE_SIZE = 50;
const FILTERS = ['all', 'favorites', 'push', 'pull', 'legs', 'core'] as const;
type Filter = (typeof FILTERS)[number];

const { t, locale } = useI18n();
const { entries, state, toggleFavorite } = useCatalog();

const query = ref('');
const filter = ref<Filter>('all');
const shown = ref(PAGE_SIZE);
watch([query, filter], () => (shown.value = PAGE_SIZE));

const displayName = (entry: CatalogEntry) =>
  locale.value.startsWith('fr') ? entry.exercise.name : entry.exercise.nameEn;

function searchTexts(entry: CatalogEntry): string[] {
  const e = entry.exercise;
  return [
    e.name,
    e.nameEn,
    e.machineName ?? '',
    ...e.aliases,
    ...e.primaryMuscles.map((m) => t(`muscles.${m}`)),
  ];
}

interface Row {
  readonly entry: CatalogEntry;
  readonly name: string;
  readonly favorite: boolean;
  readonly popular: boolean;
  readonly illustrated: boolean;
  readonly thumbnail?: string;
}

const matching = computed<Row[]>(() => {
  const compare = compareCatalog(compareNames(locale.value));
  return entries.value
    .filter((entry) => {
      if (filter.value === 'favorites') return entry.favorite;
      if (filter.value === 'all') return true;
      return entry.exercise.group === filter.value;
    })
    .filter((entry) => matchesSearch(searchTexts(entry), query.value))
    .map((entry) => {
      const image = illustrationFor(entry.exercise.id)?.images[0];
      return {
        entry,
        name: displayName(entry),
        favorite: entry.favorite,
        popular: isPopular(entry.exercise.id),
        illustrated: image !== undefined,
        ...(image ? { thumbnail: `${import.meta.env.BASE_URL}exercise-images/${image.file}` } : {}),
      };
    })
    .sort(compare);
});
const visible = computed(() => matching.value.slice(0, shown.value));
/** Section title before the first row of each part (not in "my machines" filter). */
const sectionStart = (index: number): CatalogSection | undefined => {
  if (filter.value === 'favorites') return undefined;
  const row = visible.value[index];
  const previous = visible.value[index - 1];
  if (!row) return undefined;
  const section = catalogSection(row);
  return previous && catalogSection(previous) === section ? undefined : section;
};

function subtitle(entry: CatalogEntry): string {
  const e = entry.exercise;
  const machine = e.machineName ?? (displayName(entry) === e.nameEn ? undefined : e.nameEn);
  const muscles = e.primaryMuscles.map((m) => t(`muscles.${m}`)).join(', ');
  return machine ? `${machine} · ${muscles}` : muscles;
}

function onFilter(value: unknown): void {
  if (FILTERS.includes(value as Filter)) filter.value = value as Filter;
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ t('tabs.catalog') }}</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          v-model="query"
          :debounce="150"
          :placeholder="t('catalog.search')"
          :aria-label="t('catalog.search')"
        />
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment :value="filter" scrollable @ion-change="onFilter($event.detail.value)">
          <ion-segment-button v-for="f in FILTERS" :key="f" :value="f">
            <ion-label>{{ t(`catalog.filters.${f}`) }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <p v-if="state.kind === 'loading' || state.kind === 'idle'" class="ion-padding" role="status">
        {{ t('catalog.loading') }}
      </p>
      <p v-else-if="state.kind === 'error'" class="ion-padding" role="alert">
        {{ t('catalog.error', { message: state.message }) }}
      </p>
      <template v-else>
        <p class="ion-padding-horizontal count" role="status">
          {{ t('catalog.count', matching.length) }}
        </p>
        <p v-if="filter === 'favorites' && matching.length === 0 && !query" class="ion-padding">
          {{ t('catalog.noFavorites') }}
        </p>
        <p v-else-if="matching.length === 0" class="ion-padding">{{ t('catalog.empty') }}</p>

        <ion-list>
          <template v-for="({ entry, name, thumbnail }, index) in visible" :key="entry.exercise.id">
            <ion-item-divider v-if="sectionStart(index)" sticky>
              <ion-label>{{ t(`catalog.sections.${sectionStart(index)}`) }}</ion-label>
            </ion-item-divider>
            <ion-item
              :router-link="`/tabs/catalog/${encodeURIComponent(entry.exercise.id)}`"
              detail
            >
              <ion-thumbnail slot="start" class="thumbnail" aria-hidden="true">
                <img v-if="thumbnail" :src="thumbnail" alt="" loading="lazy" />
              </ion-thumbnail>
              <ion-label class="ion-text-wrap">
                <h2>{{ name }}</h2>
                <p>{{ subtitle(entry) }}</p>
              </ion-label>
              <ion-button
                slot="end"
                fill="clear"
                class="star"
                :aria-pressed="entry.favorite"
                :aria-label="
                  t(entry.favorite ? 'catalog.removeFavorite' : 'catalog.addFavorite', {
                    name,
                  })
                "
                @click.stop.prevent="toggleFavorite(entry.exercise.id)"
              >
                <Star
                  :size="26"
                  :fill="entry.favorite ? 'currentColor' : 'none'"
                  aria-hidden="true"
                />
              </ion-button>
            </ion-item>
          </template>
        </ion-list>
        <div v-if="visible.length < matching.length" class="ion-padding">
          <ion-button expand="block" fill="outline" @click="shown += PAGE_SIZE">
            {{ t('catalog.showMore') }}
          </ion-button>
        </div>
      </template>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.count {
  margin-block: 8px 0;
  color: var(--ion-color-medium);
  font-size: 0.9rem;
}
.thumbnail {
  --size: 56px;
  --border-radius: 8px;
  /* Black-on-white drawings: white card in the dark theme too. */
  background: #fff;
}
.thumbnail img {
  object-fit: contain;
}
.star {
  min-width: 48px;
  min-height: 48px;
  --color: var(--ion-color-warning-shade, #e0ac08);
}
</style>
