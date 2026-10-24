import { createRouter, createWebHistory } from '@ionic/vue-router';
import type { RouteRecordRaw } from 'vue-router';
import TabsLayout from '@/ui/TabsLayout.vue';
import { loadSettings } from '@/ui/useSettings';

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/tabs/today' },
  { path: '/onboarding', component: () => import('@/views/OnboardingPage.vue') },
  {
    path: '/tabs/',
    component: TabsLayout,
    children: [
      { path: '', redirect: '/tabs/today' },
      { path: 'today', component: () => import('@/views/TodayPage.vue') },
      { path: 'session', component: () => import('@/views/SessionPage.vue') },
      { path: 'catalog', component: () => import('@/views/CatalogPage.vue') },
      { path: 'catalog/:id', component: () => import('@/views/ExercisePage.vue'), props: true },
      { path: 'history', component: () => import('@/views/HistoryPage.vue') },
      { path: 'settings', component: () => import('@/views/SettingsPage.vue') },
      { path: 'settings/tips', component: () => import('@/views/TipsPage.vue') },
      { path: 'settings/credits', component: () => import('@/views/CreditsPage.vue') },
      { path: 'settings/about', component: () => import('@/views/AboutPage.vue') },
      { path: 'planning', component: () => import('@/views/PlanningPage.vue') },
    ],
  },
];

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

// First launch: the questionnaire comes before anything else.
router.beforeEach(async (to) => {
  if (to.path === '/onboarding') return true;
  try {
    const settings = await loadSettings();
    return settings.onboarded ? true : '/onboarding';
  } catch {
    return true;
  }
});
