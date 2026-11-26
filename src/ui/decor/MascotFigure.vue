<script setup lang="ts">
/**
 * The Trainerr mascot, drawn in SVG (drawn by an AI, see the Credits).
 * - trophy: arms up holding a trophy, legs walking (celebrations);
 * - wave: standing, one arm waving (tips and encouragements).
 * Colours follow the theme: the shirt takes the accent colour.
 */
withDefaults(defineProps<{ pose?: 'trophy' | 'wave' }>(), { pose: 'trophy' });
</script>

<template>
  <svg class="figure" :class="pose" viewBox="0 0 100 140" aria-hidden="true">
    <!-- Legs first: the shorts cover their top. -->
    <g class="leg leg-left">
      <rect x="40" y="96" width="8" height="28" rx="4" class="skin" />
      <ellipse cx="43" cy="127" rx="7" ry="4" class="shoe" />
    </g>
    <g class="leg leg-right">
      <rect x="52" y="96" width="8" height="28" rx="4" class="skin" />
      <ellipse cx="57" cy="127" rx="7" ry="4" class="shoe" />
    </g>

    <template v-if="pose === 'trophy'">
      <!-- Arms raised, the trophy above the head. -->
      <path d="M39 68 L38 38" class="arm" />
      <path d="M61 68 L62 38" class="arm" />
      <g class="trophy">
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
    <template v-else>
      <!-- One arm down, the other waving hello. -->
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
      <circle cx="44.5" cy="51" r="2.2" class="eye" />
      <circle cx="55.5" cy="51" r="2.2" class="eye" />
      <circle cx="41" cy="56" r="2.5" class="blush" />
      <circle cx="59" cy="56" r="2.5" class="blush" />
      <path d="M45 56.5 Q50 61.5 55 56.5" class="smile" />
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
.eye {
  fill: #1f2937;
}
.shirt,
.band {
  fill: var(--ion-color-primary);
}
.arm {
  fill: none;
  stroke: var(--ion-color-primary);
  stroke-width: 8;
  stroke-linecap: round;
}
.blush {
  fill: #f87171;
  opacity: 0.45;
}
.smile {
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

/* Walking: the legs swing in turn and the whole body bobs. */
.leg {
  transform-box: fill-box;
  transform-origin: 50% 0;
}
.figure.trophy {
  animation: bob 0.5s ease-in-out infinite;
}
.figure.trophy .leg-left {
  animation: swing 0.5s ease-in-out infinite alternate;
}
.figure.trophy .leg-right {
  animation: swing 0.5s ease-in-out infinite alternate-reverse;
}
.figure.trophy .trophy {
  transform-box: fill-box;
  transform-origin: 50% 100%;
  animation: shine 1s ease-in-out infinite alternate;
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
@keyframes shine {
  to {
    transform: rotate(6deg) scale(1.05);
  }
}

/* Waving: the arm turns around the shoulder; the head tilts now and then. */
.waving {
  transform-box: view-box;
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
.figure.wave .head {
  transform-box: view-box;
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
