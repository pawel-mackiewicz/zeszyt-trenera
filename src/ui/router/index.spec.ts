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
        backTo: '/',
        showInMenu: true
      }
    })
  })

  it('registers the attendance route in the normal application flow', () => {
    const routes = createAppRoutes(false)
    const attendanceHistoryRoute = routes.find(
      (route) => route.name === 'attendance-history'
    )
    const attendanceRecordRoute = routes.find(
      (route) => route.name === 'attendance-record'
    )

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
