import { describe, expect, it } from 'vitest'

import { createAppRoutes, createNavigationItems } from '@/ui/router'

describe('router', () => {
  it('omits the IndexedDB debug route and nav item outside development mode', () => {
    const routes = createAppRoutes(false)
    const navigationItems = createNavigationItems(false)

    expect(routes.map((route) => route.name)).not.toContain('debug-indexeddb')
    expect(navigationItems.map((item) => item.name)).not.toContain(
      'debug-indexeddb'
    )
  })

  it('adds the IndexedDB debug route and nav item in development mode', () => {
    const routes = createAppRoutes(true)
    const navigationItems = createNavigationItems(true)
    const debugRoute = routes.find((route) => route.name === 'debug-indexeddb')

    expect(debugRoute).toMatchObject({
      path: '/debug/indexeddb',
      meta: {
        title: 'IndexedDB Inspector',
        eyebrow: 'Developer tools',
        summary: 'Inspect local Dexie tables and stored rows in this browser.',
        navLabel: 'Debug'
      }
    })
    expect(navigationItems).toContainEqual({
      name: 'debug-indexeddb',
      label: 'Debug',
      to: '/debug/indexeddb'
    })
  })
})
