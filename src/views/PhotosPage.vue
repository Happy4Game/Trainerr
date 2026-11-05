<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { Camera, Columns2, ImagePlus } from 'lucide-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  importedPhotoDate,
  lastPhotoOfPose,
  PHOTO_POSES,
  photosOfPose,
  photoTimeline,
  samePoseComparison,
  type PhotoPose,
} from '@/domain/photos';
import CameraCapture from '@/ui/body/CameraCapture.vue';
import PhotoViewer from '@/ui/body/PhotoViewer.vue';
import { useBodyMeasurements, type BodyPhoto } from '@/ui/body/useBodyMeasurements';
import { readPhoto } from '@/ui/photo';
import { useSession } from '@/ui/session/useSession';
import { todayIso } from '@/ui/useWeekPlan';
import { useRouter } from 'vue-router';

/**
 * Body photos over time: taken with the camera inside the app or imported
 * from the phone's gallery, dated, sorted by pose. They stay in the app's own
 * database on the phone: nothing is sent anywhere.
 */
type Photo = BodyPhoto;

const { t, locale } = useI18n();
const session = useSession();

const body = useBodyMeasurements();
const photos = body.photos;
const pose = ref<PhotoPose | 'all'>('all');
const busy = ref(false);
const opened = ref<string>();
const camera = ref(false);
const router = useRouter();

onMounted(body.reload);

const sessionDates = computed(() => session.history.value.map((s) => s.date));
const shown = computed(() =>
  photosOfPose(photos.value, pose.value === 'all' ? undefined : pose.value),
);
const months = computed(() => photoTimeline(shown.value, sessionDates.value));
/** Side by side: the same pose only, so that the change is the body, not the angle. */
const comparison = computed(() =>
  samePoseComparison(
    shown.value,
    sessionDates.value,
    pose.value === 'all' ? undefined : pose.value,
  ),
);
/** In the order of the screen, newest first: the viewer's arrows follow it. */
const ordered = computed(() => months.value.flatMap((m) => m.photos.map((p) => p.photo)));

