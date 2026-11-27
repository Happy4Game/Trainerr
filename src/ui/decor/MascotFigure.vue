<script setup lang="ts">
import type { MascotPose } from './mascotLines';

/**
 * The Trainerr mascot, drawn in SVG (drawn by an AI, see the Credits).
 * Poses:
 * - trophy: arms up holding a trophy (session over, record);
 * - wave: one arm waving hello (tips, encouragements);
 * - flex: both biceps, flexing (first set, halfway);
 * - cheer: arms up in a V, jumping for joy;
 * - lift: a dumbbell pressed above the head;
 * - sleep: arms down, eyes shut, "z" floating up (rest day).
 * `walking` swings the legs (when it crosses the screen).
 * Colours follow the theme: the shirt takes the accent colour.
 */
withDefaults(defineProps<{ pose?: MascotPose; walking?: boolean }>(), {
  pose: 'trophy',
  walking: false,
});
</script>

<template>
  <svg class="figure" :class="[pose, { walking }]" viewBox="0 0 100 140" aria-hidden="true">
    <g class="whole">
      <!-- Legs first: the shorts cover their top. -->
      <g class="leg leg-left">
        <rect x="40" y="96" width="8" height="28" rx="4" class="skin" />
        <ellipse cx="43" cy="127" rx="7" ry="4" class="shoe" />
      </g>
      <g class="leg leg-right">
        <rect x="52" y="96" width="8" height="28" rx="4" class="skin" />
        <ellipse cx="57" cy="127" rx="7" ry="4" class="shoe" />
      </g>

      <!-- Arms, behind the shirt: their top is hidden by the shoulders. -->
      <template v-if="pose === 'trophy'">
        <path d="M39 68 L38 38" class="arm" />
        <path d="M61 68 L62 38" class="arm" />
        <g class="held trophy-cup">
          <path d="M33 8 Q24 8 26 17 Q28 23 36 22" class="handle" />
          <path d="M67 8 Q76 8 74 17 Q72 23 64 22" class="handle" />
          <path d="M34 4 H66 V13 Q66 29 50 29 Q34 29 34 13 Z" class="gold" />
          <path
            d="M50 9 L52 14 L57 14 L53 17 L55 22 L50 19 L45 22 L47 17 L43 14 L48 14 Z"
            class="star"
          />
          <rect x="47" y="29" width="6" height="6" class="gold" />
          <rect x="41" y="34" width="18" height="5" rx="2" class="base" />
        </g>
        <circle cx="38" cy="38" r="4.5" class="skin" />
        <circle cx="62" cy="38" r="4.5" class="skin" />
      </template>

      <template v-else-if="pose === 'lift'">
        <g class="press">
          <path d="M39 68 L36 36" class="arm" />
          <path d="M61 68 L64 36" class="arm" />
          <rect x="18" y="31" width="64" height="4" rx="2" class="bar" />
          <rect x="16" y="23" width="7" height="20" rx="2" class="plate" />
          <rect x="77" y="23" width="7" height="20" rx="2" class="plate" />
          <circle cx="36" cy="34" r="4.5" class="skin" />
          <circle cx="64" cy="34" r="4.5" class="skin" />
        </g>
      </template>

      <template v-else-if="pose === 'flex'">
        <g class="biceps biceps-left">
          <path d="M39 70 L25 68 L23 52" class="arm" />
          <circle cx="28" cy="64" r="5" class="muscle" />
          <circle cx="23" cy="50" r="5" class="skin" />
        </g>
        <g class="biceps biceps-right">
          <path d="M61 70 L75 68 L77 52" class="arm" />
          <circle cx="72" cy="64" r="5" class="muscle" />
          <circle cx="77" cy="50" r="5" class="skin" />
        </g>
      </template>

      <template v-else-if="pose === 'cheer'">
        <path d="M39 70 L27 44" class="arm" />
        <path d="M61 70 L73 44" class="arm" />
        <circle cx="26" cy="42" r="4.5" class="skin" />
        <circle cx="74" cy="42" r="4.5" class="skin" />
        <path d="M18 30 L14 24 M24 26 L24 19 M82 30 L86 24 M76 26 L76 19" class="spark" />
      </template>

      <template v-else-if="pose === 'sleep'">
        <path d="M39 70 L35 92" class="arm" />
        <path d="M61 70 L65 92" class="arm" />
        <circle cx="35" cy="93" r="4.5" class="skin" />
        <circle cx="65" cy="93" r="4.5" class="skin" />
        <text x="66" y="34" class="zed zed-1">z</text>
        <text x="74" y="22" class="zed zed-2">z</text>
        <text x="82" y="10" class="zed zed-3">Z</text>
      </template>

      <template v-else>
        <!-- wave: one arm down, the other waving hello. -->
        <path d="M39 70 L32 92" class="arm" />
        <circle cx="32" cy="93" r="4.5" class="skin" />
        <g class="waving">
          <path d="M61 70 L75 50" class="arm" />
          <circle cx="76" cy="48" r="4.5" class="skin" />
        </g>
      </template>

      <!-- Body: shirt in the accent colour, dark shorts. -->
      <rect x="35" y="64" width="30" height="34" rx="12" class="shirt" />
      <rect x="36" y="90" width="28" height="12" rx="4" class="shorts" />
      <!-- Head, with a sports headband. -->
      <g class="head">
        <circle cx="50" cy="50" r="15" class="skin" />
        <path d="M35.5 45 Q50 38 64.5 45 L64.8 49 Q50 42 35.2 49 Z" class="band" />
        <template v-if="pose === 'sleep'">
          <path d="M42 51.5 Q44.5 53.5 47 51.5 M53 51.5 Q55.5 53.5 58 51.5" class="line" />
          <circle cx="50" cy="58" r="1.8" class="eye" />
        </template>
        <template v-else>
          <circle cx="44.5" cy="51" r="2.2" class="eye" />
          <circle cx="55.5" cy="51" r="2.2" class="eye" />
          <path
            v-if="pose === 'cheer' || pose === 'trophy'"
            d="M45 56 Q50 63 55 56 Z"
            class="mouth"
          />
          <path v-else d="M45 56.5 Q50 61.5 55 56.5" class="line" />
        </template>
        <circle cx="41" cy="56" r="2.5" class="blush" />
        <circle cx="59" cy="56" r="2.5" class="blush" />
      </g>
    </g>
  </svg>
