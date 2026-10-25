<script setup lang="ts">
import { Pause, Play } from 'lucide-vue-next';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Equipment } from '@/domain/types';
import { MOVEMENTS, type MovementId } from './movements';
import {
  cyclePosition,
  figureFor,
  interpolate,
  SEGMENTS,
  solveTwoBones,
  type Point,
  type Pose,
} from './skeleton';

const props = defineProps<{
  movement: MovementId;
  equipment: Equipment;
  name: string;
  approximate: boolean;
  /** Fixed position between start (0) and end (1), without animation. */
  at?: number;
}>();

const { t } = useI18n();
const movement = computed(() => MOVEMENTS[props.movement]);

const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const still = props.at !== undefined;
const playing = ref(!reducedMotion && !still);
const progress = ref(props.at ?? 0);
let frame = 0;
let started = 0;
let pausedAt = 0;

function tick(now: number): void {
  if (!started) started = now;
  if (playing.value) progress.value = cyclePosition(now - started, movement.value.cycleMs ?? 2800);
  frame = requestAnimationFrame(tick);
}
onMounted(() => {
  if (!reducedMotion && !still) frame = requestAnimationFrame(tick);
});
onBeforeUnmount(() => cancelAnimationFrame(frame));

function toggle(): void {
  playing.value = !playing.value;
  if (!playing.value) pausedAt = performance.now();
  else started += performance.now() - pausedAt;
}

/** Everything to draw for one pose, side or front view. */
function drawing(pose: Pose) {
  const m = movement.value;
  if (m.view === 'side') {
    const f = figureFor(pose);
    return {
      limbs: [
        [f.hip, f.neck],
        [f.shoulder, f.elbow],
        [f.elbow, f.hand],
        [f.hip, f.knee],
        [f.knee, f.ankle],
        [f.ankle, f.toe],
      ] as [Point, Point][],
      head: f.head,
      hands: [f.hand],
      ankle: f.ankle,
      toe: f.toe,
      hip: f.hip,
      shoulder: f.shoulder,
      knee: f.knee,
    };
  }
  // Front view: symmetric figure, the pose gives the right side.
  const cx = pose.hip[0];
  const shoulderY = pose.hip[1] - SEGMENTS.torso;
  const right: Point = [cx + 14, shoulderY];
  const left: Point = [cx - 14, shoulderY];
  const handTarget: Point = pose.handFromShoulder
    ? [right[0] + pose.hand[0], right[1] + pose.hand[1]]
    : pose.hand;
  const mirror = (p: Point): Point => [2 * cx - p[0], p[1]];
  const armR = solveTwoBones(right, handTarget, SEGMENTS.upperArm, SEGMENTS.forearm, pose.elbow);
  const armL = solveTwoBones(
    left,
    mirror(handTarget),
    SEGMENTS.upperArm,
    SEGMENTS.forearm,
    -pose.elbow as 1 | -1,
  );
  const hipR: Point = [cx + 8, pose.hip[1]];
  const hipL: Point = [cx - 8, pose.hip[1]];
  const legR = solveTwoBones(hipR, pose.foot, SEGMENTS.thigh, SEGMENTS.shin, pose.knee);
  const legL = solveTwoBones(
    hipL,
    mirror(pose.foot),
    SEGMENTS.thigh,
    SEGMENTS.shin,
    -pose.knee as 1 | -1,
  );
  const neck: Point = [cx, shoulderY - SEGMENTS.neck];
  return {
    limbs: [
      [left, right],
      [[cx, pose.hip[1]], neck],
      [hipL, hipR],
      [right, armR.joint],
      [armR.joint, armR.end],
      [left, armL.joint],
      [armL.joint, armL.end],
      [hipR, legR.joint],
      [legR.joint, legR.end],
      [hipL, legL.joint],
      [legL.joint, legL.end],
    ] as [Point, Point][],
    head: [cx, neck[1] - SEGMENTS.head] as Point,
    hands: [armR.end, armL.end],
    ankle: legR.end,
    toe: legR.end,
    hip: pose.hip,
    shoulder: right,
    knee: legR.joint,
  };
}

const pose = computed(() => interpolate(movement.value.start, movement.value.end, progress.value));
const current = computed(() => drawing(pose.value));
const stills = computed(() => [drawing(movement.value.start), drawing(movement.value.end)]);
const pulley = computed(() => movement.value.props.find((p) => p.kind === 'pulley'));
const showLoad = computed(() => movement.value.load === 'hand');
const line = (a: Point, b: Point) => ({ x1: a[0], y1: a[1], x2: b[0], y2: b[1] });
</script>

