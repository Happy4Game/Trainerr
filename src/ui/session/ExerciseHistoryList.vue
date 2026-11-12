<script setup lang="ts">
import { useI18n } from 'vue-i18n';

interface PastSet {
  readonly loadKg: number;
  readonly reps: number;
}

/** Past sessions with one exercise, newest first, set by set. */
defineProps<{
  sessions: readonly { readonly date: string; readonly sets: readonly PastSet[] }[];
  /** How a set reads on this machine (assisted, body weight, timed). */
  setText: (set: PastSet) => string;
}>();

const { locale } = useI18n();
const longDay = (date: string) =>
  new Intl.DateTimeFormat(locale.value, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
</script>

<template>
  <ol class="sessions">
    <li v-for="past in sessions" :key="past.date + past.sets.length" data-testid="history-session">
      <h3>{{ longDay(past.date) }}</h3>
      <ol class="sets">
        <li v-for="(set, i) in past.sets" :key="i">
          <span class="number">{{ i + 1 }}</span>
          {{ setText(set) }}
        </li>
      </ol>
    </li>
  </ol>
</template>

<style scoped>
.sessions,
.sets {
  margin: 0;
  padding: 0;
  list-style: none;
}
.sessions > li {
  padding-block: 10px;
  border-top: 1px solid var(--ion-color-step-150, rgb(128 128 128 / 20%));
}
h3 {
  margin: 0 0 6px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--ion-color-medium);
}
h3::first-letter {
  text-transform: uppercase;
}
.sets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  font-variant-numeric: tabular-nums;
}
.number {
  display: inline-block;
  min-width: 1.4em;
  color: var(--ion-color-medium);
  font-size: 0.8rem;
}
</style>
