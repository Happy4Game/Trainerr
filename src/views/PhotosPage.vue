<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonModal,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { Camera, ImagePlus } from 'lucide-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  importedPhotoDate,
  lastPhotoOfPose,
  PHOTO_POSES,
  photoComparison,
  photosOfPose,
  photoTimeline,
  type PhotoPose,
} from '@/domain/photos';
import CameraCapture from '@/ui/body/CameraCapture.vue';
import { useBodyMeasurements, type BodyPhoto } from '@/ui/body/useBodyMeasurements';
import { readPhoto } from '@/ui/photo';
import { useSession } from '@/ui/session/useSession';
import { todayIso } from '@/ui/useWeekPlan';

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
const opened = ref<Photo>();
const confirmDelete = ref(false);
const camera = ref(false);

onMounted(body.reload);

const sessionDates = computed(() => session.history.value.map((s) => s.date));
const shown = computed(() =>
  photosOfPose(photos.value, pose.value === 'all' ? undefined : pose.value),
);
const months = computed(() => photoTimeline(shown.value, sessionDates.value));
/** Side by side: the same pose only, so that the change is the body, not the angle. */
const comparison = computed(() =>
  photoComparison(
    pose.value === 'all' ? shown.value : shown.value.filter((p) => p.pose === pose.value),
    sessionDates.value,
  ),
);

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

function open(photo: Photo): void {
  opened.value = photo;
  confirmDelete.value = false;
}

async function change(edit: { date?: string; pose?: PhotoPose | undefined }): Promise<void> {
  const current = opened.value;
  if (!current) return;
  const date = edit.date ?? current.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > todayIso()) return;
  const nextPose = 'pose' in edit ? edit.pose : current.pose;
  await body.changePhoto(current.id, { date, ...(nextPose ? { pose: nextPose } : {}) });
  opened.value = photos.value.find((p) => p.id === current.id);
}

async function remove(): Promise<void> {
  const current = opened.value;
  if (!current) return;
  await body.remove(current.id);
  opened.value = undefined;
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
            <img :src="p.photo" :alt="t('body.photo.alt', { date: shortDate(p.date) })" />
            <figcaption>{{ shortDate(p.date) }}</figcaption>
          </figure>
        </div>
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
            @click="open(item.photo)"
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

      <ion-modal :is-open="opened !== undefined" @did-dismiss="opened = undefined">
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ opened ? shortDate(opened.date) : '' }}</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="opened = undefined">{{ t('common.close') }}</ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content v-if="opened" class="ion-padding">
          <img
            class="full"
            :src="opened.photo"
            :alt="t('body.photo.alt', { date: shortDate(opened.date) })"
          />
          <ion-input
            type="date"
            label-placement="stacked"
            fill="outline"
            :label="t('body.gallery.date')"
            :value="opened.date"
            :max="todayIso()"
            @ion-change="change({ date: String($event.detail.value ?? '') })"
          />
          <p class="pose-title">{{ t('body.gallery.pose') }}</p>
          <div class="poses" role="group" :aria-label="t('body.gallery.pose')">
            <ion-button
              v-for="p in PHOTO_POSES"
              :key="p"
              size="small"
              :fill="opened.pose === p ? 'solid' : 'outline'"
              :aria-pressed="opened.pose === p"
              @click="change({ pose: opened.pose === p ? undefined : p })"
            >
              {{ t(`body.gallery.poses.${p}`) }}
            </ion-button>
          </div>
          <ion-button
            v-if="!confirmDelete"
            expand="block"
            fill="clear"
            color="danger"
            @click="confirmDelete = true"
          >
            {{ t('body.gallery.delete') }}
          </ion-button>
          <ion-button v-else expand="block" color="danger" @click="remove">
            {{ t('body.gallery.deleteConfirm') }}
          </ion-button>
        </ion-content>
      </ion-modal>
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
.full {
  width: 100%;
  margin-block-end: 12px;
  border-radius: 8px;
}
.pose-title {
  margin-block: 16px 6px;
  font-weight: 700;
}
.poses {
  display: flex;
  gap: 6px;
  margin-block-end: 16px;
}
</style>
