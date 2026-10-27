<script setup lang="ts">
import { vSearchLabel } from '@/ui/searchLabel';
import EmptyState from '@/ui/EmptyState.vue';
import {
  IonButton,
  IonButtons,
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
import { Dumbbell, PersonStanding, Star, X } from 'lucide-vue-next';
import type { MuscleId } from '@/domain/muscles';
import BodyPicker from '@/ui/muscleMap/BodyPicker.vue';
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
import LoadNoteModal from '@/ui/LoadNoteModal.vue';
import { useSession } from '@/ui/session/useSession';
import { useCatalog } from '@/ui/useCatalog';
import { useUnits } from '@/ui/useUnits';

const PAGE_SIZE = 50;
const FILTERS = ['all', 'favorites', 'push', 'pull', 'legs', 'core'] as const;
type Filter = (typeof FILTERS)[number];

const { t, locale } = useI18n();
const { entries, state, toggleFavorite } = useCatalog();
const session = useSession();
const { load: kg } = useUnits();

/** Load lifted on each machine: last session or noted by hand, editable from here. */
const noting = ref<{ id: string; name: string }>();

/** Search by body part: muscles of the zone touched on the silhouette. */
const showBody = ref(false);
const zoneMuscles = ref<MuscleId[]>([]);
const zoneLabel = computed(() => zoneMuscles.value.map((m) => t(`muscles.${m}`)).join(', '));
watch(zoneMuscles, () => (shown.value = PAGE_SIZE));
/** A muscle touched shows all its exercises, whatever body part tab was open. */
function pickZone(muscles: MuscleId[]): void {
  zoneMuscles.value = muscles;
  if (muscles.length > 0 && filter.value !== 'favorites') filter.value = 'all';
}
// Back to the normal search: the muscle touched is forgotten.
watch(showBody, (open) => {
  if (!open) zoneMuscles.value = [];
});
const loadOf = (entry: CatalogEntry) => session.myLoadFor(entry.exercise.id);
const loadText = (entry: CatalogEntry) => {
  const l = loadOf(entry);
  return l ? `${kg(l.loadKg)} × ${l.reps}` : '';
};

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
    .filter(
      (entry) =>
        zoneMuscles.value.length === 0 ||
        entry.exercise.primaryMuscles.some((m) => zoneMuscles.value.includes(m)),
    )
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
  if (!FILTERS.includes(value as Filter)) return;
  filter.value = value as Filter;
  // A body part tab replaces the search by muscle rather than narrowing it.
  if (filter.value !== 'all' && filter.value !== 'favorites') showBody.value = false;
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
          v-search-label="{ field: t('catalog.search'), clear: t('catalog.clearSearch') }"
          :debounce="150"
          :placeholder="t('catalog.searchShort')"
          :aria-label="t('catalog.search')"
        />
        <ion-buttons slot="end">
          <ion-button
            :fill="showBody ? 'solid' : 'clear'"
            :aria-pressed="showBody"
            :aria-label="t('catalog.body.toggle')"
            @click="showBody = !showBody"
          >
            <PersonStanding :size="24" aria-hidden="true" />
          </ion-button>
        </ion-buttons>
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
        <section v-if="showBody" class="body-search" :aria-label="t('catalog.body.title')">
          <p class="body-help">{{ t('catalog.body.help') }}</p>
          <BodyPicker :selected="zoneMuscles" @pick="pickZone" />
        </section>
        <div v-if="zoneMuscles.length > 0" class="zone-chip">
          <span>{{ t('catalog.body.zone', { muscles: zoneLabel }) }}</span>
          <ion-button
            size="small"
            fill="clear"
            :aria-label="t('catalog.body.clear')"
            @click="zoneMuscles = []"
          >
            <X :size="18" aria-hidden="true" />
          </ion-button>
        </div>
        <p class="ion-padding-horizontal count" role="status">
          {{ t('catalog.count', matching.length) }}
        </p>
        <EmptyState
          v-if="filter === 'favorites' && matching.length === 0 && !query"
          :icon="Star"
          :title="t('emptyStates.favorites')"
          :text="t('catalog.noFavorites')"
          :action="t('emptyStates.seeAll')"
          @act="filter = 'all'"
        />
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
                <button
                  type="button"
                  class="my-load"
                  :class="{ empty: !loadOf(entry) }"
                  :aria-label="
                    loadOf(entry)
                      ? t('myLoad.edit', { name, load: loadText(entry) })
                      : t('myLoad.add', { name })
                  "
                  @click.stop.prevent="noting = { id: entry.exercise.id, name }"
                >
                  <Dumbbell v-if="loadOf(entry)" :size="16" aria-hidden="true" />
                  {{ loadOf(entry) ? loadText(entry) : t('myLoad.addShort') }}
                </button>
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
      <LoadNoteModal
        :exercise-id="noting?.id"
        :name="noting?.name ?? ''"
        @close="noting = undefined"
      />
    </ion-content>
  </ion-page>
</template>

<style scoped>
.body-search {
  margin: 8px 16px;
  padding: 12px;
  border-radius: var(--app-radius);
  background: var(--ion-card-background);
  box-shadow: var(--app-shadow);
}
.body-help {
  margin: 0 0 8px;
  font-size: 0.85rem;
  color: var(--ion-color-medium-shade);
  text-align: center;
}
.zone-chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 8px 16px 0;
  padding: 2px 4px 2px 14px;
  border-radius: 999px;
  background: rgba(var(--ion-color-primary-rgb), 0.12);
  color: var(--ion-color-primary);
  font-weight: 700;
}
.my-load {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  margin-block-start: 6px;
  padding: 4px 12px;
  border: 0;
  border-radius: 999px;
  background: rgba(var(--ion-color-primary-rgb), 0.12);
  color: var(--ion-color-primary);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 700;
}
.my-load:focus {
  outline: none;
}
.my-load:focus-visible {
  outline: 2px solid var(--ion-color-primary);
  outline-offset: 2px;
}
.my-load.empty {
  min-height: 28px;
  margin-block-start: 2px;
  padding: 2px 0;
  background: transparent;
  font-size: 0.85rem;
  font-weight: 600;
}
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
