import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { reactive } from 'vue'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import Header from '@/ui/components/app-shell/Header.vue'
import { createAppI18n } from '@/ui/i18n'
import { useRoute, useRouter } from '@/ui/router/runtime'
import { useAppStore } from '@/ui/stores/app'
import { useDemoStore } from '@/ui/features/demo/demo.store'
import { useShellStore } from '@/ui/stores/shell.store'

type MockRoute = {
  meta: Record<string, unknown>
  name: string
  path: string
  fullPath: string
}

vi.mock('@/ui/router/runtime', () => ({
  useRoute: vi.fn(),
  useRouter: vi.fn()
}))

describe('Header', () => {
  let mockRoute: MockRoute
  let mockRouterPush: Mock
  let mockRouterBack: Mock

  beforeEach(() => {
    mockRoute = reactive({
      meta: {},
      name: 'members-list',
      path: '/member',
      fullPath: '/member'
    }) as MockRoute
    mockRouterPush = vi.fn()
    mockRouterBack = vi.fn()

    vi.mocked(useRoute).mockReturnValue(
      mockRoute as unknown as ReturnType<typeof useRoute>
    )
    vi.mocked(useRouter).mockReturnValue({
      push: mockRouterPush,
      back: mockRouterBack,
      replace: vi.fn(),
      forward: vi.fn(),
      go: vi.fn(),
      currentRoute: { value: {} } as unknown
    } as unknown as ReturnType<typeof useRouter>)
  })

  function mountHeader(
    configureStores?: (
      appStore: ReturnType<typeof useAppStore>,
      demoStore: ReturnType<typeof useDemoStore>,
      shellStore: ReturnType<typeof useShellStore>
    ) => void
  ) {
    const pinia = createPinia()
    const i18n = createAppI18n('pl')
    setActivePinia(pinia)
    const appStore = useAppStore()
    const demoStore = useDemoStore()
    const shellStore = useShellStore()

    configureStores?.(appStore, demoStore, shellStore)

    const wrapper = mount(Header, {
      global: {
        plugins: [pinia, i18n]
      }
    })

    return { wrapper, appStore, demoStore, shellStore }
  }

  it('renders the localized route title and the menu trigger on top-level routes', () => {
    const { wrapper } = mountHeader()

    expect(wrapper.get('.app-shell-header__title').text()).toBe('Członkowie')
    expect(wrapper.find('[data-testid="shell-menu-button"]').exists()).toBe(
      true
    )
    expect(wrapper.find('[data-testid="shell-back-button"]').exists()).toBe(
      false
    )
  })

  it('shows the offline badge from the app store shell state', () => {
    const { wrapper } = mountHeader((appStore) => {
      appStore.setOnlineStatus(false)
    })

    expect(wrapper.text()).toContain('Offline')
  })

  it('uses the explicit back target when the route defines one', async () => {
    mockRoute.meta = {
      showBack: true,
      backTo: '/member'
    }

    const { wrapper } = mountHeader()

    await wrapper.get('[data-testid="shell-back-button"]').trigger('click')

    expect(mockRouterPush).toHaveBeenCalledWith('/member')
    expect(mockRouterBack).not.toHaveBeenCalled()
  })

  it('falls back to router.back when the route has no explicit target', async () => {
    mockRoute.meta = {
      showBack: true
    }

    const { wrapper } = mountHeader()

    await wrapper.get('[data-testid="shell-back-button"]').trigger('click')

    expect(mockRouterBack).toHaveBeenCalledTimes(1)
    expect(mockRouterPush).not.toHaveBeenCalled()
  })

  it('toggles the shared sidebar state from the header menu button', async () => {
    const { wrapper, shellStore } = mountHeader()

    await wrapper.get('[data-testid="shell-menu-button"]').trigger('click')
    expect(shellStore.sidebarOpen).toBe(true)

    await wrapper.get('[data-testid="shell-menu-button"]').trigger('click')
    expect(shellStore.sidebarOpen).toBe(false)
  })

  it('shows the demo exit action only in demo mode and lets the shared store open the modal', async () => {
    const { wrapper, demoStore } = mountHeader((_, demoStore) => {
      demoStore.setDemoModeActive(true)
    })

    expect(wrapper.find('[data-testid="open-demo-modal"]').exists()).toBe(true)

    await wrapper.get('[data-testid="open-demo-modal"]').trigger('click')

    expect(demoStore.demoIntroModalVisible).toBe(true)
  })
})
