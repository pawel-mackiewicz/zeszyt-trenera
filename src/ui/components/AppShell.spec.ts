import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import AppShell from '@/ui/components/AppShell.vue'
import { useAppUpdate } from '@/ui/composables/useAppUpdate'
import { useNetworkStatus } from '@/ui/composables/useNetworkStatus'
import { usePwaInstall } from '@/ui/composables/usePwaInstall'
import { createNavigationItems } from '@/ui/router'
import { useRoute, useRouter } from '@/ui/router/runtime'

vi.mock('@/ui/router', () => ({
  createNavigationItems: vi.fn()
}))

vi.mock('@/ui/router/runtime', () => ({
  RouterLink: {
    props: ['to'],
    template: '<a :href="to"><slot /></a>'
  },
  RouterView: {
    template: '<div><slot :Component="null" /></div>'
  },
  useRoute: vi.fn(),
  useRouter: vi.fn()
}))

vi.mock('@/ui/composables/useNetworkStatus', () => ({
  useNetworkStatus: vi.fn()
}))

vi.mock('@/ui/composables/usePwaInstall', () => ({
  usePwaInstall: vi.fn()
}))

vi.mock('@/ui/composables/useAppUpdate', () => ({
  useAppUpdate: vi.fn()
}))

describe('AppShell', () => {
  let mockRouterPush: Mock
  let mockRouterBack: Mock

  beforeEach(() => {
    mockRouterPush = vi.fn()
    mockRouterBack = vi.fn()

    vi.mocked(useRoute).mockReturnValue({
      meta: {
        title: 'Członkowie'
      },
      path: '/',
      fullPath: '/'
    } as unknown as ReturnType<typeof useRoute>)

    vi.mocked(useRouter).mockReturnValue({
      push: mockRouterPush,
      back: mockRouterBack,
      replace: vi.fn(),
      forward: vi.fn(),
      go: vi.fn(),
      currentRoute: { value: {} } as unknown
    } as unknown as ReturnType<typeof useRouter>)

    vi.mocked(useNetworkStatus).mockImplementation(() => undefined)
    vi.mocked(usePwaInstall).mockReturnValue({
      promptInstall: vi.fn()
    })
    vi.mocked(useAppUpdate).mockReturnValue({
      refreshApplication: vi.fn()
    })
    vi.mocked(createNavigationItems).mockReturnValue([])
  })

  function mountShell() {
    return mount(AppShell, {
      global: {
        plugins: [createPinia()]
      }
    })
  }

  it('hides the debug menu entry when the router exposes no debug navigation', async () => {
    const wrapper = mountShell()

    await wrapper.find('button').trigger('click')

    expect(wrapper.text()).not.toContain('Debug IndexedDB')
    expect(wrapper.find('a[href="/debug/indexeddb"]').exists()).toBe(false)
  })

  it('renders the debug menu entry when the router exposes it', async () => {
    vi.mocked(createNavigationItems).mockReturnValue([
      {
        name: 'debug-indexeddb',
        label: 'Debug IndexedDB',
        to: '/debug/indexeddb'
      }
    ])

    const wrapper = mountShell()

    await wrapper.find('button').trigger('click')

    const debugLink = wrapper.find('a[href="/debug/indexeddb"]')

    expect(debugLink.exists()).toBe(true)
    expect(debugLink.text()).toContain('Debug IndexedDB')
  })
})
