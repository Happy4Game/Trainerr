<script setup lang="ts">
import { computed, useId } from 'vue';
import type { PoseShape } from '@/domain/photos';

/**
 * A body outline for a pose, drawn with simple shapes (no photo, no model):
 * over the camera preview as a faint outline to stand in, and small in the
 * pose picker. The frame is 3:4, as the photos.
 */
const props = defineProps<{
  shape: PoseShape;
  /** Over the preview: light fill and a white edge. Otherwise filled with the text color. */
  overlay?: boolean;
}>();

/** One filter per drawing: two drawings on screen must not share an id. */
const filterId = `pose-edge-${useId()}`;

interface Limb {
  readonly from: readonly [number, number];
  readonly to: readonly [number, number];
  readonly width: number;
}
interface Ball {
  readonly at: readonly [number, number];
  readonly rx: number;
  readonly ry?: number;
}

/** The left half of a front-facing body, mirrored for the right half. */
const mirror = (x: number) => 300 - x;
const both = (limbs: Limb[]): Limb[] => [
  ...limbs,
  ...limbs.map((l) => ({
    ...l,
    from: [mirror(l.from[0]), l.from[1]] as const,
    to: [mirror(l.to[0]), l.to[1]] as const,
  })),
];
const bothBalls = (balls: Ball[]): Ball[] => [
  ...balls,
  ...balls.map((b) => ({ ...b, at: [mirror(b.at[0]), b.at[1]] as const })),
];

const FRONT_TORSO =
  'M100 98 C122 90 178 90 200 98 L196 150 C190 180 184 200 186 222 L192 256 L108 256 L114 222 C116 200 110 180 104 150 Z';
const SIDE_TORSO =
  'M132 96 C158 90 176 98 180 120 C183 146 174 168 172 188 C175 212 177 232 174 256 L128 256 C123 230 125 204 130 182 C123 152 121 120 132 96 Z';

const LEGS = both([
  { from: [128, 252], to: [124, 322], width: 40 },
  { from: [124, 322], to: [122, 378], width: 28 },
]);
const WIDE_LEGS = both([
  { from: [126, 252], to: [116, 322], width: 40 },
  { from: [116, 322], to: [112, 378], width: 28 },
]);

const body = computed(() => {
  switch (props.shape) {
    case 'side':
      return {
        torso: SIDE_TORSO,
        head: { at: [154, 52], rx: 23, ry: 29 } as Ball,
        neck: [143, 74, 20, 26] as const,
        limbs: [
          { from: [150, 250], to: [150, 322], width: 44 },
          { from: [150, 322], to: [146, 378], width: 30 },
          { from: [154, 110], to: [150, 190], width: 24 },
          { from: [150, 190], to: [156, 260], width: 20 },
        ] as Limb[],
        balls: [
          { at: [154, 112], rx: 17 },
          { at: [157, 270], rx: 10 },
          { at: [158, 386], rx: 22, ry: 7 },
        ] as Ball[],
      };
    case 'biceps':
      return {
        torso: FRONT_TORSO,
        head: { at: [150, 52], rx: 24, ry: 29 } as Ball,
        neck: [140, 74, 20, 26] as const,
        limbs: [
          ...WIDE_LEGS,
          ...both([
            { from: [100, 110], to: [50, 120], width: 30 },
            { from: [50, 120], to: [56, 54], width: 22 },
          ]),
        ],
        balls: bothBalls([
          { at: [100, 110], rx: 18 },
          { at: [74, 106], rx: 17 },
          { at: [58, 44], rx: 12 },
          { at: [110, 386], rx: 14, ry: 7 },
        ]),
      };
    default:
      return {
        torso: FRONT_TORSO,
        head: { at: [150, 52], rx: 24, ry: 29 } as Ball,
        neck: [140, 74, 20, 26] as const,
        limbs: [
          ...LEGS,
          ...both([
            { from: [98, 112], to: [88, 190], width: 26 },
            { from: [88, 190], to: [84, 260], width: 21 },
          ]),
        ],
        balls: bothBalls([
          { at: [100, 110], rx: 17 },
          { at: [84, 270], rx: 10 },
          { at: [120, 386], rx: 14, ry: 7 },
        ]),
      };
  }
});
</script>

<template>
  <svg
    class="pose-guide"
    :class="{ overlay }"
    viewBox="0 0 300 400"
    preserveAspectRatio="xMidYMid meet"
    aria-hidden="true"
  >
    <defs v-if="overlay">
      <!-- The edge of the whole body: the shapes widened, minus the shapes. -->
      <filter :id="filterId" x="-5%" y="-5%" width="110%" height="110%">
        <feMorphology in="SourceAlpha" operator="dilate" radius="3" result="wide" />
        <feComposite in="wide" in2="SourceAlpha" operator="out" result="edge" />
        <feFlood flood-color="#fff" />
        <feComposite in2="edge" operator="in" result="line" />
        <feFlood flood-color="#fff" flood-opacity="0.12" />
        <feComposite in2="SourceAlpha" operator="in" result="fill" />
        <feMerge>
          <feMergeNode in="fill" />
          <feMergeNode in="line" />
        </feMerge>
      </filter>
    </defs>
    <g
      :filter="overlay ? `url(#${filterId})` : undefined"
      fill="currentColor"
      stroke="currentColor"
    >
      <ellipse
        :cx="body.head.at[0]"
        :cy="body.head.at[1]"
        :rx="body.head.rx"
        :ry="body.head.ry ?? body.head.rx"
        stroke="none"
      />
      <rect
        :x="body.neck[0]"
        :y="body.neck[1]"
        :width="body.neck[2]"
        :height="body.neck[3]"
        stroke="none"
      />
      <path :d="body.torso" stroke="none" />
      <line
        v-for="(l, i) in body.limbs"
        :key="`l${i}`"
        :x1="l.from[0]"
        :y1="l.from[1]"
        :x2="l.to[0]"
        :y2="l.to[1]"
        :stroke-width="l.width"
        stroke-linecap="round"
      />
      <ellipse
        v-for="(b, i) in body.balls"
        :key="`b${i}`"
        :cx="b.at[0]"
        :cy="b.at[1]"
        :rx="b.rx"
        :ry="b.ry ?? b.rx"
        stroke="none"
      />
    </g>
  </svg>
</template>

<style scoped>
.pose-guide {
  display: block;
  width: 100%;
  height: 100%;
}
.overlay {
  filter: drop-shadow(0 0 2px rgb(0 0 0 / 50%));
}
</style>
