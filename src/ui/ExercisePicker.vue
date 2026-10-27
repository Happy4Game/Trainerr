<script setup lang="ts">
import { vSearchLabel } from '@/ui/searchLabel';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonItemDivider,
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
import type { MuscleId } from '@/domain/muscles';
import { useCatalog } from '@/ui/useCatalog';

/**
 * Chooses one exercise of the catalog: the suggested ones first (e.g. the same
 * movement on other machines), then those for the muscles of the session in
 * progress (legs on a legs day), then the rest, my machines and popular ones first.
 */
const props = defineProps<{
  open: boolean;
  title: string;
  exclude?: readonly string[];
  suggested?: readonly string[];
  /** Muscles of the session in progress: their exercises come first, under their own title. */
  focus?: readonly MuscleId[];
}>();
const emit = defineEmits<{ pick: [exerciseId: string]; close: [] }>();

const SHOWN = 40;
const { t, locale } = useI18n();
const { entries } = useCatalog();
const query = ref('');

const rows = computed(() => {
  const french = locale.value.startsWith('fr');
  const excluded = new Set(props.exclude ?? []);
  const suggested = props.suggested ?? [];
  const focus = new Set(props.focus ?? []);
  const rank = (id: string) => {
    const index = suggested.indexOf(id);
    return index < 0 ? suggested.length : index;
  };
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
        suggested: suggested.includes(entry.exercise.id),
        focused: entry.exercise.primaryMuscles.some((m) => focus.has(m)),
        popular: isPopular(entry.exercise.id),
        illustrated: image !== undefined,
        ...(image ? { thumbnail: `${import.meta.env.BASE_URL}exercise-images/${image.file}` } : {}),
      };
    })
    .sort(
      (a, b) =>
        rank(a.id) - rank(b.id) ||
        Number(b.focused) - Number(a.focused) ||
        compareCatalog(compareNames(locale.value))(a, b),
    );
});
/** Rows under two titles when the session has muscles to put forward. */
const sections = computed(() => {
  if (!props.focus?.length) return [{ key: 'all', title: '', rows: rows.value.slice(0, SHOWN) }];
  const first = rows.value.filter((r) => r.suggested || r.focused).slice(0, SHOWN);
  const others = rows.value.filter((r) => !r.suggested && !r.focused).slice(0, SHOWN);
  return [
    { key: 'focus', title: t('picker.forSession'), rows: first },
    { key: 'others', title: t('picker.others'), rows: others },
  ].filter((section) => section.rows.length > 0);
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
          v-search-label="{ field: t('catalog.search'), clear: t('catalog.clearSearch') }"
          :debounce="150"
          :placeholder="t('catalog.searchShort')"
          :aria-label="t('catalog.search')"
        />
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list
        v-for="section in sections"
        :key="section.key"
        :aria-label="section.title || undefined"
      >
        <ion-item-divider v-if="section.title">
          <ion-label>{{ section.title }}</ion-label>
        </ion-item-divider>
        <ion-item v-for="row in section.rows" :key="row.id" button @click="pick(row.id)">
          <ion-thumbnail slot="start" class="thumbnail" aria-hidden="true">
            <img v-if="row.thumbnail" :src="row.thumbnail" alt="" loading="lazy" />
          </ion-thumbnail>
          <ion-label class="ion-text-wrap">
            <h2>{{ row.name }}</h2>
            <p v-if="row.suggested" class="suggested">{{ t('picker.sameMovement') }}</p>
            <p v-else-if="row.favorite">{{ t('picker.mine') }}</p>
            <p v-else-if="row.popular">{{ t('picker.popular') }}</p>
          </ion-label>
        </ion-item>
      </ion-list>
      <p v-if="rows.length === 0" class="ion-padding">
        {{ t('catalog.empty') }}
      </p>
    </ion-content>
  </ion-modal>
</template>

<style scoped>
.thumbnail {
  --size: 48px;
  --border-radius: 8px;
  background: #fff;
}
.suggested {
  color: var(--ion-color-primary) !important;
}
.thumbnail img {
  object-fit: contain;
}
</style>
