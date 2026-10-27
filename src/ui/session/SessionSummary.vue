<script setup lang="ts">
import { IonButton } from '@ionic/vue';
import { Share2 } from 'lucide-vue-next';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { drawRecap } from '@/ui/recapImage';
import { shareOrDownload } from '@/ui/shareFile';
import { useTemplateName } from '@/ui/useTemplateName';
import { useUnits } from '@/ui/useUnits';
import { todayIso } from '@/ui/useWeekPlan';
import { useSession, type SessionSummary } from './useSession';

/** End of the session: what was done, records, badges, and a picture to share. */
const props = defineProps<{ summary: SessionSummary }>();

const { t, n, locale } = useI18n();
const session = useSession();
const templateLabel = useTemplateName();
const { load: kg } = useUnits();

const nameOf = (id: string) => {
  const entry = session.entryOf(id);
  if (!entry) return id;
  return locale.value.startsWith('fr') ? entry.exercise.name : entry.exercise.nameEn;
};

/** The summary as an image, to show the session to friends. */
const sharing = ref(false);
async function shareSummary(): Promise<void> {
  const done = props.summary;
  if (!done || sharing.value) return;
  sharing.value = true;
  try {
    const blob = await drawRecap({
      title: templateLabel(done.templateId),
      lines: [
        `${n(done.sets)} ${t('session.summary.setsLabel', done.sets)}`,
        `${kg(Math.round(done.workloadKg))} ${t('session.summary.workloadLabel')}`,
        ...(done.minutes !== undefined
          ? [t('session.summary.minutes', { minutes: n(done.minutes) })]
          : []),
        ...(done.volumeGain !== undefined
          ? [t('session.summary.shareGain', { percent: n(done.volumeGain) })]
          : []),
        ...done.records.map((r) => `🏆 ${nameOf(r.exerciseId)} : ${kg(r.loadKg)} × ${n(r.reps)}`),
      ],
      footer: t('recap.footer'),
    });
    await shareOrDownload(`trainerr-${todayIso()}.png`, blob, t('session.summary.share'));
  } finally {
    sharing.value = false;
  }
}
</script>

<template>
  <section class="summary" :aria-label="t('session.summary.title')">
    <div class="summary-hero">
      <span class="check" aria-hidden="true">✓</span>
      <h2>{{ t('session.summary.bravo') }}</h2>
      <p>{{ t('session.summary.title') }}</p>
    </div>
    <div class="tiles">
      <div
        class="tile"
        role="group"
        :aria-label="`${n(summary.sets)} ${t('session.summary.setsLabel', summary.sets)}`"
      >
        <strong>{{ n(summary.sets) }}</strong>
        <span>{{ t('session.summary.setsLabel', summary.sets) }}</span>
      </div>
      <div class="tile">
        <strong>{{ kg(Math.round(summary.workloadKg)) }}</strong>
        <span>{{ t('session.summary.workloadLabel') }}</span>
      </div>
      <div class="tile">
        <strong>{{ n(summary.records.length) }}</strong>
        <span>{{ t('session.summary.recordsLabel', summary.records.length) }}</span>
      </div>
    </div>
    <p v-if="summary.volumeGain !== undefined" class="highlight">
      📈 {{ t('session.summary.volumeGain', { percent: n(summary.volumeGain) }) }}
    </p>
    <p v-if="summary.minutes !== undefined" class="note-line">
      ⏱️ {{ t('session.summary.minutes', { minutes: n(summary.minutes) }) }}
    </p>
    <p v-for="record in summary.records" :key="record.exerciseId" class="highlight">
      🏆
      {{
        t('session.summary.record', {
          name: nameOf(record.exerciseId),
          load: kg(record.loadKg),
          reps: n(record.reps),
        })
      }}
    </p>
    <p v-for="id in summary.backToLevel" :key="`b${id}`" class="highlight">
      {{ t('session.summary.backToLevel', { name: nameOf(id) }) }}
    </p>
    <p v-for="badge in summary.badges" :key="badge" class="highlight">
      🏅 {{ t('session.summary.badge', { badge: t(`badges.${badge}`) }) }}
    </p>
    <p v-if="summary.weeksOnPace >= 2" class="note-line">
      🔥 {{ t('session.summary.streak', summary.weeksOnPace) }}
    </p>
    <p v-if="summary.carryOver.length > 0" class="note-line">
      {{ t('session.carryOver', { names: summary.carryOver.map(nameOf).join(', ') }) }}
    </p>
    <div v-if="summary.newMachines.length > 0" class="new-machines" role="note">
      <p>
        {{
          t(
            'session.summary.newMachines',
            { names: summary.newMachines.map(nameOf).join(', ') },
            summary.newMachines.length,
          )
        }}
      </p>
      <ion-button expand="block" fill="outline" @click="session.adoptMachines(summary.newMachines)">
        {{ t('session.summary.adoptMachines', summary.newMachines.length) }}
      </ion-button>
    </div>
    <ion-button expand="block" fill="outline" :disabled="sharing" @click="shareSummary">
      <Share2 :size="20" aria-hidden="true" class="share-icon" />
      {{ t('session.summary.share') }}
    </ion-button>
    <ion-button expand="block" size="large" @click="session.closeSummary()">{{
      t('session.summary.close')
    }}</ion-button>
  </section>
</template>

<style scoped>
.summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.new-machines p {
  margin-block: 12px 4px;
}
.summary-hero {
  padding: 24px 16px;
  border-radius: var(--app-radius);
  background: var(--ion-color-success);
  color: var(--ion-color-success-contrast);
  text-align: center;
}
.summary-hero .check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgb(255 255 255 / 25%);
  font-size: 2rem;
  font-weight: 800;
}
.summary-hero h2 {
  margin: 10px 0 2px;
  font-size: 1.8rem;
  font-weight: 800;
}
.summary-hero p {
  margin: 0;
  opacity: 0.9;
}
.tiles {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 6px;
  border-radius: var(--app-radius-small);
  background: var(--ion-card-background);
  box-shadow: var(--app-shadow);
  text-align: center;
}
.tile strong {
  font-size: 1.3rem;
}
.tile span {
  font-size: 0.8rem;
  color: var(--ion-color-medium-shade);
}
.summary .highlight,
.summary .note-line {
  margin: 0;
  padding: 10px 12px;
  border-radius: var(--app-radius-small);
  background: var(--ion-card-background);
}
.share-icon {
  margin-inline-end: 8px;
}
.highlight {
  font-weight: 600;
  color: var(--ion-color-success-shade);
}
</style>
