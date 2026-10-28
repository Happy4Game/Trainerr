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
      // Machine card opened from Today: stays in the Today tab.
      {
        path: 'today/exercise/:id',
        component: () => import('@/views/ExercisePage.vue'),
        props: (route) => ({ id: route.params.id, from: 'today' }),
      },
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
        props: (route) => ({ id: route.params.id, from: 'session' }),
      },
      { path: 'catalog', component: () => import('@/views/CatalogPage.vue') },
      {
        path: 'catalog/cardio/:id',
        component: () => import('@/views/CardioPage.vue'),
        props: true,
      },
      {
        path: 'catalog/:id',
        component: () => import('@/views/ExercisePage.vue'),
        props: true,
      },
      // Former addresses, when the catalog was inside the Session tab.
      { path: 'session/catalog', redirect: '/tabs/catalog' },
      {
        path: 'session/catalog/:rest(.*)',
        redirect: (to) => `/tabs/catalog/${to.params.rest}`,
      },
      // Progress: sessions, stats and body (weight, measurements, photos).
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
      // Former Body tab, now the Body view of Progress.
      { path: 'body', redirect: { path: '/tabs/history', query: { view: 'body' } } },
      { path: 'body/photos', redirect: '/tabs/history/photos' },
      { path: 'planning', component: () => import('@/views/PlanningPage.vue') },
      { path: 'today/planning', redirect: '/tabs/planning' },
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
