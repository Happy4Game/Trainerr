<script setup lang="ts">
import {
  IonButton,
  IonChip,
  IonInput,
  IonItem,
  IonLabel,
  IonListHeader,
  IonRadio,
  IonRadioGroup,
} from '@ionic/vue';
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { openAppDatabase } from '@/data/appDatabase';
import { addGym, listGyms, renameGym, type Gym } from '@/data/repositories/gymRepository';
import { newId } from '@/data/repositories/sessionRepository';
import type { Equipment } from '@/domain/types';
import { useSession } from '@/ui/session/useSession';
import { reloadCatalog } from '@/ui/useCatalog';
import { useSettings } from '@/ui/useSettings';

const { t } = useI18n();
const { settings, updateSettings } = useSettings();
const session = useSession();
const gyms = ref<Gym[]>([]);
const newName = ref('');
const HOME_EQUIPMENT: Equipment[] = ['dumbbell', 'bodyweight', 'barbell', 'cable', 'machine'];

async function load(): Promise<void> {
  const { db } = await openAppDatabase();
  gyms.value = await listGyms(db);
}
onMounted(load);

async function choose(id: string): Promise<void> {
  await updateSettings({ currentGymId: id });
  await reloadCatalog();
  await session.reload();
}

async function add(): Promise<void> {
  const name = newName.value.trim();
  if (!name) return;
  const { db } = await openAppDatabase();
  const id = newId();
  await addGym(db, id, name);
  newName.value = '';
  await load();
  await choose(id);
}

async function rename(gym: Gym, name: string): Promise<void> {
  if (!name.trim() || name === gym.name) return;
  const { db } = await openAppDatabase();
  await renameGym(db, gym.id, name);
  await load();
}

async function toggleEquipment(item: Equipment): Promise<void> {
  const current = settings.value?.homeEquipment ?? [];
  await updateSettings({
    homeEquipment: current.includes(item) ? current.filter((e) => e !== item) : [...current, item],
  });
  await session.reload();
}
</script>

<template>
  <ion-list-header>{{ t('gyms.title') }}</ion-list-header>
  <ion-radio-group
    :value="settings?.currentGymId"
    @ion-change="choose(String($event.detail.value))"
  >
    <ion-item v-for="gym in gyms" :key="gym.id">
      <ion-radio slot="start" :value="gym.id" :aria-label="t('gyms.choose', { name: gym.name })" />
      <ion-input
        :value="gym.name"
        :aria-label="t('gyms.rename', { name: gym.name })"
        @ion-change="rename(gym, String($event.detail.value ?? ''))"
      />
    </ion-item>
  </ion-radio-group>
  <ion-item>
    <ion-input
      v-model="newName"
      :label="t('gyms.add')"
      label-placement="stacked"
      :placeholder="t('gyms.addPlaceholder')"
      @keyup.enter="add"
    />
    <ion-button slot="end" @click="add">{{ t('gyms.addButton') }}</ion-button>
  </ion-item>
  <ion-item lines="none">
    <ion-label class="ion-text-wrap">
      <p>{{ t('gyms.help') }}</p>
    </ion-label>
  </ion-item>

  <ion-list-header>{{ t('gyms.home') }}</ion-list-header>
  <div class="chips">
    <ion-chip
      v-for="item in HOME_EQUIPMENT"
      :key="item"
      :outline="!settings?.homeEquipment.includes(item)"
      role="switch"
      :aria-checked="settings?.homeEquipment.includes(item) ?? false"
      @click="toggleEquipment(item)"
    >
      <ion-label>{{ t(`equipment.${item}`) }}</ion-label>
    </ion-chip>
  </div>
</template>

<style scoped>
.chips {
  display: flex;
  flex-wrap: wrap;
  padding-inline: 12px;
}
</style>
