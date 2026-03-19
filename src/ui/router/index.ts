import type {
  RouteLocationNormalizedLoaded,
  RouteRecordRaw
} from '@/ui/router/runtime'
import { createRouter, createWebHistory } from '@/ui/router/runtime'

import HomeView from '@/ui/views/HomeView.vue'
import SettingsView from '@/ui/views/SettingsView.vue'
import StatusView from '@/ui/views/StatusView.vue'

type AppRouteMeta = {
  title: string
  eyebrow: string
  summary: string
  navLabel: string
}

type AppRoute = RouteRecordRaw & {
  name: string
  path: string
  meta: AppRouteMeta
}

export type NavigationItem = {
  name: string
  label: string
  to: string
}

const baseRoutes = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: {
      title: 'Notebook Setup',
      eyebrow: 'First setup',
      summary:
        'Create the first local club, trainer, and member records with matching events before the rest of the notebook grows around them.',
      navLabel: 'Setup'
    }
  },
  {
    path: '/status',
    name: 'status',
    component: StatusView,
    meta: {
      title: 'Runtime Status',
      eyebrow: 'PWA health',
      summary:
        'Inspect install, update, connectivity, and storage wiring from a single screen.',
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
      summary:
        'See the starter conventions and where the first real features should plug in.',
      navLabel: 'Settings'
    }
  }
] satisfies AppRoute[]

const debugRoute = {
  path: '/debug/indexeddb',
  name: 'debug-indexeddb',
  component: () => import('@/ui/views/IndexedDbDebugView.vue'),
  meta: {
    title: 'IndexedDB Inspector',
    eyebrow: 'Developer tools',
    summary: 'Inspect local Dexie tables and stored rows in this browser.',
    navLabel: 'Debug'
  }
} satisfies AppRoute

export function createAppRoutes(
  debugEnabled = import.meta.env.DEV
): AppRoute[] {
  return debugEnabled ? [...baseRoutes, debugRoute] : [...baseRoutes]
}

export function createNavigationItems(
  debugEnabled = import.meta.env.DEV
): NavigationItem[] {
  const items = baseRoutes.map((route) => ({
    name: route.name,
    label: route.meta.navLabel,
    to: route.path
  }))

  if (debugEnabled) {
    items.push({
      name: debugRoute.name,
      label: debugRoute.meta.navLabel,
      to: debugRoute.path
    })
  }

  return items
}

export const navigationItems = createNavigationItems()

export function createAppRouter(debugEnabled = import.meta.env.DEV) {
  const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: createAppRoutes(debugEnabled)
  })

  router.afterEach((to: RouteLocationNormalizedLoaded) => {
    const title =
      typeof to.meta.title === 'string' ? to.meta.title : 'Zeszyt Trenera'
    document.title = `${title} • Zeszyt Trenera`
  })

  return router
}

const router = createAppRouter()

export default router
