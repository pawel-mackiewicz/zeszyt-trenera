import { describe, expect, it } from 'vitest'

import { createAppRoutes, createNavigationItems } from '@/ui/router'

describe('router', () => {
  it('omits the IndexedDB debug route outside development mode', () => {
    const routes = createAppRoutes(false)
    expect(routes.map((route) => route.name)).not.toContain('debug-indexeddb')
  })

  it('adds the IndexedDB debug route in development mode', () => {
    const routes = createAppRoutes(true)
    const debugRoute = routes.find((route) => route.name === 'debug-indexeddb')

    expect(debugRoute).toMatchObject({
      path: '/debug/indexeddb',
      meta: {
        hideBottomNav: true,
        showBack: true,
        backTo: '/member',
        showInMenu: true
      }
    })
  })

  it('registers the attendance route in the normal application flow', () => {
    const routes = createAppRoutes(false)
    const membersListRoute = routes.find(
      (route) => route.name === 'members-list'
    )
    const addMemberRoute = routes.find((route) => route.name === 'add-member')
    const clubSetupRoute = routes.find((route) => route.name === 'setup-club')
    const trainerSetupRoute = routes.find(
      (route) => route.name === 'setup-trainer'
    )
    const membershipPaymentsRoute = routes.find(
      (route) => route.name === 'membership-payments'
    )
    const attendanceHistoryRoute = routes.find(
      (route) => route.name === 'attendance-history'
    )
    const attendanceRecordRoute = routes.find(
      (route) => route.name === 'attendance-record'
    )

    expect(clubSetupRoute).toMatchObject({
      path: '/setup/club',
      meta: {
        hideBottomNav: true
      }
    })
    expect(trainerSetupRoute).toMatchObject({
      path: '/setup/trainer',
      meta: {
        hideBottomNav: true
      }
    })
    expect(membersListRoute).toMatchObject({
      path: '/member',
      alias: '/'
    })
    expect(membershipPaymentsRoute).toMatchObject({
      path: '/payments',
      meta: {}
    })
    expect(addMemberRoute).toMatchObject({
      path: '/member/new',
      meta: {
        showBack: true,
        hideBottomNav: true,
        backTo: '/member'
      }
    })
    expect(addMemberRoute).not.toHaveProperty('alias')
    expect(attendanceHistoryRoute).toMatchObject({
      path: '/attendance',
      meta: {}
    })
    expect(attendanceRecordRoute).toMatchObject({
      path: '/attendance/new',
      meta: {
        showBack: true,
        hideBottomNav: true,
        backTo: '/attendance'
      }
    })
  })

  it('omits the IndexedDB debug navigation item outside development mode', () => {
    expect(createNavigationItems(false)).toEqual([])
  })

  it('adds the IndexedDB debug navigation item in development mode', () => {
    expect(createNavigationItems(true)).toContainEqual({
      name: 'debug-indexeddb',
      to: '/debug/indexeddb'
    })
  })
})
