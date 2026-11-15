<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { Camera, Layers, PersonStanding, SwitchCamera, Timer } from 'lucide-vue-next';
import { computed, onBeforeUnmount, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { PHOTO_POSES, POSE_SHAPE, type PhotoPose } from '@/domain/photos';
import PoseGuide from '@/ui/body/PoseGuide.vue';
import {
  cameraCount,
  cameraProblem,
  cameraSupported,
  coverArea,
  nextTimer,
  openCamera,
  stopCamera,
  type CameraProblem,
  type Facing,
  type TimerStep,
} from '@/ui/camera';
import { readPhoto, shrinkToJpeg } from '@/ui/photo';

/**
 * Body photo taken inside the app: the pose chosen above the camera preview
 * (each with a small drawing and how to hold it), the front or back camera, a
 * self-timer, the outline of the pose over the preview, and the last photo of
 * the same pose shown faintly to stand at the same place.
 *
 * While the camera starts (Android may first ask for the permission), the
 * frame shows the pose's outline and "Opening the camera…" instead of a black
 * box. The video stays hidden until its first image plays: without a `poster`,
 * Android's WebView paints its own grey placeholder with a play icon
 * (WebChromeClient.getDefaultVideoPoster), so the video gets an empty one.
 */
const props = defineProps<{
  open: boolean;
  /** Pose chosen at first; changed above the preview. */
  startPose?: PhotoPose | undefined;
  /** Last photo of each pose, for the overlay. */
  lastOfPose: Partial<Record<PhotoPose, string>>;
}>();
const emit = defineEmits<{ take: [photo: string, pose: PhotoPose]; close: [] }>();

const { t } = useI18n();

const pose = ref<PhotoPose>('front');
const facing = ref<Facing>('user');
const timer = ref<TimerStep>(0);
const overlay = ref(true);
const outline = ref(true);
const cameras = ref(1);
const problem = ref<CameraProblem>();
const ready = ref(false);
const countdown = ref(0);
const shot = ref<string>();
const video = ref<HTMLVideoElement>();
let stream: MediaStream | undefined;
let ticking: ReturnType<typeof setInterval> | undefined;

/** Transparent 1 × 1 GIF: no grey placeholder from the WebView before the first image. */
const EMPTY_POSTER = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

const ghost = computed(() => (overlay.value ? props.lastOfPose[pose.value] : undefined));

async function start(): Promise<void> {
  stop();
  problem.value = undefined;
  if (!cameraSupported()) {
    problem.value = 'unsupported';
    return;
  }
  try {
    stream = await openCamera(facing.value);
    if (!props.open) return stop();
    if (video.value) {
      video.value.srcObject = stream;
      await video.value.play().catch(() => undefined);
    }
    cameras.value = await cameraCount();
  } catch (error) {
    problem.value = cameraProblem(error);
  }
}

/** First image on screen: the loading frame fades out. */
function playing(): void {
  if (stream) ready.value = true;
}

function stop(): void {
  if (ticking) clearInterval(ticking);
  ticking = undefined;
  countdown.value = 0;
  stopCamera(stream);
  stream = undefined;
  ready.value = false;
}

/** Set before the modal shows, so that a pose tapped at once is kept. */
function opening(): void {
  pose.value = props.startPose ?? 'front';
  shot.value = undefined;
}

function close(): void {
  stop();
  emit('close');
}

async function flip(): Promise<void> {
  facing.value = facing.value === 'user' ? 'environment' : 'user';
  await start();
}

/** The frame as seen on screen, without the mirror effect of the preview. */
function capture(): void {
  const v = video.value;
  if (!v || !v.videoWidth) return;
  shot.value = shrinkToJpeg(v, coverArea(v.videoWidth, v.videoHeight));
}

function shoot(): void {
  if (countdown.value > 0) return;
  if (timer.value === 0) return capture();
  countdown.value = timer.value;
  ticking = setInterval(() => {
    countdown.value -= 1;
    if (countdown.value > 0) return;
    clearInterval(ticking);
    ticking = undefined;
    capture();
  }, 1000);
}

function keep(): void {
  if (!shot.value) return;
  emit('take', shot.value, pose.value);
  close();
}

/** No camera here (or refused): the phone's camera app, through the file input. */
async function fromFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (file) shot.value = await readPhoto(file);
}

