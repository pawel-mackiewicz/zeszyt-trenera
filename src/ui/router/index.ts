import type { RouteLocationNormalizedLoaded } from '@/ui/router/runtime'
import { createRouter, createWebHistory } from '@/ui/router/runtime'

import HomeView from '@/ui/views/HomeView.vue'
import SettingsView from '@/ui/views/SettingsView.vue'
import StatusView from '@/ui/views/StatusView.vue'

export const navigationItems = [
  { name: 'home', label: 'Home', to: '/' },
  { name: 'status', label: 'Status', to: '/status' },
  { name: 'settings', label: 'Settings', to: '/settings' }
] as const

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: {
        title: 'Fieldbook Boilerplate',
        eyebrow: 'Mobile-first shell',
        summary: 'Vue, Pinia, PWA wiring, and Dexie bootstrapping without domain baggage.',
        navLabel: 'Home'
      }
    },
    {
      path: '/status',
      name: 'status',
      component: StatusView,
      meta: {
        title: 'Runtime Status',
        eyebrow: 'PWA health',
        summary: 'Inspect install, update, connectivity, and storage wiring from a single screen.',
        navLabel: 'Status'
      }
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView,
      meta: {
        title: 'Boilerplate Decisions',
        eyebrow: 'System defaults',
        summary: 'See the starter conventions and where the first real features should plug in.',
        navLabel: 'Settings'
      }
    }
  ]
})

router.afterEach((to: RouteLocationNormalizedLoaded) => {
  document.title = `${to.meta.title} • Zeszyt Trenera`
})

export default router