</template>

<style scoped>
.figure {
  overflow: visible;
}
.skin {
  fill: #f6c89f;
}
.shoe,
.shorts,
.eye,
.mouth {
  fill: #1f2937;
}
.shirt,
.band,
.muscle {
  fill: var(--ion-color-primary);
}
.arm {
  fill: none;
  stroke: var(--ion-color-primary);
  stroke-width: 8;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.blush {
  fill: #f87171;
  opacity: 0.45;
}
.line {
  fill: none;
  stroke: #1f2937;
  stroke-width: 2;
  stroke-linecap: round;
}
.gold {
  fill: #facc15;
  stroke: #b45309;
  stroke-width: 1.5;
}
.handle {
  fill: none;
  stroke: #eab308;
  stroke-width: 3.5;
}
.star {
  fill: #fff7d6;
}
.base {
  fill: #92400e;
}
.bar {
  fill: #9ca3af;
}
.plate {
  fill: #374151;
}
.spark {
  fill: none;
  stroke: #facc15;
  stroke-width: 2.5;
  stroke-linecap: round;
}
.zed {
  fill: var(--tr-text-muted, #94a3b8);
  font-size: 12px;
  font-weight: 800;
}

.leg,
.held,
.biceps,
.press,
.whole,
.head,
.waving {
  transform-box: view-box;
}

/* Walking: the legs swing in turn from the hips and the body bobs. */
.leg-left {
  transform-origin: 44px 96px;
}
.leg-right {
  transform-origin: 56px 96px;
}
.walking .whole {
  animation: bob 0.5s ease-in-out infinite;
}
.walking .leg-left {
  animation: swing 0.5s ease-in-out infinite alternate;
}
.walking .leg-right {
  animation: swing 0.5s ease-in-out infinite alternate-reverse;
}
@keyframes swing {
  from {
    transform: rotate(18deg);
  }
  to {
    transform: rotate(-18deg);
  }
}
@keyframes bob {
  50% {
    transform: translateY(-4px);
  }
}

/* Trophy: it shines, tilting a little. */
.held {
  transform-origin: 50px 38px;
  animation: shine 1s ease-in-out infinite alternate;
}
@keyframes shine {
  to {
    transform: rotate(6deg) scale(1.05);
  }
}

/* Dumbbell: pressed up and down. */
.press {
  animation: press 1.2s ease-in-out infinite;
}
@keyframes press {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(8px);
  }
}

/* Biceps: both arms squeeze in turn. */
.biceps-left {
  transform-origin: 39px 70px;
  animation: squeeze 1.2s ease-in-out infinite;
}
.biceps-right {
  transform-origin: 61px 70px;
  animation: squeeze 1.2s ease-in-out infinite 0.6s;
}
@keyframes squeeze {
  0%,
  100% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.08);
  }
}

/* Cheer: jumps for joy. */
.cheer:not(.walking) .whole {
  animation: hop 0.7s cubic-bezier(0.3, 0, 0.5, 1) infinite;
}
@keyframes hop {
  0%,
  100% {
    transform: translateY(0);
  }
  45% {
    transform: translateY(-12px);
  }
}

/* Sleep: breathes slowly, the "z" float up and fade. */
.sleep .whole {
  transform-origin: 50px 128px;
  animation: breathe 3s ease-in-out infinite;
}
@keyframes breathe {
  50% {
    transform: scale(1.02, 0.98);
  }
}
.zed {
  animation: float-z 3s ease-in infinite;
}
.zed-2 {
  animation-delay: 1s;
}
.zed-3 {
  animation-delay: 2s;
}
@keyframes float-z {
  0% {
    opacity: 0;
    transform: translateY(6px);
  }
  30% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateY(-8px);
  }
}

/* Waving: the arm turns around the shoulder; the head tilts now and then. */
.waving {
  transform-origin: 61px 70px;
  animation: wave 2.4s ease-in-out infinite;
}
@keyframes wave {
  0%,
  60%,
  100% {
    transform: rotate(0);
  }
  70%,
  90% {
    transform: rotate(-16deg);
  }
  80% {
    transform: rotate(12deg);
  }
}
.wave .head {
  transform-origin: 50px 64px;
  animation: tilt 4s ease-in-out infinite;
}
@keyframes tilt {
  0%,
  70%,
  100% {
    transform: rotate(0);
  }
  80% {
    transform: rotate(-6deg);
  }
  90% {
    transform: rotate(4deg);
  }
}
</style>
