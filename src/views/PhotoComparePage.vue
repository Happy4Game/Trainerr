<script setup lang="ts">
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { ArrowLeftRight, Maximize2 } from 'lucide-vue-next';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { addDays } from '@/domain/dates';
import {
  closestPhoto,
  PHOTO_POSES,
  photoComparison,
  photosOfPose,
  weightAround,
  type PhotoPose,
} from '@/domain/photos';
import PhotoViewer from '@/ui/body/PhotoViewer.vue';
import { useBodyMeasurements, type BodyPhoto } from '@/ui/body/useBodyMeasurements';
import { useSession } from '@/ui/session/useSession';
import { useUnits } from '@/ui/useUnits';

/**
 * Two body photos face to face: picked freely or in one tap ("a month ago"),
 * side by side, with a slider over them or one fading into the other, with
 * the weeks, the sessions and the weight change between them.
 */
type Mode = 'side' | 'slider' | 'fade';

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const session = useSession();
const { load } = useUnits();
const body = useBodyMeasurements();
onMounted(body.reload);

const query = (name: string) => (typeof route.query[name] === 'string' ? route.query[name] : '');
const isPose = (value: string): value is PhotoPose => PHOTO_POSES.includes(value as PhotoPose);

const photos = body.photos;
const newest = computed(() => photos.value.at(-1));
const pose = ref<PhotoPose | 'all'>('all');
const beforeId = ref('');
const afterId = ref('');
const mode = ref<Mode>('side');
const split = ref(50);
const viewed = ref<string>();

/** Photos of the pose, oldest first. Untagged ones fit any pose. */
const shown = computed(() =>
  photosOfPose(photos.value, pose.value === 'all' ? undefined : pose.value),
);
const byId = (id: string) => photos.value.find((p) => p.id === id);
const pair = computed(() => {
  const a = byId(beforeId.value);
  const b = byId(afterId.value);
  if (!a || !b) return undefined;
  // Picked the other way round: the older one is still "before".
  return a.date <= b.date ? { before: a, after: b } : { before: b, after: a };
});
const between = computed(() =>
  pair.value
    ? photoComparison([pair.value.before, pair.value.after], sessionDates.value)
    : undefined,
);
const sessionDates = computed(() => session.history.value.map((s) => s.date));

/** First and last photo of the pose: the default comparison. */
function reset(): void {
  const list = shown.value;
  beforeId.value = list[0]?.id ?? '';
  afterId.value = list.at(-1)?.id ?? '';
}

// From a link: the photo asked, its pose, and the first photo of that pose before it.
let started = false;
watch(
  photos,
  (list) => {
    if (started || list.length === 0) return;
    started = true;
    const asked = byId(query('after')) ?? byId(query('before'));
    const askedPose = query('pose');
    pose.value = isPose(askedPose) ? askedPose : (asked?.pose ?? newest.value?.pose ?? 'all');
    reset();
    if (byId(query('before'))) beforeId.value = query('before');
    if (byId(query('after'))) afterId.value = query('after');
  },
  { immediate: true },
);

function changePose(value: PhotoPose | 'all'): void {
  pose.value = value;
  reset();
}

/** "1 month ago": the photo nearest to that day before the "after" one. */
const SHORTCUTS = [1, 3, 6] as const;
function shortcut(months: number): BodyPhoto | undefined {
  const after = pair.value?.after;
  if (!after) return undefined;
  const older = shown.value.filter((p) => p.date < after.date);
  return closestPhoto(older, addDays(after.date, -30 * months));
}
function pickFirst(): void {
  beforeId.value = shown.value[0]?.id ?? '';
}

function swap(): void {
  [beforeId.value, afterId.value] = [afterId.value, beforeId.value];
}

const weightOf = (photo: BodyPhoto) => weightAround(body.measurements.value, photo.date);
const weightChange = computed(() => {
  if (!pair.value) return undefined;
  const before = weightOf(pair.value.before);
  const after = weightOf(pair.value.after);
  return before !== undefined && after !== undefined ? { before, after } : undefined;
});
const signed = (kg: number) => {
  const rounded = Math.round(kg * 10) / 10;
  return rounded > 0 ? `+${load(rounded)}` : rounded < 0 ? `−${load(-rounded)}` : load(0);
};

const shortDate = (date: string) =>
  new Intl.DateTimeFormat(locale.value, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));

