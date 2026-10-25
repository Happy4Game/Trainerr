<script setup lang="ts">
// Development only: every movement at once, to check the drawings.
import { IonContent, IonPage } from '@ionic/vue';
import { MOVEMENTS, type MovementId } from '@/ui/demo/movements';
import ExerciseDemo from '@/ui/demo/ExerciseDemo.vue';

const ids = Object.keys(MOVEMENTS) as MovementId[];
const equipmentFor = (id: MovementId) =>
  ['benchPress', 'squat', 'hinge', 'inclinePress', 'shrug'].includes(id)
    ? 'barbell'
    : ['curl', 'lateralRaise', 'frontRaise', 'lunge', 'calfRaise', 'overheadExtension'].includes(id)
      ? 'dumbbell'
      : 'machine';
</script>

<template>
  <ion-page>
    <ion-content>
      <div class="grid">
        <div v-for="id in ids" :key="id" class="cell">
          <strong>{{ id }}</strong>
          <div class="pair">
            <ExerciseDemo
              v-for="at in [0, 1]"
              :key="at"
              :movement="id"
              :equipment="equipmentFor(id)"
              :name="id"
              :approximate="false"
              :at="at"
            />
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}
.cell {
  font-size: 11px;
}
.pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
}
.pair :deep(figcaption) {
  display: none;
}
.pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
}
.pair :deep(figcaption) {
  display: none;
}
</style>
