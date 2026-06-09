import { mount, type VueWrapper } from '@vue/test-utils'
import { reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import BottomNavigation from '@/ui/app-shell/BottomNavigation.vue'
import { createAppI18n } from '@/ui/i18n'
import type { AppRouteName } from '@/ui/router'
import { useRoute } from '@/ui/router/runtime'

type MockRoute = {
  meta: Record<string, unknown>
  name: AppRouteName
  path: string
  fullPath: string
}

vi.mock('@/ui/router/runtime', () => ({
  RouterLink: {
    props: ['to'],
    template: '<a :href="to"><slot /></a>'
  },
  useRoute: vi.fn()
}))

describe('BottomNavigation', () => {
  let mockRoute: MockRoute

  beforeEach(() => {
    mockRoute = reactive({
      meta: {},
      name: 'members-list',
      path: '/members',
      fullPath: '/members'
    }) as MockRoute

    vi.mocked(useRoute).mockReturnValue(
      mockRoute as unknown as ReturnType<typeof useRoute>
    )
  })

  function mountBottomNavigation() {
    const i18n = createAppI18n('pl')

    return mount(BottomNavigation, {
      global: {
        plugins: [i18n]
      }
    })
  }

  function expectBottomNavTabState(
    wrapper: VueWrapper,
    path: string,
    active: boolean
  ) {
    const link = wrapper.get(`a[href="${path}"]`)
    const classes = link.classes()
    const iconClasses = link.get('svg').classes()
    const labelClasses = link.get('span').classes()

    if (active) {
      expect(classes).toContain('bg-primary')
      expect(classes).toContain('text-white')
      expect(classes).not.toContain('text-on-surface')
      expect(iconClasses).toContain('text-white')
      expect(labelClasses).toContain('text-white')

      return
    }

    expect(classes).toContain('text-on-surface')
    expect(classes).not.toContain('bg-primary')
    expect(classes).not.toContain('text-white')
    expect(iconClasses).not.toContain('text-white')
    expect(labelClasses).not.toContain('text-white')
  }

  it('keeps the members tab active on the members screen', () => {
    const wrapper = mountBottomNavigation()

    expectBottomNavTabState(wrapper, '/members', true)
    expectBottomNavTabState(wrapper, '/payments', false)
    expectBottomNavTabState(wrapper, '/attendance', false)
    expectBottomNavTabState(wrapper, '/camps', false)
  })

  it('keeps the payments tab active on the monthly ledger screen', () => {
    mockRoute.name = 'membership-payments'
    mockRoute.path = '/payments'
    mockRoute.fullPath = '/payments'

    const wrapper = mountBottomNavigation()

    expectBottomNavTabState(wrapper, '/payments', true)
    expectBottomNavTabState(wrapper, '/members', false)
    expectBottomNavTabState(wrapper, '/attendance', false)
    expectBottomNavTabState(wrapper, '/camps', false)
  })

  it.each([
    ['attendance-history', '/attendance'],
    ['attendance-record', '/attendance/new'],
    ['attendance-edit', '/attendance/attendance-list-1/edit']
  ] satisfies Array<[AppRouteName, string]>)(
    'keeps the attendance tab active on the %s route',
    (routeName, path) => {
      mockRoute.name = routeName
      mockRoute.path = path
      mockRoute.fullPath = path

      const wrapper = mountBottomNavigation()

      expectBottomNavTabState(wrapper, '/attendance', true)
      expectBottomNavTabState(wrapper, '/members', false)
      expectBottomNavTabState(wrapper, '/payments', false)
      expectBottomNavTabState(wrapper, '/camps', false)
    }
  )

  it.each([
    ['camps-list', '/camps'],
    ['add-camp', '/camps/new']
  ] satisfies Array<[AppRouteName, string]>)(
    'keeps the camps tab active on the %s route',
    (routeName, path) => {
      mockRoute.name = routeName
      mockRoute.path = path
      mockRoute.fullPath = path

      const wrapper = mountBottomNavigation()

      expectBottomNavTabState(wrapper, '/camps', true)
      expectBottomNavTabState(wrapper, '/members', false)
      expectBottomNavTabState(wrapper, '/payments', false)
      expectBottomNavTabState(wrapper, '/attendance', false)
    }
  )

  it('hides when route metadata disables bottom navigation', () => {
    mockRoute.meta = {
      hideBottomNav: true
    }

    const wrapper = mountBottomNavigation()

    expect(wrapper.find('[data-testid="bottom-navigation"]').exists()).toBe(
      false
    )
  })

  it('routes the bottom attendance tab straight to training history', () => {
    const wrapper = mountBottomNavigation()

    expect(
      wrapper.get('[data-testid="bottom-navigation"]').classes()
    ).not.toContain('md:hidden')
    expect(
      wrapper.find('button[aria-label="Przełącz widok obecności"]').exists()
    ).toBe(false)
    expect(
      wrapper.find('button[aria-label="Zamknij menu obecności"]').exists()
    ).toBe(false)
    expect(wrapper.find('a[href="/attendance/new"]').exists()).toBe(false)
    expect(wrapper.get('a[href="/payments"]').text().toUpperCase()).toContain(
      'PŁATNOŚCI'
    )
    expect(wrapper.get('a[href="/attendance"]').text().toUpperCase()).toContain(
      'OBECNOŚCI'
    )
    expect(wrapper.get('a[href="/camps"]').text().toUpperCase()).toContain(
      'OBOZY'
    )
  })
})
