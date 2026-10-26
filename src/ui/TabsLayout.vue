<script setup lang="ts">
import { IonLabel, IonPage, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs } from '@ionic/vue';
import { BookOpen, CalendarDays, Dumbbell, History, Sun } from 'lucide-vue-next';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useSession } from '@/ui/session/useSession';
import UpdatePanel from '@/ui/UpdatePanel.vue';
import { useUpdates } from '@/ui/updates';

const { t } = useI18n();
const { active } = useSession();
const updates = useUpdates();
/** A new version found at launch: offered once, never during a session. */
const showUpdate = computed(
  () =>
    !updates.dismissed.value &&
    !active.value &&
    ['available', 'downloading', 'needsPermission'].includes(updates.state.value.kind),
);
/** A session in progress is always one tap away: a dot on its tab. */
const inProgress = computed(() => active.value !== undefined);

const tabs = [
  { name: 'today', href: '/tabs/today', icon: Sun },
  { name: 'session', href: '/tabs/session', icon: Dumbbell },
  { name: 'catalog', href: '/tabs/catalog', icon: BookOpen },
  { name: 'history', href: '/tabs/history', icon: History },
  { name: 'planning', href: '/tabs/planning', icon: CalendarDays },
] as const;
</script>

<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />
      <div v-if="showUpdate" slot="bottom" class="update-banner">
        <UpdatePanel compact @later="updates.dismissed.value = true" />
      </div>
      <ion-tab-bar slot="bottom">
        <ion-tab-button v-for="tab in tabs" :key="tab.name" :tab="tab.name" :href="tab.href">
          <span class="icon-pill">
            <component :is="tab.icon" :size="22" aria-hidden="true" />
            <span v-if="tab.name === 'session' && inProgress" class="dot" aria-hidden="true" />
          </span>
          <ion-label>
            {{ t(`tabs.${tab.name}`) }}
            <span v-if="tab.name === 'session' && inProgress" class="visually-hidden">
              · {{ t('tabs.inProgress') }}
            </span>
          </ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<style scoped>
.update-banner {
  padding: 10px 14px;
  background: var(--ion-card-background);
  box-shadow: 0 -2px 8px rgb(0 0 0 / 12%);
}
ion-tab-bar {
  --border: 0;
  box-shadow: 0 -1px 0 var(--ion-color-light);
  /* Keeps Ionic's room for the system navigation bar. */
  padding-top: 4px;
  padding-bottom: calc(4px + var(--ion-safe-area-bottom, 0px));
}
ion-tab-button {
  --color: var(--ion-color-medium-shade);
  --color-selected: var(--ion-color-primary);
  --padding-start: 0;
  --padding-end: 0;
  min-width: 0;
}
ion-tab-button ion-label {
  max-width: 100%;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap;
}
.tab-selected ion-label {
  font-weight: 800;
}
.icon-pill {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 30px;
  margin-block-end: 2px;
  border-radius: 999px;
  transition: background-color 0.2s;
}
.tab-selected .icon-pill {
  background: rgba(var(--ion-color-primary-rgb), 0.14);
}
.dot {
  position: absolute;
  top: 2px;
  right: 12px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--ion-color-success);
  box-shadow: 0 0 0 2px var(--ion-tab-bar-background, #fff);
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