/** Asked from the full-screen photo: that one becomes "after". */
function compareWith(photo: BodyPhoto): void {
  viewed.value = undefined;
  afterId.value = photo.id;
  if (beforeId.value === photo.id) pickFirst();
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/history/photos" :text="t('common.back')" />
        </ion-buttons>
        <ion-title>{{ t('body.compare.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p v-if="photos.length < 2" class="empty">{{ t('body.compare.needTwo') }}</p>
      <template v-else>
        <ion-segment
          :value="pose"
          :aria-label="t('body.gallery.pose')"
          @ion-change="changePose($event.detail.value as PhotoPose | 'all')"
        >
          <ion-segment-button v-for="p in PHOTO_POSES" :key="p" :value="p">
            {{ t(`body.gallery.poses.${p}`) }}
          </ion-segment-button>
          <ion-segment-button value="all">{{ t('body.gallery.poses.all') }}</ion-segment-button>
        </ion-segment>
        <p v-if="pose === 'all'" class="hint">{{ t('body.compare.allPoses') }}</p>

        <p v-if="shown.length < 2" class="empty">{{ t('body.compare.needTwoPose') }}</p>
        <template v-else-if="pair">
          <ion-segment
            class="modes"
            :value="mode"
            :aria-label="t('body.compare.mode')"
            @ion-change="mode = $event.detail.value as Mode"
          >
            <ion-segment-button value="side">{{ t('body.compare.modes.side') }}</ion-segment-button>
            <ion-segment-button value="slider">
              {{ t('body.compare.modes.slider') }}
            </ion-segment-button>
            <ion-segment-button value="fade">{{ t('body.compare.modes.fade') }}</ion-segment-button>
          </ion-segment>

          <div v-if="mode === 'side'" class="side">
            <figure v-for="(p, i) in [pair.before, pair.after]" :key="p.id">
              <button
                type="button"
                class="photo-button"
                :aria-label="t('body.gallery.openNamed', { date: shortDate(p.date) })"
                @click="viewed = p.id"
              >
                <img :src="p.photo" :alt="t('body.photo.alt', { date: shortDate(p.date) })" />
              </button>
              <figcaption>
                <strong>{{ i === 0 ? t('body.compare.before') : t('body.compare.after') }}</strong>
                {{ shortDate(p.date) }}
                <span v-if="weightOf(p) !== undefined" class="weight">{{
                  load(weightOf(p)!)
                }}</span>
              </figcaption>
            </figure>
          </div>

          <div v-else class="overlay-wrap">
            <div class="overlay" :aria-label="t('body.compare.modes.' + mode)" role="img">
              <img :src="pair.after.photo" alt="" />
              <img
                class="top"
                :src="pair.before.photo"
                alt=""
                :style="
                  mode === 'slider'
                    ? { clipPath: `inset(0 ${100 - split}% 0 0)` }
                    : { opacity: (100 - split) / 100 }
                "
              />
              <span v-if="mode === 'slider'" class="line" :style="{ left: `${split}%` }" />
              <span class="tag left">{{ shortDate(pair.before.date) }}</span>
              <span class="tag right">{{ shortDate(pair.after.date) }}</span>
            </div>
            <input
              v-model.number="split"
              type="range"
              min="0"
              max="100"
              :aria-label="
                mode === 'slider' ? t('body.compare.sliderLabel') : t('body.compare.fadeLabel')
              "
            />
            <div class="open-both">
              <button type="button" class="link" @click="viewed = pair.before.id">
                <Maximize2 :size="16" aria-hidden="true" /> {{ t('body.compare.before') }}
              </button>
              <button type="button" class="link" @click="viewed = pair.after.id">
                <Maximize2 :size="16" aria-hidden="true" /> {{ t('body.compare.after') }}
              </button>
            </div>
          </div>

          <section class="facts" :aria-label="t('body.compare.facts')">
            <p v-if="between">
              {{
                t('body.gallery.between', {
                  weeks: t('body.gallery.weeks', between.weeks),
                  sessions: t('body.gallery.sessions', between.sessions),
                })
              }}
            </p>
            <p v-if="weightChange">
              {{
                t('body.compare.weight', {
                  before: load(weightChange.before),
                  after: load(weightChange.after),
                  change: signed(weightChange.after - weightChange.before),
                })
              }}
            </p>
            <p v-else class="hint">{{ t('body.compare.noWeight') }}</p>
          </section>

          <div class="shortcuts" role="group" :aria-label="t('body.compare.shortcuts')">
            <button type="button" class="chip" @click="pickFirst">
              {{ t('body.compare.first') }}
            </button>
            <button
              v-for="m in SHORTCUTS"
              :key="m"
              type="button"
              class="chip"
              :disabled="!shortcut(m)"
              :aria-pressed="shortcut(m)?.id === pair.before.id"
              @click="beforeId = shortcut(m)?.id ?? beforeId"
            >
              {{ t('body.compare.monthsAgo', m) }}
            </button>
            <button type="button" class="chip" @click="swap">
              <ArrowLeftRight :size="16" aria-hidden="true" /> {{ t('body.compare.swap') }}
            </button>
          </div>

          <section
            v-for="side in ['before', 'after'] as const"
            :key="side"
            class="picker"
            :aria-label="t(`body.compare.pick.${side}`)"
          >
            <h2>{{ t(`body.compare.pick.${side}`) }}</h2>
            <div class="strip">
              <button
                v-for="p in shown"
                :key="p.id"
                type="button"
                class="pick"
                :class="{ selected: (side === 'before' ? beforeId : afterId) === p.id }"
                :aria-pressed="(side === 'before' ? beforeId : afterId) === p.id"
                :aria-label="t(`body.compare.pickNamed.${side}`, { date: shortDate(p.date) })"
                @click="side === 'before' ? (beforeId = p.id) : (afterId = p.id)"
              >
                <img :src="p.photo" alt="" />
                <span>{{ shortDate(p.date) }}</span>
              </button>
            </div>
          </section>
        </template>
      </template>

      <PhotoViewer v-model:opened-id="viewed" :photos="shown" @compare="compareWith" />
      <p class="back-link">
        <button type="button" class="link" @click="router.push('/tabs/history/photos')">
          {{ t('body.compare.toGallery') }}
        </button>
      </p>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.empty,
.hint {
  color: var(--tr-text-muted);
  font-size: 0.9rem;
}
.modes {
  margin-block: 12px;
}
.side {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.side figure {
  margin: 0;
}
.side figcaption {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.85rem;
}
.weight {
  color: var(--tr-text-muted);
}
.photo-button {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
}
.photo-button img,
.overlay img {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 4;
  border-radius: 8px;
  object-fit: cover;
  background: #000;
}
.overlay {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
}
.overlay .top {
  position: absolute;
  inset: 0;
}
.line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  margin-inline-start: -1px;
  background: #fff;
  box-shadow: 0 0 4px rgb(0 0 0 / 60%);
}
.tag {
  position: absolute;
  bottom: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgb(0 0 0 / 55%);
  color: #fff;
  font-size: 0.8rem;
}
.tag.left {
  left: 8px;
}
.tag.right {
  right: 8px;
}
.overlay-wrap input[type='range'] {
  width: 100%;
  min-height: 44px;
  accent-color: var(--ion-color-primary);
}
.open-both {
  display: flex;
  justify-content: space-between;
}
.link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--ion-color-primary);
  font: inherit;
  font-weight: 700;
}
.facts {
  margin-block: 12px;
  padding: 10px 12px;
  border-radius: var(--tr-radius-m);
  background: var(--tr-surface-2);
}
.facts p {
  margin: 0;
}
.facts p + p {
  margin-block-start: 4px;
}
.shortcuts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid var(--ion-color-primary);
  border-radius: 999px;
  background: transparent;
  color: var(--ion-color-primary);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 700;
}
.chip[aria-pressed='true'] {
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
}
.chip:disabled {
  opacity: 0.4;
}
.picker h2 {
  margin: 16px 0 6px;
  font-size: 1rem;
}
.strip {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-block-end: 4px;
}
.pick {
  display: flex;
  flex: none;
  flex-direction: column;
  width: 76px;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  font-size: 0.72rem;
}
.pick img {
  width: 100%;
  aspect-ratio: 3 / 4;
  border: 3px solid transparent;
  border-radius: 8px;
  object-fit: cover;
}
.pick.selected img {
  border-color: var(--ion-color-primary);
}
.pick.selected span {
  font-weight: 800;
}
.back-link {
  margin-block-start: 20px;
  text-align: center;
}
</style>
