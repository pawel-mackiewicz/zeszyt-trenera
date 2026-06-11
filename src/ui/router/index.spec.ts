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
        backTo: '/members',
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
    const attendanceEditRoute = routes.find(
      (route) => route.name === 'attendance-edit'
    )
    const campsListRoute = routes.find((route) => route.name === 'camps-list')
    const campDetailsRoute = routes.find(
      (route) => route.name === 'camp-details'
    )
    const addCampParticipantRoute = routes.find(
      (route) => route.name === 'add-camp-participant'
    )
    const addCampRoute = routes.find((route) => route.name === 'add-camp')

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
      path: '/members',
      alias: '/'
    })
    expect(membershipPaymentsRoute).toMatchObject({
      path: '/payments',
      meta: {}
    })
    expect(addMemberRoute).toMatchObject({
      path: '/members/new',
      meta: {
        showBack: true,
        hideBottomNav: true,
        backTo: '/members'
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
    expect(attendanceEditRoute).toMatchObject({
      path: '/attendance/:attendanceListId/edit',
      meta: {
        showBack: true,
        hideBottomNav: true,
        backTo: '/attendance'
      }
    })
    expect(campsListRoute).toMatchObject({
      path: '/camps',
      meta: {}
    })
    expect(campDetailsRoute).toMatchObject({
      path: '/camps/:campId',
      meta: {
        showBack: true,
        backTo: '/camps'
      }
    })
    expect(addCampParticipantRoute).toMatchObject({
      path: '/camps/:campId/participants/new',
      meta: {
        showBack: true,
        hideBottomNav: true,
        backTo: '/camps'
      }
    })
    expect(addCampRoute).toMatchObject({
      path: '/camps/new',
      meta: {
        showBack: true,
        hideBottomNav: true,
        backTo: '/camps'
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
