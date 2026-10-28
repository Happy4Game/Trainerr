<script setup lang="ts">
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { allIllustrations } from '@/data/catalog/exerciseImages';
import { SOURCES } from '@/data/content/sources';

interface Library {
  name: string;
  version: string;
  license: string;
  text: string;
}

const { t } = useI18n();
const libraries = ref<Library[]>([]);
onMounted(async () => {
  // ~200 kB of license texts: loaded only on this page.
  libraries.value = (await import('@/data/content/licenses.json')).default as Library[];
});

const imageAuthors = computed(() => {
  const authors = new Map<string, { license: string; licenseUrl: string }>();
  for (const illustration of Object.values(allIllustrations())) {
    for (const image of illustration.images) {
      authors.set(image.author, { license: image.license, licenseUrl: image.licenseUrl });
    }
  }
  return [...authors.entries()];
});
const themes = ['programme', 'order', 'nutrition', 'technique', 'health', 'models'] as const;
const spdx = (license: string) =>
  `https://spdx.org/licenses/${license.replace(/[()]/g, '').split(' ')[0]}.html`;
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"
          ><ion-back-button default-href="/tabs/settings" :text="t('common.back')"
        /></ion-buttons>
        <ion-title>{{ t('credits.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <h2>{{ t('credits.data.title') }}</h2>
      <ul>
        <li>
          <a href="https://github.com/yuhonas/free-exercise-db" target="_blank" rel="noopener"
            >free-exercise-db</a
          >
          — {{ t('credits.data.freeExerciseDb') }}
        </li>
        <li>
          <a href="https://github.com/everkinetic/data" target="_blank" rel="noopener"
            >Everkinetic</a
          >
          {{ t('credits.data.and') }}
          <a href="https://wger.de" target="_blank" rel="noopener">wger.de</a> —
          {{ t('credits.data.images') }}
          <ul>
            <li v-for="[author, info] in imageAuthors" :key="author">
              {{ author }} (<a :href="info.licenseUrl" target="_blank" rel="noopener">{{
                info.license
              }}</a
              >)
            </li>
          </ul>
        </li>
        <li>{{ t('credits.data.aiDrawings') }}</li>
        <li>
          <a href="https://github.com/abdofallah/MuscleMapJS" target="_blank" rel="noopener"
            >MuscleMapJS</a
          >
          {{ t('credits.data.and') }}
          <a href="https://github.com/melihcolpan/MuscleMap" target="_blank" rel="noopener"
            >MuscleMap</a
          >
          (Melih Çolpan) — {{ t('credits.data.muscleMap') }}
        </li>
        <li>
          <a href="https://lucide.dev/license" target="_blank" rel="noopener">Lucide</a> —
          {{ t('credits.data.lucide') }}
        </li>
      </ul>

      <h2>{{ t('credits.sources.title') }}</h2>
      <template v-for="theme in themes" :key="theme">
        <h3>{{ t(`credits.sources.themes.${theme}`) }}</h3>
        <ul>
          <li v-for="source in SOURCES.filter((s) => s.theme === theme)" :key="source.id">
            <a :href="source.url" target="_blank" rel="noopener">{{ source.label }}</a>
          </li>
        </ul>
      </template>

      <h2>{{ t('credits.libraries.title') }}</h2>
      <p class="small">{{ t('credits.libraries.help', { count: libraries.length }) }}</p>
      <details v-for="lib in libraries" :key="`${lib.name}@${lib.version}`">
        <summary>{{ lib.name }} {{ lib.version }} — {{ lib.license }}</summary>
        <pre v-if="lib.text">{{ lib.text }}</pre>
        <p v-else>
          {{ t('credits.libraries.standard') }}
          <a :href="spdx(lib.license)" target="_blank" rel="noopener">{{ lib.license }}</a>
        </p>
      </details>
    </ion-content>
  </ion-page>
</template>

<style scoped>
h2 {
  margin-block-start: 24px;
  font-size: 1.2rem;
}
h3 {
  font-size: 1rem;
}
.small {
  color: var(--ion-color-medium);
  font-size: 0.85rem;
}
details {
  margin-block: 4px;
}
summary {
  min-height: 32px;
  cursor: pointer;
}
pre {
  overflow-x: auto;
  white-space: pre-wrap;
  font-size: 0.7rem;
}
</style>
