import type { RouteRecordRaw } from '@/ui/router/runtime'
import { createRouter, createWebHistory } from '@/ui/router/runtime'

import MembersListView from '@/ui/views/MembersListView.vue'
import AddMemberView from '@/ui/views/AddMemberView.vue'
import AttendanceListView from '@/ui/views/AttendanceListView.vue'
import AttendanceHistoryView from '@/ui/views/AttendanceHistoryView.vue'

type AppRouteMeta = {
  showBack?: boolean
  hideBottomNav?: boolean
  backTo?: string
  showInMenu?: boolean
}

export type AppRouteName =
  | 'members-list'
  | 'add-member'
  | 'attendance-history'
  | 'attendance-record'
  | 'debug-indexeddb'

type AppRoute = RouteRecordRaw & {
  name: AppRouteName
  path: string
  meta: AppRouteMeta
}

export type NavigationItem = {
  name: AppRouteName
  to: string
}

const baseRoutes = [
  {
    path: '/',
    name: 'members-list',
    component: MembersListView,
    meta: {}
  },
  {
    path: '/add-member',
    name: 'add-member',
    component: AddMemberView,
    meta: {
      showBack: true,
      hideBottomNav: true,
      backTo: '/'
    }
  },
  {
    path: '/attendance',
    name: 'attendance-history',
    component: AttendanceHistoryView,
    meta: {}
  },
  {
    path: '/attendance/new',
    name: 'attendance-record',
    component: AttendanceListView,
    meta: {
      showBack: true,
      hideBottomNav: true,
      backTo: '/attendance'
    }
  }
] satisfies AppRoute[]

const debugRoute = {
  path: '/debug/indexeddb',
  name: 'debug-indexeddb',
  component: () => import('@/ui/views/IndexedDbDebugView.vue'),
  meta: {
    hideBottomNav: true,
    showBack: true,
    backTo: '/',
    showInMenu: true
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
    return route.meta.showInMenu
      ? [
          {
            name: route.name,
            to: route.path
          }
        ]
      : []
  })
}

export function createAppRouter(debugEnabled = import.meta.env.DEV) {
  return createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: createAppRoutes(debugEnabled)
  })
}

const router = createAppRouter()

export default router
