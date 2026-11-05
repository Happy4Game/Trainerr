<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { ChevronLeft, ChevronRight, Columns2, ZoomIn, ZoomOut } from 'lucide-vue-next';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { PHOTO_POSES, type PhotoPose } from '@/domain/photos';
import { useBodyMeasurements, type BodyPhoto } from '@/ui/body/useBodyMeasurements';
import { todayIso } from '@/ui/useWeekPlan';

/**
 * A body photo on the whole screen, from anywhere a photo is shown: swipe or
 * arrows to the previous and next one, a tap to zoom, and its date, pose and
 * deletion below it.
 */
const props = defineProps<{
  /** The photos to browse, in the order shown on the screen that opened it. */
  photos: readonly BodyPhoto[];
  /** Id of the photo shown; none = closed. */
  openedId: string | undefined;
  /** Date, pose and deletion; off in the comparison, where the photos are picked. */
  editable?: boolean;
}>();
const emit = defineEmits<{
  'update:openedId': [id: string | undefined];
  compare: [photo: BodyPhoto];
}>();

const { t, locale } = useI18n();
const body = useBodyMeasurements();

const index = computed(() => props.photos.findIndex((p) => p.id === props.openedId));
const photo = computed(() => props.photos[index.value]);
const zoomed = ref(false);
const confirmDelete = ref(false);
watch(
  () => props.openedId,
  () => {
    zoomed.value = false;
    confirmDelete.value = false;
  },
);

const shortDate = (date: string) =>
  new Intl.DateTimeFormat(locale.value, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));

function go(step: number): void {
  const next = props.photos[index.value + step];
  if (next) emit('update:openedId', next.id);
}
const close = () => emit('update:openedId', undefined);

// A horizontal swipe changes photo, unless zoomed in (the finger then moves the photo).
let touchX: number | undefined;
function onTouchStart(event: TouchEvent): void {
  touchX = event.touches.length === 1 ? event.touches[0]?.clientX : undefined;
}
function onTouchEnd(event: TouchEvent): void {
  const end = event.changedTouches[0]?.clientX;
  if (zoomed.value || touchX === undefined || end === undefined) return;
  const dx = end - touchX;
  if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  touchX = undefined;
}
function onKey(event: KeyboardEvent): void {
  if (event.key === 'ArrowLeft') go(-1);
  if (event.key === 'ArrowRight') go(1);
}

async function change(edit: { date?: string; pose?: PhotoPose | undefined }): Promise<void> {
  const current = photo.value;
  if (!current) return;
  const date = edit.date ?? current.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > todayIso()) return;
  const nextPose = 'pose' in edit ? edit.pose : current.pose;
  await body.changePhoto(current.id, { date, ...(nextPose ? { pose: nextPose } : {}) });
}

async function remove(): Promise<void> {
  const current = photo.value;
  if (!current) return;
  // The next photo takes its place, or the previous one at the end of the list.
  const after = props.photos[index.value + 1] ?? props.photos[index.value - 1];
  await body.remove(current.id);
  emit('update:openedId', after?.id);
}
</script>

<template>
  <ion-modal :is-open="photo !== undefined" class="viewer" @did-dismiss="close">
    <ion-header>
      <ion-toolbar>
        <ion-title>
          {{ photo ? shortDate(photo.date) : '' }}
          <span v-if="photo?.pose" class="pose">· {{ t(`body.gallery.poses.${photo.pose}`) }}</span>
        </ion-title>
        <ion-buttons slot="end">
          <ion-button @click="close">{{ t('common.close') }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content v-if="photo" class="content" @keydown="onKey">
      <div
        class="stage"
        :class="{ zoomed }"
        @touchstart.passive="onTouchStart"
        @touchend.passive="onTouchEnd"
      >
        <img
          :src="photo.photo"
          :alt="t('body.photo.alt', { date: shortDate(photo.date) })"
          @dblclick="zoomed = !zoomed"
        />
      </div>
      <div class="bar">
        <ion-button
          fill="clear"
          :disabled="index <= 0"
          :aria-label="t('body.viewer.previous')"
          @click="go(-1)"
        >
          <ChevronLeft :size="28" aria-hidden="true" />
        </ion-button>
        <span class="count" aria-live="polite">
          {{ t('body.viewer.position', { n: index + 1, total: photos.length }) }}
        </span>
        <ion-button
          fill="clear"
          :aria-label="zoomed ? t('body.viewer.zoomOut') : t('body.viewer.zoomIn')"
          :aria-pressed="zoomed"
          @click="zoomed = !zoomed"
        >
          <component :is="zoomed ? ZoomOut : ZoomIn" :size="24" aria-hidden="true" />
        </ion-button>
        <ion-button
          fill="clear"
          :disabled="index >= photos.length - 1"
          :aria-label="t('body.viewer.next')"
          @click="go(1)"
        >
          <ChevronRight :size="28" aria-hidden="true" />
        </ion-button>
      </div>

      <div class="details ion-padding">
        <ion-button expand="block" @click="emit('compare', photo)">
          <Columns2 :size="20" aria-hidden="true" class="icon" />
          {{ t('body.viewer.compare') }}
        </ion-button>
        <template v-if="editable">
          <ion-input
            type="date"
            label-placement="stacked"
            fill="outline"
            :label="t('body.gallery.date')"
            :value="photo.date"
            :max="todayIso()"
            @ion-change="change({ date: String($event.detail.value ?? '') })"
          />
          <p class="pose-title">{{ t('body.gallery.pose') }}</p>
          <div class="poses" role="group" :aria-label="t('body.gallery.pose')">
            <ion-button
              v-for="p in PHOTO_POSES"
              :key="p"
              size="small"
              :fill="photo.pose === p ? 'solid' : 'outline'"
              :aria-pressed="photo.pose === p"
              @click="change({ pose: photo.pose === p ? undefined : p })"
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
        </template>
      </div>
    </ion-content>
  </ion-modal>
</template>

<style scoped>
.pose {
  font-weight: 400;
  color: var(--tr-text-muted);
}
.stage {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 62vh;
  overflow: auto;
  background: #000;
  touch-action: pan-y;
}
.stage img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  cursor: zoom-in;
}
/* Zoomed in: twice as big, moved with the finger. */
.stage.zoomed {
  display: block;
  touch-action: auto;
}
.stage.zoomed img {
  width: 200%;
  max-width: none;
  max-height: none;
  cursor: zoom-out;
}
.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-inline: 4px;
}
.count {
  flex: 1;
  text-align: center;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.details {
  padding-block-start: 0;
}
.icon {
  margin-inline-end: 8px;
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
