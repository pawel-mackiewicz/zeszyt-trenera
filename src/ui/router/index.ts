import type { RouteRecordRaw } from '@/ui/router/runtime'
import { createRouter, createWebHistory } from '@/ui/router/runtime'

import MembersListView from '@/ui/views/MembersListView.vue'
import AddMemberView from '@/ui/views/AddMemberView.vue'
import AttendanceEditView from '@/ui/views/AttendanceEditView.vue'
import AttendanceListView from '@/ui/views/AttendanceListView.vue'
import AttendanceHistoryView from '@/ui/views/AttendanceHistoryView.vue'
import ClubSetupView from '@/ui/views/ClubSetupView.vue'
import MembershipPaymentsView from '@/ui/views/MembershipPaymentsView.vue'
import TrainerSetupView from '@/ui/views/TrainerSetupView.vue'

type AppRouteMeta = {
  showBack?: boolean
  hideBottomNav?: boolean
  backTo?: string
  showInMenu?: boolean
}

export type AppRouteName =
  | 'members-list'
  | 'membership-payments'
  | 'add-member'
  | 'attendance-history'
  | 'attendance-record'
  | 'attendance-edit'
  | 'setup-club'
  | 'setup-trainer'
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

// What: keep the roster under `/member` while preserving the old root entry point only. Why: installed PWAs may still resume on `/`, but the add-member flow should now have exactly one canonical URL at `/member/new`.
const MEMBERS_ROUTE_PATH = '/member'
const NEW_MEMBER_ROUTE_PATH = '/member/new'

const baseRoutes = [
  {
    path: '/setup/club',
    name: 'setup-club',
    component: ClubSetupView,
    meta: {
      hideBottomNav: true
    }
  },
  {
    path: '/setup/trainer',
    name: 'setup-trainer',
    component: TrainerSetupView,
    meta: {
      hideBottomNav: true
    }
  },
  {
    path: MEMBERS_ROUTE_PATH,
    alias: '/',
    name: 'members-list',
    component: MembersListView,
    meta: {}
  },
  {
    path: '/payments',
    name: 'membership-payments',
    component: MembershipPaymentsView,
    meta: {}
  },
  {
    path: NEW_MEMBER_ROUTE_PATH,
    name: 'add-member',
    component: AddMemberView,
    meta: {
      showBack: true,
      hideBottomNav: true,
      backTo: MEMBERS_ROUTE_PATH
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
  },
  {
    path: '/attendance/:attendanceListId/edit',
    name: 'attendance-edit',
    component: AttendanceEditView,
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
    backTo: MEMBERS_ROUTE_PATH,
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