onBeforeUnmount(stop);
</script>

<template>
  <ion-modal
    :is-open="open"
    class="camera"
    @will-present="opening"
    @did-present="start"
    @did-dismiss="close"
  >
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ t('body.camera.title') }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="close">{{ t('common.close') }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div class="poses" role="group" :aria-label="t('body.gallery.pose')">
        <button
          v-for="p in PHOTO_POSES"
          :key="p"
          type="button"
          class="pose"
          :class="{ chosen: p === pose }"
          :aria-pressed="p === pose"
          @click="pose = p"
        >
          <span class="pose-drawing">
            <PoseGuide :shape="POSE_SHAPE[p]" />
          </span>
          {{ t(`body.gallery.poses.${p}`) }}
        </button>
      </div>
      <p class="hint">{{ t(`body.camera.howTo.${pose}`) }}</p>

      <div class="frame">
        <video
          ref="video"
          :class="{ mirrored: facing === 'user', live: ready }"
          playsinline
          muted
          :poster="EMPTY_POSTER"
          :aria-label="t('body.camera.live')"
          @playing="playing"
        />
        <img v-if="ghost && ready && !shot" class="ghost" :src="ghost" alt="" />
        <div v-if="outline && !shot && !problem" class="outline" :class="{ waiting: !ready }">
          <PoseGuide :shape="POSE_SHAPE[pose]" overlay />
        </div>
        <Transition name="fade">
          <div v-if="!ready && !problem && !shot" class="loading" role="status">
            <span class="loading-icon"><Camera :size="28" aria-hidden="true" /></span>
            <p class="loading-title">{{ t('body.camera.opening') }}</p>
            <p class="loading-sub">{{ t('body.camera.openingHint') }}</p>
          </div>
        </Transition>
        <span v-if="countdown > 0" class="countdown" role="timer" aria-live="assertive">
          {{ countdown }}
        </span>
        <div v-if="problem && !shot" class="problem" role="alert">
          <p>{{ t(`body.camera.problems.${problem}`) }}</p>
          <label class="file-button">
            {{ t('body.camera.useCameraApp') }}
            <input type="file" accept="image/*" capture="user" @change="fromFile" />
          </label>
        </div>
        <img v-if="shot" class="shot" :src="shot" :alt="t('body.camera.preview')" />
      </div>

      <div v-if="shot" class="actions">
        <ion-button fill="outline" @click="shot = undefined">{{
          t('body.camera.retake')
        }}</ion-button>
        <ion-button @click="keep">{{ t('body.camera.keep') }}</ion-button>
      </div>
      <div v-else class="controls">
        <button
          type="button"
          class="round"
          :disabled="cameras < 2 || !ready"
          :aria-label="t(facing === 'user' ? 'body.camera.toBack' : 'body.camera.toFront')"
          @click="flip"
        >
          <SwitchCamera :size="24" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="shutter"
          :disabled="!ready || countdown > 0"
          :aria-label="t('body.camera.shoot')"
          @click="shoot"
        />
        <button
          type="button"
          class="round"
          :aria-label="t('body.camera.timer', { seconds: timer })"
          @click="timer = nextTimer(timer)"
        >
          <Timer :size="20" aria-hidden="true" />
          <span class="timer">{{ timer > 0 ? `${timer} s` : t('body.camera.timerOff') }}</span>
        </button>
      </div>
      <div v-if="!shot" class="toggles">
        <label class="toggle">
          <input v-model="outline" type="checkbox" />
          <PersonStanding :size="18" aria-hidden="true" />
          {{ t('body.camera.outline') }}
        </label>
        <label v-if="lastOfPose[pose]" class="toggle">
          <input v-model="overlay" type="checkbox" />
          <Layers :size="18" aria-hidden="true" />
          {{ t('body.camera.overlay') }}
        </label>
      </div>
    </ion-content>
  </ion-modal>
</template>

<style scoped>
.poses {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  margin-inline: -16px;
  padding: 2px 16px 4px;
  scrollbar-width: none;
}
.pose {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 72px;
  padding: 8px 10px;
  border: 2px solid transparent;
  border-radius: var(--tr-radius-m);
  background: var(--tr-surface-2);
  color: var(--tr-text-muted);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 600;
}
.pose.chosen {
  border-color: var(--ion-color-primary);
  color: var(--ion-text-color);
}
.pose-drawing {
  width: 36px;
  height: 48px;
}
.pose.chosen .pose-drawing {
  color: var(--ion-color-primary);
}
.hint {
  margin-block: 8px;
  color: var(--tr-text-muted);
  font-size: 0.85rem;
  text-align: center;
}
.frame {
  position: relative;
  overflow: hidden;
  width: min(100%, 60vh);
  margin-inline: auto;
  aspect-ratio: 3 / 4;
  border-radius: var(--tr-radius-m);
  background: radial-gradient(circle at 50% 35%, #2a3340, #0d1117 75%);
}
.frame video,
.frame .shot,
.frame .ghost {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.frame video {
  opacity: 0;
  transition: opacity 0.3s ease;
}
.frame video.live {
  opacity: 1;
}
.mirrored {
  transform: scaleX(-1);
}
.outline {
  position: absolute;
  inset: 6% 8% 3%;
  pointer-events: none;
  transition: opacity 0.3s ease;
}
.outline.waiting {
  opacity: 0.45;
}
.loading {
  position: absolute;
  inset: auto 0 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 48px 16px 20px;
  background: linear-gradient(transparent, rgb(0 0 0 / 70%));
  color: #fff;
  text-align: center;
}
.loading-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  margin-block-end: 6px;
  border-radius: 50%;
  background: rgb(255 255 255 / 12%);
  animation: pulse 1.4s ease-in-out infinite;
}
.loading-title {
  margin: 0;
  font-weight: 700;
}
.loading-sub {
  margin: 0;
  font-size: 0.8rem;
  opacity: 0.8;
}
@keyframes pulse {
  50% {
    transform: scale(1.08);
    background: rgb(255 255 255 / 22%);
  }
}
@media (prefers-reduced-motion: reduce) {
  .loading-icon {
    animation: none;
  }
}
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-leave-to {
  opacity: 0;
}
.ghost {
  opacity: 0.35;
  pointer-events: none;
}
.countdown {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 6rem;
  font-weight: 800;
  text-shadow: 0 2px 12px rgb(0 0 0 / 60%);
}
.problem {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  color: #fff;
  text-align: center;
}
.file-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-height: 48px;
  padding-inline: 16px;
  border-radius: var(--tr-radius-pill);
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  font-weight: 700;
}
.file-button input {
  position: absolute;
  inset: 0;
  opacity: 0;
}
.controls {
  display: flex;
  align-items: center;
  justify-content: space-around;
  margin-block-start: 16px;
}
.round {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border: 0;
  border-radius: 50%;
  background: var(--tr-surface-2);
  color: inherit;
}
.round:disabled {
  opacity: 0.4;
}
.timer {
  font-size: 0.7rem;
  font-weight: 700;
}
.shutter {
  width: 76px;
  height: 76px;
  border: 5px solid var(--ion-color-primary);
  border-radius: 50%;
  background: #fff;
}
.shutter:disabled {
  opacity: 0.5;
}
.actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-block-start: 16px;
}
.toggles {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  column-gap: 16px;
  margin-block-start: 8px;
}
.toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
}
</style>