<template>
  <figure class="demo">
    <div class="stage" role="img" :aria-label="t('demo.label', { name })">
      <svg
        v-for="(d, index) in reducedMotion && !still ? stills : [current]"
        :key="index"
        viewBox="0 0 200 170"
        aria-hidden="true"
        focusable="false"
      >
        <!-- Fixed equipment -->
        <template v-for="(prop, i) in movement.props" :key="i">
          <line
            v-if="prop.kind === 'floor'"
            class="ground"
            x1="0"
            :y1="prop.y"
            x2="200"
            :y2="prop.y"
          />
          <g v-else-if="prop.kind === 'bench'" class="equipment">
            <rect :x="prop.x" :y="prop.y" :width="prop.width" height="6" rx="2" />
            <line v-bind="line([prop.x + 10, prop.y + 6], [prop.x + 10, 160])" />
            <line
              v-bind="line([prop.x + prop.width - 10, prop.y + 6], [prop.x + prop.width - 10, 160])"
            />
          </g>
          <g v-else-if="prop.kind === 'seat'" class="equipment">
            <rect :x="prop.x - 16" :y="prop.y" width="32" height="6" rx="2" />
            <line v-bind="line([prop.x, prop.y + 6], [prop.x, 160])" />
            <line
              v-if="prop.back > -80"
              class="backrest"
              v-bind="
                line(
                  [prop.x - 8, prop.y],
                  [
                    prop.x - 8 + Math.sin((prop.back * Math.PI) / 180) * 56,
                    prop.y - Math.cos((prop.back * Math.PI) / 180) * 56,
                  ],
                )
              "
            />
          </g>
          <line
            v-else-if="prop.kind === 'bar'"
            class="equipment thick"
            v-bind="line([prop.x1, prop.y], [prop.x2, prop.y])"
          />
          <circle
            v-else-if="prop.kind === 'pad' && prop.on === 'ankle'"
            class="pad"
            :cx="d.ankle[0]"
            :cy="d.ankle[1]"
            r="6"
          />
          <rect
            v-else-if="prop.kind === 'pad' && prop.on === 'hip'"
            class="pad"
            :x="d.hip[0] - 10"
            :y="d.hip[1] + 2"
            width="20"
            height="10"
            rx="3"
          />
          <line
            v-else-if="prop.kind === 'platform'"
            class="equipment thick"
            v-bind="line([d.toe[0] - 10, d.toe[1] - 16], [d.toe[0] + 8, d.toe[1] + 14])"
          />
        </template>

        <!-- Cable -->
        <template v-if="pulley && pulley.kind === 'pulley'">
          <circle class="equipment" :cx="pulley.at[0]" :cy="pulley.at[1]" r="5" />
          <line class="cable" v-bind="line(pulley.at, d.hands[0]!)" />
        </template>

        <!-- Figure -->
        <line
          v-for="(segment, i) in d.limbs"
          :key="`l${i}`"
          class="body"
          v-bind="line(segment[0], segment[1])"
        />
        <circle class="head" :cx="d.head[0]" :cy="d.head[1]" :r="SEGMENTS.head" />

        <!-- Load in the hands -->
        <template v-if="showLoad">
          <template v-if="equipment === 'barbell'">
            <line
              v-if="d.hands.length > 1"
              class="equipment thick"
              v-bind="
                line([d.hands[1]![0] - 14, d.hands[1]![1]], [d.hands[0]![0] + 14, d.hands[0]![1]])
              "
            />
            <circle
              v-for="(h, i) in d.hands.slice(0, 1)"
              :key="`p${i}`"
              class="plate"
              :cx="h[0]"
              :cy="h[1]"
              r="13"
            />
          </template>
          <template v-else-if="equipment === 'dumbbell'">
            <g v-for="(h, i) in d.hands" :key="`d${i}`" class="dumbbell">
              <rect :x="h[0] - 9" :y="h[1] - 3" width="18" height="6" rx="2" />
              <rect :x="h[0] - 11" :y="h[1] - 6" width="5" height="12" rx="1" />
              <rect :x="h[0] + 6" :y="h[1] - 6" width="5" height="12" rx="1" />
            </g>
          </template>
          <template v-else-if="equipment !== 'bodyweight'">
            <rect
              v-for="(h, i) in d.hands"
              :key="`h${i}`"
              class="handle"
              :x="h[0] - 7"
              :y="h[1] - 2"
              width="14"
              height="4"
              rx="2"
            />
          </template>
        </template>
      </svg>
    </div>
    <button
      v-if="!reducedMotion && !still"
      type="button"
      class="toggle"
      :aria-label="t(playing ? 'demo.pause' : 'demo.play')"
      @click="toggle"
    >
      <Pause v-if="playing" :size="20" aria-hidden="true" />
      <Play v-else :size="20" aria-hidden="true" />
    </button>
    <figcaption>
      {{ t(approximate ? 'demo.approximate' : 'demo.caption') }}
    </figcaption>
  </figure>
</template>

<style scoped>
.demo {
  position: relative;
  margin: 0;
}
.stage {
  display: flex;
  gap: 8px;
  padding: 8px;
  border-radius: 12px;
  background: var(--ion-color-step-50, #f4f5f8);
}
svg {
  flex: 1;
  width: 100%;
  max-height: 280px;
}
.ground {
  stroke: var(--ion-color-medium);
  stroke-width: 2;
}
.equipment rect,
.equipment circle,
rect.pad,
circle.pad {
  fill: var(--ion-color-medium);
}
.equipment line,
.equipment.thick,
line.equipment {
  stroke: var(--ion-color-medium);
  stroke-width: 3;
}
.thick {
  stroke-width: 4;
}
.backrest {
  stroke-width: 6;
  stroke-linecap: round;
}
.cable {
  stroke: var(--ion-color-medium);
  stroke-width: 1.5;
  stroke-dasharray: 3 2;
}
.body {
  stroke: var(--ion-color-primary);
  stroke-width: 7;
  stroke-linecap: round;
}
.head {
  fill: var(--ion-color-primary);
}
.plate {
  fill: var(--ion-color-dark, #222);
  fill-opacity: 0.85;
}
.dumbbell rect,
.handle {
  fill: var(--ion-color-dark, #222);
}
.toggle {
  position: absolute;
  inset-block-start: 8px;
  inset-inline-end: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  background: rgb(0 0 0 / 55%);
  color: #fff;
}
figcaption {
  margin-block-start: 6px;
  font-size: 0.8rem;
  color: var(--ion-color-medium);
}
</style>
