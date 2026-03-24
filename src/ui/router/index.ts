import type {
  RouteLocationNormalizedLoaded,
  RouteRecordRaw
} from '@/ui/router/runtime'
import { createRouter, createWebHistory } from '@/ui/router/runtime'

import MembersListView from '@/ui/views/MembersListView.vue'
import AddMemberView from '@/ui/views/AddMemberView.vue'

type AppRouteMeta = {
  title: string
  showBack?: boolean
  hideBottomNav?: boolean
  backTo?: string
  menuLabel?: string
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
    name: 'members-list',
    component: MembersListView,
    meta: {
      title: 'Członkowie'
    }
  },
  {
    path: '/add-member',
    name: 'add-member',
    component: AddMemberView,
    meta: {
      title: 'Dodaj Członka',
      showBack: true,
      hideBottomNav: true,
      backTo: '/'
    }
  }
] satisfies AppRoute[]

const debugRoute = {
  path: '/debug/indexeddb',
  name: 'debug-indexeddb',
  component: () => import('@/ui/views/IndexedDbDebugView.vue'),
  meta: {
    title: 'Inspector',
    hideBottomNav: true,
    showBack: true,
    backTo: '/',
    menuLabel: 'Debug IndexedDB'
  }
} satisfies AppRoute

export function createAppRoutes(
  debugEnabled = import.meta.env.DEV
): AppRoute[] {
  return debugEnabled ? [...baseRoutes, debugRoute] : [...baseRoutes]
}

// Keeping shell navigation derived from registered routes prevents production builds from linking to dev-only screens.
export function createNavigationItems(
  debugEnabled = import.meta.env.DEV
): NavigationItem[] {
  return createAppRoutes(debugEnabled).flatMap((route) => {
    const { menuLabel } = route.meta

    return menuLabel
      ? [
          {
            name: route.name,
            label: menuLabel,
            to: route.path
          }
        ]
      : []
  })
}

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
