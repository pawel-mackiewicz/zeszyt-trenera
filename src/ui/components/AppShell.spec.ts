import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { computed, nextTick, ref, type Ref } from 'vue'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import AppShell from '@/ui/components/AppShell.vue'
import { useAppUpdate } from '@/ui/composables/useAppUpdate'
import { useNetworkStatus } from '@/ui/composables/useNetworkStatus'
import { usePwaInstall } from '@/ui/composables/usePwaInstall'
import { APP_LOCALE_STORAGE_KEY, createAppI18n } from '@/ui/i18n'
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
  let mockNeedRefresh: Ref<boolean>
  let mockUpdatePending: Ref<boolean>
  let mockRefreshApplication: Mock

  beforeEach(() => {
    window.localStorage.clear()
    mockRouterPush = vi.fn()
    mockRouterBack = vi.fn()
    mockNeedRefresh = ref(false)
    mockUpdatePending = ref(false)
    mockRefreshApplication = vi.fn().mockResolvedValue(undefined)

    vi.mocked(useRoute).mockReturnValue({
      meta: {},
      name: 'members-list',
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
      manualInstallVariant: computed(() => null)
    })
    vi.mocked(useAppUpdate).mockReturnValue({
      needRefresh: mockNeedRefresh,
      updatePending: mockUpdatePending,
      refreshApplication: mockRefreshApplication
    })
    vi.mocked(createNavigationItems).mockReturnValue([])
  })

  function mountShell(
    configureStore?: (store: ReturnType<typeof useAppStore>) => void
  ) {
    const pinia = createPinia()
    const i18n = createAppI18n('pl')
    setActivePinia(pinia)
    const store = useAppStore()

    configureStore?.(store)

    const wrapper = mount(AppShell, {
      global: {
        plugins: [pinia, i18n]
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

  it('dismisses the install modal when the user postpones installation', async () => {
    const { wrapper, store } = mountShell((appStore) => {
      appStore.setInstallSurface('native')
      appStore.setAppReady()
    })

    await findButtonByText(wrapper, 'Później')?.trigger('click')
    await nextTick()

    expect(store.installModalVisible).toBe(false)
    expect(store.showInstallEntry).toBe(true)
  })

  it('renders manual install steps when the browser has no native prompt', () => {
    vi.mocked(usePwaInstall).mockReturnValue({
      promptInstall: vi.fn().mockResolvedValue(false),
      manualInstallVariant: computed(() => 'iosSafari')
    })

    const { wrapper } = mountShell((appStore) => {
      appStore.setInstallSurface('manual')
      appStore.setAppReady()
    })

    expect(wrapper.text()).toContain('Dodaj do ekranu głównego')
    expect(wrapper.text()).toContain('Stuknij przycisk Udostępnij w Safari.')
  })

  it('shows the menu update action only when a new shell is ready to activate', async () => {
    const { wrapper } = mountShell((appStore) => {
      appStore.setAppReady()
    })

    await wrapper.find('header button').trigger('click')

    // The shell should show the current build version without forcing this spec to change on every release bump.
    expect(wrapper.text()).toMatch(/v\d+\.\d+\.\d+/)
    expect(wrapper.text()).not.toContain('Aktualizuj aplikację')
    expect(wrapper.text()).not.toContain('Zaktualizuj teraz')

    mockNeedRefresh.value = true
    await nextTick()

    expect(wrapper.text()).toContain('Aktualizuj aplikację')
    expect(wrapper.text()).not.toContain('Zaktualizuj teraz')
  })

  it('disables the menu update action while the new shell is activating', async () => {
    mockNeedRefresh.value = true
    mockUpdatePending.value = true

    const { wrapper } = mountShell((appStore) => {
      appStore.setAppReady()
    })

    await wrapper.find('header button').trigger('click')

    const updateButton = findButtonByText(wrapper, 'Odświeżanie...')

    expect(updateButton?.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Odświeżanie...')
  })

  it('renders the localized update error banner from the shell dictionary', async () => {
    const { wrapper, store } = mountShell((appStore) => {
      appStore.setAppReady()
      appStore.setUpdateError({
        kind: 'activation'
      })
    })

    await nextTick()

    expect(wrapper.text()).toContain('Tryb offline wymaga uwagi')
    expect(wrapper.text()).toContain(
      'Nie udało się włączyć najnowszej wersji aplikacji. Zamknij ją i otwórz ponownie.'
    )
    expect(store.updateError).toEqual({
      kind: 'activation'
    })
  })

  it('renders the blocking startup copy from the shell dictionary', () => {
    const { wrapper } = mountShell((appStore) => {
      appStore.blockApplication('database')
    })

    expect(wrapper.text()).toContain('Stan aplikacji')
    expect(wrapper.text()).toContain('Nie udało się uruchomić Zeszytu Trenera')
    expect(wrapper.text()).toContain(
      'Nie udało się otworzyć zeszytu na tym urządzeniu.'
    )
  })

  it('activates the waiting shell from the hamburger menu without restoring the modal', async () => {
    mockNeedRefresh.value = true

    const { wrapper } = mountShell((appStore) => {
      appStore.setAppReady()
    })

    await wrapper.find('header button').trigger('click')
    await findButtonByText(wrapper, 'Aktualizuj aplikację')?.trigger('click')

    expect(mockRefreshApplication).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).not.toContain('Zaktualizuj teraz')
  })

  it('switches locale from the hamburger menu and persists the choice locally', async () => {
    const { wrapper } = mountShell((appStore) => {
      appStore.setAppReady()
    })

    expect(document.title).toBe('Członkowie • Zeszyt Trenera')

    await wrapper.find('header button').trigger('click')
    await wrapper.get('[data-testid="locale-en"]').trigger('click')
    await nextTick()

    expect(wrapper.text()).toContain('Language')
    expect(document.title).toBe('Members • Coach Notebook')
    expect(window.localStorage.getItem(APP_LOCALE_STORAGE_KEY)).toBe('en')
  })
})
