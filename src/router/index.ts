import { createRouter, createWebHistory } from '@ionic/vue-router';
import type { RouteRecordRaw } from 'vue-router';
import TabsLayout from '@/ui/TabsLayout.vue';

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/tabs/today' },
  {
    path: '/tabs/',
    component: TabsLayout,
    children: [
      { path: '', redirect: '/tabs/today' },
      { path: 'today', component: () => import('@/views/TodayPage.vue') },
      {
        path: 'session',
        component: () => import('@/views/PlaceholderPage.vue'),
        props: { titleKey: 'tabs.session', messageKey: 'placeholder.session' },
      },
      {
        path: 'catalog',
        component: () => import('@/views/PlaceholderPage.vue'),
        props: { titleKey: 'tabs.catalog', messageKey: 'placeholder.catalog' },
      },
      {
        path: 'history',
        component: () => import('@/views/PlaceholderPage.vue'),
        props: { titleKey: 'tabs.history', messageKey: 'placeholder.history' },
      },
      {
        path: 'planning',
        component: () => import('@/views/PlaceholderPage.vue'),
        props: { titleKey: 'tabs.planning', messageKey: 'placeholder.planning' },
      },
    ],
  },
];

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});
