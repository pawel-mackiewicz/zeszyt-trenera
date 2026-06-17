import type { RouteRecordRaw, RouterOptions } from '@/ui/router/runtime'
import { createRouter, createWebHistory } from '@/ui/router/runtime'

import RosterView from '@/ui/views/roster/RosterView.vue'
import AddMemberView from '@/ui/views/roster/AddMemberView.vue'
import AttendanceEditView from '@/ui/views/attendance/AttendanceEditView.vue'
import AttendanceListView from '@/ui/views/attendance/AttendanceListView.vue'
import AttendanceHistoryView from '@/ui/views/attendance/AttendanceHistoryView.vue'
import CampDetailsView from '@/ui/views/camps/CampDetailsView.vue'
import CampParticipantDetailsView from '@/ui/views/camps/CampParticipantDetailsView.vue'
import CampNewView from '@/ui/views/camps/CampNewView.vue'
import CampClubMembersListView from '@/ui/views/camps/CampClubMembersListView.vue'
import RegisterClubCampParticipantView from '@/ui/views/camps/RegisterClubCampParticipantView.vue'
import RegisterExternalCampParticipantView from '@/ui/views/camps/RegisterExternalCampParticipantView.vue'
import CampsListView from '@/ui/views/camps/CampsListView.vue'
import ClubSetupView from '@/ui/views/setup/ClubSetupView.vue'
import MembershipPaymentsView from '@/ui/views/payments/MembershipPaymentsView.vue'
import TrainerSetupView from '@/ui/views/setup/TrainerSetupView.vue'

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
  | 'camps-list'
  | 'camp-details'
  | 'camp-participant-details'
  | 'add-camp-participant'
  | 'add-club-camp-participant'
  | 'add-external-camp-participant'
  | 'add-camp'
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

// What: keep the roster under `/members` while preserving the old root entry point only. Why: installed PWAs may still resume on `/`, but the add-member flow should now have exactly one canonical URL at `/members/new`.
const MEMBERS_ROUTE_PATH = '/members'
const NEW_MEMBER_ROUTE_PATH = '/members/new'

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
    component: RosterView,
    meta: {}
  },
  {
    path: '/payments',
    name: 'membership-payments',
    // What: route to the payment view entry point. Why: `/payments` stays stable while the payment screen and its supporting UI live together.
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
  },
  {
    path: '/camps',
    name: 'camps-list',
    component: CampsListView,
    meta: {}
  },
  {
    path: '/camps/:campId',
    name: 'camp-details',
    component: CampDetailsView,
    meta: {
      showBack: true,
      backTo: '/camps'
    }
  },
  {
    path: '/camps/:campId/participants/:participantId',
    name: 'camp-participant-details',
    component: CampParticipantDetailsView,
    meta: {
      showBack: true,
      hideBottomNav: true,
      backTo: '/camps/:campId'
    }
  },
  {
    path: '/camps/:campId/participants/new',
    name: 'add-camp-participant',
    component: CampClubMembersListView,
    meta: {
      showBack: true,
      hideBottomNav: true,
      backTo: '/camps/:campId'
    }
  },
  {
    path: '/camps/:campId/participants/new/club/:memberId',
    name: 'add-club-camp-participant',
    component: RegisterClubCampParticipantView,
    meta: {
      showBack: true,
      hideBottomNav: true,
      backTo: '/camps/:campId/participants/new'
    }
  },
  {
    path: '/camps/:campId/participants/new/external',
    name: 'add-external-camp-participant',
    component: RegisterExternalCampParticipantView,
    meta: {
      showBack: true,
      hideBottomNav: true,
      backTo: '/camps/:campId/participants/new'
    }
  },
  {
    path: '/camps/new',
    name: 'add-camp',
    component: CampNewView,
    meta: {
      showBack: true,
      hideBottomNav: true,
      backTo: '/camps'
    }
  }
] satisfies AppRoute[]

const debugRoute = {
  path: '/debug/indexeddb',
  name: 'debug-indexeddb',
  component: () => import('@/ui/views/debug/IndexedDbDebugView.vue'),
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

export const scrollToRouteTop: NonNullable<RouterOptions['scrollBehavior']> = (
  _to,
  _from,
  savedPosition
) => savedPosition ?? { left: 0, top: 0 }

export function createAppRouter(debugEnabled = import.meta.env.DEV) {
  return createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: createAppRoutes(debugEnabled),
    scrollBehavior: scrollToRouteTop
  })
}

const router = createAppRouter()

export default router
