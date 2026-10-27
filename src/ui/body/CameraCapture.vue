<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';
import { Layers, SwitchCamera, Timer } from 'lucide-vue-next';
import { computed, onBeforeUnmount, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { PHOTO_POSES, type PhotoPose } from '@/domain/photos';
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
 * Body photo taken inside the app: the pose chosen above the camera preview,
 * the front or back camera, a self-timer, and the last photo of the same pose
 * shown faintly over the preview to stand at the same place.
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
const cameras = ref(1);
const problem = ref<CameraProblem>();
const ready = ref(false);
const countdown = ref(0);
const shot = ref<string>();
const video = ref<HTMLVideoElement>();
let stream: MediaStream | undefined;
let ticking: ReturnType<typeof setInterval> | undefined;

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
    ready.value = true;
    cameras.value = await cameraCount();
  } catch (error) {
    problem.value = cameraProblem(error);
  }
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
      <ion-segment
        :value="pose"
        :aria-label="t('body.gallery.pose')"
        @ion-change="pose = ($event.detail.value as PhotoPose) ?? 'front'"
      >
        <ion-segment-button v-for="p in PHOTO_POSES" :key="p" :value="p">
          {{ t(`body.gallery.poses.${p}`) }}
        </ion-segment-button>
      </ion-segment>
      <p class="hint">{{ t(`body.camera.howTo.${pose}`) }}</p>

      <div class="frame">
        <video
          ref="video"
          :class="{ mirrored: facing === 'user' }"
          playsinline
          muted
          :aria-label="t('body.camera.live')"
        />
        <img v-if="ghost && ready && !shot" class="ghost" :src="ghost" alt="" />
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
      <label v-if="!shot && lastOfPose[pose]" class="overlay">
        <input v-model="overlay" type="checkbox" />
        <Layers :size="18" aria-hidden="true" />
        {{ t('body.camera.overlay') }}
      </label>
    </ion-content>
  </ion-modal>
</template>

<style scoped>
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
  background: #000;
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
.mirrored {
  transform: scaleX(-1);
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
.overlay {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  margin-block-start: 8px;
}
</style>
