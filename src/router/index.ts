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
      {
        path: 'session/custom/:id',
        component: () => import('@/views/CustomSessionPage.vue'),
        props: true,
      },
      { path: 'session/presets', component: () => import('@/views/PresetsPage.vue') },
      // Machine card opened from the session: stays in the Session tab.
      {
        path: 'session/exercise/:id',
        component: () => import('@/views/ExercisePage.vue'),
        props: (route) => ({ id: route.params.id, fromSession: true }),
      },
      { path: 'catalog', component: () => import('@/views/CatalogPage.vue') },
      {
        path: 'catalog/cardio/:id',
        component: () => import('@/views/CardioPage.vue'),
        props: true,
      },
      { path: 'catalog/:id', component: () => import('@/views/ExercisePage.vue'), props: true },
      { path: 'history', component: () => import('@/views/HistoryPage.vue') },
      { path: 'history/photos', component: () => import('@/views/PhotosPage.vue') },
      {
        path: 'history/:id',
        component: () => import('@/views/HistorySessionPage.vue'),
        props: true,
      },
      { path: 'settings', component: () => import('@/views/SettingsPage.vue') },
      { path: 'settings/tips', component: () => import('@/views/TipsPage.vue') },
      { path: 'settings/credits', component: () => import('@/views/CreditsPage.vue') },
      { path: 'settings/friends', component: () => import('@/views/FriendsPage.vue') },
      { path: 'settings/about', component: () => import('@/views/AboutPage.vue') },
      { path: 'settings/changelog', component: () => import('@/views/ChangelogPage.vue') },
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
  if (to.path === '/onboarding' || to.path.startsWith('/dev/')) return true;
  try {
    const settings = await loadSettings();
    return settings.onboarded ? true : '/onboarding';
  } catch {
    return true;
  }
});