const monthName = (month: string) =>
  new Intl.DateTimeFormat(locale.value, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${month}-01T00:00:00Z`),
  );
const shortDate = (date: string) =>
  new Intl.DateTimeFormat(locale.value, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));

async function importFiles(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const files = [...(input.files ?? [])];
  input.value = '';
  if (files.length === 0) return;
  busy.value = true;
  try {
    const today = todayIso();
    for (const file of files) {
      await body.add({
        date: importedPhotoDate(file.lastModified, today),
        measurements: {},
        photo: await readPhoto(file),
        ...(pose.value === 'all' ? {} : { pose: pose.value }),
      });
    }
  } finally {
    busy.value = false;
  }
}

async function taken(photo: string, takenPose: PhotoPose): Promise<void> {
  await body.add({ date: todayIso(), measurements: {}, photo, pose: takenPose });
}

function compare(photo?: Photo): void {
  opened.value = undefined;
  const c = comparison.value;
  const query = photo ? { after: photo.id } : c ? { before: c.before.id, after: c.after.id } : {};
  void router.push({ path: '/tabs/history/photos/compare', query });
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/history?view=body" :text="t('common.back')" />
        </ion-buttons>
        <ion-title>{{ t('body.gallery.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p class="privacy" role="note">{{ t('body.gallery.privacy') }}</p>

      <div class="add">
        <button type="button" class="add-button primary" :disabled="busy" @click="camera = true">
          <Camera :size="20" aria-hidden="true" />
          {{ t('body.gallery.take') }}
        </button>
        <label class="add-button">
          <ImagePlus :size="20" aria-hidden="true" />
          {{ t('body.gallery.import') }}
          <input type="file" accept="image/*" multiple :disabled="busy" @change="importFiles" />
        </label>
      </div>
      <p class="hint">{{ t('body.gallery.tip') }}</p>

      <ion-segment
        :value="pose"
        :aria-label="t('body.gallery.pose')"
        @ion-change="pose = $event.detail.value as PhotoPose | 'all'"
      >
        <ion-segment-button value="all">{{ t('body.gallery.poses.all') }}</ion-segment-button>
        <ion-segment-button v-for="p in PHOTO_POSES" :key="p" :value="p">
          {{ t(`body.gallery.poses.${p}`) }}
        </ion-segment-button>
      </ion-segment>

      <p v-if="busy" role="status">{{ t('body.gallery.adding') }}</p>
      <p v-else-if="photos.length === 0" class="empty">{{ t('body.gallery.empty') }}</p>
      <p v-else-if="shown.length === 0" class="empty">{{ t('body.gallery.emptyPose') }}</p>

      <section v-if="comparison" class="compare-card" :aria-label="t('body.gallery.compareTitle')">
        <h2>{{ t('body.gallery.compareTitle') }}</h2>
        <p class="hint">
          {{
            t('body.gallery.between', {
              weeks: t('body.gallery.weeks', comparison.weeks),
              sessions: t('body.gallery.sessions', comparison.sessions),
            })
          }}
        </p>
        <div class="compare">
          <figure v-for="p in [comparison.before, comparison.after]" :key="p.id">
            <button
              type="button"
              class="photo-button"
              :aria-label="t('body.gallery.openNamed', { date: shortDate(p.date) })"
              @click="opened = p.id"
            >
              <img :src="p.photo" :alt="t('body.photo.alt', { date: shortDate(p.date) })" />
            </button>
            <figcaption>{{ shortDate(p.date) }}</figcaption>
          </figure>
        </div>
        <ion-button expand="block" fill="outline" class="compare-more" @click="compare()">
          <Columns2 :size="20" aria-hidden="true" class="icon" />
          {{ t('body.compare.open') }}
        </ion-button>
      </section>

      <section v-for="m in months" :key="m.month" class="month" :aria-label="monthName(m.month)">
        <h2>{{ monthName(m.month) }}</h2>
        <div class="grid">
          <button
            v-for="item in m.photos"
            :key="item.photo.id"
            type="button"
            class="thumb"
            :aria-label="t('body.gallery.openNamed', { date: shortDate(item.photo.date) })"
            @click="opened = item.photo.id"
          >
            <img :src="item.photo.photo" alt="" />
            <span class="caption">
              {{ shortDate(item.photo.date) }}
              <span class="sub">{{ t('body.gallery.sessions', item.sessions) }}</span>
            </span>
          </button>
        </div>
      </section>

      <CameraCapture
        :open="camera"
        :start-pose="pose === 'all' ? undefined : pose"
        :last-of-pose="lastPhotoOfPose(photos)"
        @take="taken"
        @close="camera = false"
      />

      <PhotoViewer v-model:opened-id="opened" :photos="ordered" editable @compare="compare" />
    </ion-content>
  </ion-page>
</template>

<style scoped>
.privacy {
  margin-block-start: 0;
  padding: 10px 12px;
  border-radius: var(--tr-radius-m);
  background: var(--tr-surface-2);
  font-size: 0.9rem;
}
.add {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.add-button {
  position: relative;
  display: inline-flex;
  flex: 1 1 140px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  padding-inline: 12px;
  border: 1px solid var(--ion-color-primary);
  border-radius: var(--tr-radius-pill);
  color: var(--ion-color-primary);
  font-weight: 700;
}
.add-button.primary {
  border: 0;
  background: var(--ion-color-primary);
  font: inherit;
  font-weight: 700;
  color: var(--ion-color-primary-contrast);
}
.add-button input {
  position: absolute;
  inset: 0;
  opacity: 0;
}
.hint,
.empty {
  color: var(--tr-text-muted);
  font-size: 0.9rem;
}
.compare-card h2,
.month h2 {
  margin: 20px 0 6px;
  font-size: 1.1rem;
  text-transform: capitalize;
}
.compare {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.compare figure {
  margin: 0;
  text-align: center;
}
.compare img {
  width: 100%;
  border-radius: 8px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}
.thumb {
  display: flex;
  flex-direction: column;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: start;
}
.thumb img {
  width: 100%;
  aspect-ratio: 3 / 4;
  border-radius: 8px;
  object-fit: cover;
}
.caption {
  font-size: 0.8rem;
}
.sub {
  display: block;
  color: var(--tr-text-muted);
}
.photo-button {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
}
.compare img {
  aspect-ratio: 3 / 4;
  object-fit: cover;
}
.compare-more {
  margin-block-start: 8px;
}
.icon {
  margin-inline-end: 8px;
}
</style>
