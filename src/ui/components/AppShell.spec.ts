import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { computed, nextTick, reactive, ref, type Ref } from 'vue'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import type { SetupStatus } from '@/read/ObserveSetupStatusQuery'
import { useAppServices } from '@/ui/appServices'
import AppShell from '@/ui/components/AppShell.vue'
import { useAppUpdate } from '@/ui/composables/useAppUpdate'
import { useNetworkStatus } from '@/ui/composables/useNetworkStatus'
import { usePwaInstall } from '@/ui/composables/usePwaInstall'
import { APP_LOCALE_STORAGE_KEY, createAppI18n } from '@/ui/i18n'
import { createNavigationItems } from '@/ui/router'
import { useRoute, useRouter } from '@/ui/router/runtime'
import { useAppStore } from '@/ui/stores/app'

type SetupStatusObserver = {
  next(value: SetupStatus): void
  error?(error: unknown): void
}

type MockRoute = {
  meta: Record<string, unknown>
  name: string
  path: string
  fullPath: string
}

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

vi.mock('@/ui/appServices', () => ({
  useAppServices: vi.fn()
}))

describe('AppShell', () => {
  let mockRouterPush: Mock
  let mockRouterBack: Mock
  let mockRouterReplace: Mock
  let mockNeedRefresh: Ref<boolean>
  let mockUpdatePending: Ref<boolean>
  let mockRefreshApplication: Mock
  let mockRoute: MockRoute
  let mockSetupStatusObservers: SetupStatusObserver[]
  let mockSetupStatus: SetupStatus
  let mockResetApplicationData: Mock

  beforeEach(() => {
    window.localStorage.clear()
    mockRouterPush = vi.fn()
    mockRouterBack = vi.fn()
    mockRouterReplace = vi.fn()
    mockNeedRefresh = ref(false)
    mockUpdatePending = ref(false)
    mockRefreshApplication = vi.fn().mockResolvedValue(undefined)
    mockResetApplicationData = vi.fn().mockResolvedValue(undefined)
    mockSetupStatusObservers = []
    mockSetupStatus = 'ready'

    mockRoute = reactive({
      meta: {},
      name: 'members-list',
      path: '/member',
      fullPath: '/member'
    }) as MockRoute

    vi.mocked(useRoute).mockReturnValue(
      mockRoute as unknown as ReturnType<typeof useRoute>
    )

    vi.mocked(useRouter).mockReturnValue({
      push: mockRouterPush,
      back: mockRouterBack,
      replace: mockRouterReplace,
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
    vi.mocked(useAppServices).mockReturnValue({
      queries: {
        observeSetupStatus: {
          handle: vi.fn(() => ({
            subscribe(observer: SetupStatusObserver) {
              mockSetupStatusObservers.push(observer)
              observer.next(mockSetupStatus)

              return {
                unsubscribe() {
                  mockSetupStatusObservers = mockSetupStatusObservers.filter(
                    (entry) => entry !== observer
                  )
                }
              }
            }
          }))
        }
      } as unknown,
      useCases: {
        resetApplicationData: {
          handle: mockResetApplicationData
        }
      } as unknown
    } as unknown as ReturnType<typeof useAppServices>)
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

  // What: verify each tab's surface and foreground together. Why: the active-route checks should fail if the red navbar tab ever loses its readable icon and label color again.
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

  async function emitSetupStatus(value: SetupStatus) {
    mockSetupStatus = value
    mockSetupStatusObservers.forEach((observer) => observer.next(value))
    await nextTick()
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

  it('replaces the current route with the club setup screen when setup data is missing', () => {
    mockSetupStatus = 'requires-club'

    const { wrapper } = mountShell((appStore) => {
      appStore.setAppReady()
    })

    expect(mockRouterReplace).toHaveBeenCalledWith('/setup/club')
    expect(wrapper.find('header').exists()).toBe(false)
    expect(wrapper.find('.router-view-stub').exists()).toBe(true)
  })

  it('moves the setup flow from club to trainer after the club record appears', async () => {
    mockSetupStatus = 'requires-club'

    mountShell((appStore) => {
      appStore.setAppReady()
    })

    await emitSetupStatus('requires-trainer')

    expect(mockRouterReplace).toHaveBeenLastCalledWith('/setup/trainer')
  })

  it('returns to the members route once setup becomes complete', async () => {
    mockSetupStatus = 'requires-trainer'
    mockRoute.name = 'setup-trainer'
    mockRoute.path = '/setup/trainer'
    mockRoute.fullPath = '/setup/trainer'

    mountShell((appStore) => {
      appStore.setAppReady()
    })

    await emitSetupStatus('ready')

    expect(mockRouterReplace).toHaveBeenCalledWith('/member')
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

  it('activates the members route title on the members screen', () => {
    const { wrapper } = mountShell((appStore) => {
      appStore.setAppReady()
    })

    expect(document.title).toBe('Członkowie • Zeszyt Trenera')
    expectBottomNavTabState(wrapper, '/member', true)
    expectBottomNavTabState(wrapper, '/payments', false)
    expectBottomNavTabState(wrapper, '/attendance', false)
  })

  it('activates the attendance route title on the history screen', () => {
    mockRoute.name = 'attendance-history'
    mockRoute.path = '/attendance'
    mockRoute.fullPath = '/attendance'

    const { wrapper } = mountShell((appStore) => {
      appStore.setAppReady()
    })

    expect(document.title).toBe('Historia treningów • Zeszyt Trenera')
    expectBottomNavTabState(wrapper, '/attendance', true)
    expectBottomNavTabState(wrapper, '/member', false)
    expectBottomNavTabState(wrapper, '/payments', false)
  })

  it('keeps the attendance tab active on the attendance edit screen', () => {
    mockRoute.name = 'attendance-edit'
    mockRoute.path = '/attendance/attendance-list-1/edit'
    mockRoute.fullPath = '/attendance/attendance-list-1/edit'

    const { wrapper } = mountShell((appStore) => {
      appStore.setAppReady()
    })

    expect(document.title).toBe('Edycja treningu • Zeszyt Trenera')
    expectBottomNavTabState(wrapper, '/attendance', true)
    expectBottomNavTabState(wrapper, '/member', false)
    expectBottomNavTabState(wrapper, '/payments', false)
  })

  it('activates the payments route title on the monthly ledger screen', () => {
    mockRoute.name = 'membership-payments'
    mockRoute.path = '/payments'
    mockRoute.fullPath = '/payments'

    const { wrapper } = mountShell((appStore) => {
      appStore.setAppReady()
    })

    expect(document.title).toBe('Płatności • Zeszyt Trenera')
    expectBottomNavTabState(wrapper, '/payments', true)
    expectBottomNavTabState(wrapper, '/member', false)
    expectBottomNavTabState(wrapper, '/attendance', false)
  })

  it('routes the bottom attendance tab straight to training history', () => {
    const { wrapper } = mountShell((appStore) => {
      appStore.setAppReady()
    })

    expect(wrapper.get('nav').classes()).not.toContain('md:hidden')
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
  })

  it('enables full reset for case-insensitive confirmation phrase', async () => {
    const { wrapper } = mountShell((appStore) => {
      appStore.setAppReady()
    })

    await wrapper.find('header button').trigger('click')
    await wrapper.get('[data-testid="open-reset-modal"]').trigger('click')

    const confirmButton = wrapper.get('[data-testid="confirm-reset-button"]')

    expect(confirmButton.attributes('disabled')).toBeDefined()

    await wrapper
      .get('[data-testid="reset-confirmation-input"]')
      .setValue('delete all data')
    await nextTick()

    expect(confirmButton.attributes('disabled')).toBeUndefined()
  })

  it('resets app data after explicit confirmation phrase and confirm click', async () => {
    const { wrapper } = mountShell((appStore) => {
      appStore.setAppReady()
    })

    await wrapper.find('header button').trigger('click')
    await wrapper.get('[data-testid="open-reset-modal"]').trigger('click')
    await wrapper
      .get('[data-testid="reset-confirmation-input"]')
      .setValue('DELETE ALL DATA')
    await wrapper.get('[data-testid="confirm-reset-button"]').trigger('click')

    expect(mockResetApplicationData).toHaveBeenCalledWith({
      confirmationPhrase: 'DELETE ALL DATA'
    })
    expect(wrapper.text()).not.toContain('Usuń wszystkie dane aplikacji')
  })
})
