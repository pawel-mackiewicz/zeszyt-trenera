import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { computed, nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import AppShell from '@/ui/components/AppShell.vue'
import { useAppUpdate } from '@/ui/composables/useAppUpdate'
import { useNetworkStatus } from '@/ui/composables/useNetworkStatus'
import { usePwaInstall } from '@/ui/composables/usePwaInstall'
import { createNavigationItems } from '@/ui/router'
import { useRoute, useRouter } from '@/ui/router/runtime'
import { useAppStore } from '@/ui/stores/app'

vi.mock('@/ui/router', () => ({
  createNavigationItems: vi.fn()
}))

vi.mock('@/ui/router/runtime', () => ({
  RouterLink: {
    props: ['to'],
    template: '<a :href="to"><slot /></a>'
  },
  RouterView: {
    template: '<div class="router-view-stub">Widok testowy</div>'
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
    window.localStorage.clear()
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
      promptInstall: vi.fn().mockResolvedValue(true),
      installInstructions: computed(() => null)
    })
    vi.mocked(useAppUpdate).mockReturnValue({
      refreshApplication: vi.fn()
    })
    vi.mocked(createNavigationItems).mockReturnValue([])
  })

  function mountShell(
    configureStore?: (store: ReturnType<typeof useAppStore>) => void
  ) {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useAppStore()

    configureStore?.(store)

    const wrapper = mount(AppShell, {
      global: {
        plugins: [pinia]
      }
    })

    return { wrapper, store }
  }

  function findButtonByText(wrapper: VueWrapper, text: string) {
    return wrapper
      .findAll('button')
      .find((buttonWrapper) => buttonWrapper.text().includes(text))
  }

  it('shows the startup gate until the app becomes ready', () => {
    const { wrapper } = mountShell()

    expect(wrapper.text()).toContain('Przygotowuję lokalny zeszyt')
    expect(wrapper.text()).not.toContain('Widok testowy')
  })

  it('auto-opens the install modal once when the ready shell becomes installable', () => {
    const { wrapper, store } = mountShell((appStore) => {
      appStore.setInstallSurface('native')
      appStore.setAppReady()
    })

    expect(wrapper.text()).toContain('Zainstaluj Zeszyt Trenera')
    expect(store.installModalShown).toBe(true)
  })

  it('opens the menu coach after the user postpones installation', async () => {
    const { wrapper } = mountShell((appStore) => {
      appStore.setInstallSurface('native')
      appStore.setAppReady()
    })

    await findButtonByText(wrapper, 'Później')?.trigger('click')

    expect(wrapper.text()).toContain('Tutaj wrócisz do instalacji')
    expect(wrapper.text()).toContain('Zainstaluj aplikację')
  })

  it('renders manual install steps when the browser has no native prompt', () => {
    vi.mocked(usePwaInstall).mockReturnValue({
      promptInstall: vi.fn().mockResolvedValue(false),
      installInstructions: computed(() => ({
        title: 'Dodaj do ekranu głównego',
        steps: [
          'Stuknij przycisk Udostępnij w Safari.',
          'Wybierz Do ekranu głównego.'
        ]
      }))
    })

    const { wrapper } = mountShell((appStore) => {
      appStore.setInstallSurface('manual')
      appStore.setAppReady()
    })

    expect(wrapper.text()).toContain('Dodaj do ekranu głównego')
    expect(wrapper.text()).toContain('Stuknij przycisk Udostępnij w Safari.')
  })

  it('waits until the shell is ready before showing the update modal', async () => {
    const { wrapper, store } = mountShell((appStore) => {
      appStore.setNeedRefresh(true)
    })

    expect(wrapper.text()).toContain('Przygotowuję lokalny zeszyt')
    expect(wrapper.text()).not.toContain('Nowa wersja Zeszytu Trenera czeka')

    // Keeping the update prompt behind readiness prevents service-worker state from obscuring bootstrap failures in the local-first shell.
    store.setAppReady()
    await nextTick()

    expect(wrapper.text()).toContain('Nowa wersja Zeszytu Trenera czeka')
    expect(wrapper.text()).toContain('Zaktualizuj teraz')
  })
})
