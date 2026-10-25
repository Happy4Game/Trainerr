<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonPage,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/vue';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { ApiError, createApi, type Group, type LeaderboardMember } from '@/data/remote/api';
import { startOfWeek } from '@/domain/dates';
import { syncStats } from '@/ui/friends';
import { useSession } from '@/ui/session/useSession';
import { useSettings } from '@/ui/useSettings';
import { useUnits } from '@/ui/useUnits';
import { todayIso } from '@/ui/useWeekPlan';

const { t, locale } = useI18n();
const { settings, updateSettings } = useSettings();
const session = useSession();
const { load } = useUnits();

const serverInput = ref('');
const pseudo = ref('');
const groupName = ref('');
const code = ref('');
const message = ref('');
const groups = ref<Group[]>([]);
const boards = ref<Record<string, LeaderboardMember[]>>({});
const confirmingDelete = ref(false);

const api = computed(() =>
  settings.value?.serverUrl
    ? createApi(settings.value.serverUrl, settings.value.account?.token)
    : undefined,
);
const exerciseName = (id: string) => {
  const e = session.entryOf(id)?.exercise;
  return e ? (locale.value.startsWith('fr') ? e.name : e.nameEn) : id;
};

function explain(error: unknown): void {
  const code = error instanceof ApiError ? error.code : 'server_error';
  message.value = t(
    `friends.errors.${['network', 'unknown_code', 'invalid_name'].includes(code) ? code : 'other'}`,
  );
}

async function refresh(): Promise<void> {
  if (!api.value || !settings.value?.account) return;
  try {
    await syncStats(settings.value, session.history.value, todayIso(), { exerciseName, load });
    groups.value = await api.value.groups();
    const week = startOfWeek(todayIso());
    for (const group of groups.value) {
      boards.value[group.id] = await api.value.leaderboard(group.id, week);
    }
    message.value = '';
  } catch (error) {
    explain(error);
  }
}
onMounted(refresh);

async function saveServer(): Promise<void> {
  const url = serverInput.value.trim();
  if (!/^https?:\/\/\S+$/.test(url)) {
    message.value = t('friends.errors.url');
    return;
  }
  await updateSettings({ serverUrl: url });
}

async function createAccount(): Promise<void> {
  if (!api.value) return;
  try {
    const { token } = await api.value.createAccount(pseudo.value);
    await updateSettings({ account: { name: pseudo.value.trim(), token } });
    await refresh();
  } catch (error) {
    explain(error);
  }
}

async function createGroup(): Promise<void> {
  if (!api.value || !groupName.value.trim()) return;
  try {
    await api.value.createGroup(groupName.value);
    groupName.value = '';
    await refresh();
  } catch (error) {
    explain(error);
  }
}

async function join(): Promise<void> {
  if (!api.value || !code.value.trim()) return;
  try {
    await api.value.joinGroup(code.value);
    code.value = '';
    await refresh();
  } catch (error) {
    explain(error);
  }
}

async function setShareRecords(on: boolean): Promise<void> {
  await updateSettings({ shareRecords: on });
  await refresh();
}

async function deleteAccount(): Promise<void> {
  try {
    await api.value?.deleteAccount();
  } catch (error) {
    explain(error);
    return;
  }
  await updateSettings({ account: undefined });
  groups.value = [];
  confirmingDelete.value = false;
}
</script>

<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/settings" :text="t('common.back')" />
        </ion-buttons>
        <ion-title>{{ t('friends.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p class="hint">{{ t('friends.privacy') }}</p>
      <p v-if="message" role="alert" class="alert">{{ message }}</p>

      <template v-if="!settings?.serverUrl">
        <p>{{ t('friends.serverHelp') }}</p>
        <ion-input
          v-model="serverInput"
          fill="outline"
          :label="t('friends.server')"
          label-placement="stacked"
          inputmode="url"
          placeholder="https://"
        />
        <ion-button expand="block" @click="saveServer">{{ t('friends.saveServer') }}</ion-button>
      </template>

      <template v-else-if="!settings?.account">
        <ion-input
          v-model="pseudo"
          fill="outline"
          :label="t('friends.pseudo')"
          label-placement="stacked"
          :maxlength="40"
        />
        <ion-button expand="block" @click="createAccount">{{
          t('friends.createAccount')
        }}</ion-button>
      </template>

      <template v-else>
        <ion-card v-for="group in groups" :key="group.id">
          <ion-card-header>
            <ion-card-title>{{ group.name }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p class="hint">{{ t('friends.code', { code: group.code }) }}</p>
            <ol class="board">
              <li
                v-for="member in boards[group.id] ?? []"
                :key="member.name"
                :class="{ me: member.me }"
              >
                <strong>{{ member.name }}</strong> · {{ t('friends.sessions', member.sessions) }} ·
                {{ t('friends.weeks', member.weeksOnPace) }}
                <ul v-if="member.records" class="records">
                  <li v-for="record in member.records" :key="record.name">
                    {{ record.name }} : {{ record.load }}
                  </li>
                </ul>
              </li>
            </ol>
          </ion-card-content>
        </ion-card>
        <p v-if="groups.length === 0">{{ t('friends.noGroup') }}</p>

        <ion-item>
          <ion-input
            v-model="groupName"
            :label="t('friends.groupName')"
            label-placement="stacked"
          />
          <ion-button slot="end" @click="createGroup">{{ t('friends.create') }}</ion-button>
        </ion-item>
        <ion-item>
          <ion-input v-model="code" :label="t('friends.joinCode')" label-placement="stacked" />
          <ion-button slot="end" @click="join">{{ t('friends.join') }}</ion-button>
        </ion-item>
        <ion-item>
          <ion-toggle
            :checked="settings?.shareRecords ?? false"
            @ion-change="setShareRecords($event.detail.checked)"
          >
            {{ t('friends.shareRecords') }}
          </ion-toggle>
        </ion-item>
        <ion-button expand="block" fill="clear" @click="refresh">{{
          t('friends.refresh')
        }}</ion-button>

        <ion-button
          v-if="!confirmingDelete"
          expand="block"
          fill="clear"
          color="danger"
          @click="confirmingDelete = true"
        >
          {{ t('friends.deleteAccount') }}
        </ion-button>
        <div v-else class="confirm" role="alertdialog" :aria-label="t('friends.deleteAccount')">
          <p>{{ t('friends.deleteConfirm') }}</p>
          <ion-button expand="block" color="danger" @click="deleteAccount">
            {{ t('friends.deleteYes') }}
          </ion-button>
          <ion-button expand="block" fill="clear" @click="confirmingDelete = false">
            {{ t('data.cancel') }}
          </ion-button>
        </div>
      </template>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.hint {
  font-size: 0.85rem;
  color: var(--ion-color-medium);
}
.alert {
  padding: 8px 12px;
  border-radius: 8px;
  background: var(--ion-color-warning);
  color: var(--ion-color-warning-contrast);
}
.board li {
  margin-block: 6px;
}
.board li.me {
  font-weight: 600;
}
.records {
  font-weight: 400;
  font-size: 0.85rem;
}
.confirm {
  padding: 12px;
  border: 1px solid var(--ion-color-danger);
  border-radius: 12px;
}
</style>
