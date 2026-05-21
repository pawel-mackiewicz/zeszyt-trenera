import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { computed, nextTick, reactive, ref, type Ref } from 'vue'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { APP_LOCALE_STORAGE_KEY } from '@/appStorageKeys'
import type { SetupStatus } from '@/read/ObserveSetupStatusQuery'
import { useAppServices } from '@/ui/appServices'
import AppShell from '@/ui/components/AppShell.vue'
import { useAppUpdate } from '@/ui/composables/useAppUpdate'
import { useNetworkStatus } from '@/ui/composables/useNetworkStatus'
import { usePwaInstall } from '@/ui/composables/usePwaInstall'
import { createAppI18n } from '@/ui/i18n'
import { createNavigationItems } from '@/ui/router'
import { useRoute, useRouter } from '@/ui/router/runtime'
import { useAppStore } from '@/ui/stores/app'
import { useDemoStore } from '@/ui/features/demo/demo.store'
import { useShellStore } from '@/ui/stores/shell.store'

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
  let mockImportDatabaseBackup: Mock
  let mockExportDatabaseBackup: Mock
  let mockResetApplicationData: Mock
  let mockLeaveDemoMode: Mock

  beforeEach(() => {
    window.localStorage.clear()
    mockRouterPush = vi.fn()
    mockRouterBack = vi.fn()
    mockRouterReplace = vi.fn()
    mockNeedRefresh = ref(false)
    mockUpdatePending = ref(false)
    mockRefreshApplication = vi.fn().mockResolvedValue(undefined)
    mockImportDatabaseBackup = vi.fn().mockResolvedValue(undefined)
    mockExportDatabaseBackup = vi.fn().mockResolvedValue(undefined)
    mockResetApplicationData = vi.fn().mockResolvedValue(undefined)
    mockLeaveDemoMode = vi.fn().mockResolvedValue(undefined)
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
        importDatabaseBackup: {
          handle: mockImportDatabaseBackup
        },
        exportDatabaseBackup: {
          handle: mockExportDatabaseBackup
        },
        leaveDemoMode: {
          handle: mockLeaveDemoMode
        },
        resetApplicationData: {
          handle: mockResetApplicationData
        }
      } as unknown
    } as unknown as ReturnType<typeof useAppServices>)
    vi.mocked(createNavigationItems).mockReturnValue([])
  })

  function mountShell(
    configureStore?: (
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

    configureStore?.(appStore, demoStore, shellStore)

    const wrapper = mount(AppShell, {
      global: {
        plugins: [pinia, i18n]
      }
    })

    return { wrapper, store: appStore, demoStore, shellStore }
  }

  function findButtonByText(wrapper: VueWrapper, text: string) {
    return wrapper
      .findAll('button')
      .find((buttonWrapper) => buttonWrapper.text().includes(text))
  }

  function getShellMenuButton(wrapper: VueWrapper) {
    return wrapper.get('[data-testid="shell-menu-button"]')
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

  it('keeps the install modal hidden while demo mode is active', async () => {
    const { wrapper } = mountShell((appStore, demoStore) => {
      appStore.setInstallSurface('native')
      demoStore.setDemoModeActive(true)
      appStore.setAppReady()
    })

    expect(wrapper.text()).not.toContain('Zainstaluj Zeszyt Trenera')

    await getShellMenuButton(wrapper).trigger('click')

    // What: assert the menu action disappears together with the modal trigger path. Why: hiding only the modal would leave a dead-end install CTA inside the demo shell.
    expect(wrapper.text()).not.toContain('Zainstaluj aplikację')
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

    await getShellMenuButton(wrapper).trigger('click')

    // The shell should show the current build version without forcing this spec to change on every release bump.
    expect(wrapper.text()).toMatch(/v\d+\.\d+\.\d+/)
    expect(wrapper.text()).not.toContain('Aktualizuj aplikację')
    expect(wrapper.text()).not.toContain('Zaktualizuj teraz')

    mockNeedRefresh.value = true
    await nextTick()

    expect(wrapper.text()).toContain('Aktualizuj aplikację')
    expect(wrapper.text()).not.toContain('Zaktualizuj teraz')
  })

  it('shows the demo exit CTA in the header only while demo mode is active', async () => {
    const { wrapper, demoStore } = mountShell((appStore, nextDemoStore) => {
      appStore.setAppReady()
      nextDemoStore.setDemoModeActive(true)
    })

    expect(wrapper.get('[data-testid="open-demo-modal"]').text()).toContain(
      'Wyjdź z demo'
    )
    expect(demoStore.demoIntroModalVisible).toBe(false)

    await wrapper.get('[data-testid="open-demo-modal"]').trigger('click')

    // What: assert Header opens the manager-owned demo modal through shared shell state. Why: modal markup and button variants are covered elsewhere, so this integration spec stays focused on the shell-level integration boundary.
    expect(demoStore.demoIntroModalVisible).toBe(true)
  })

  it('keeps demo exploration as the default modal action', async () => {
    const { wrapper, demoStore } = mountShell((appStore, nextDemoStore) => {
      appStore.setAppReady()
      nextDemoStore.setDemoModeActive(true)
      nextDemoStore.showDemoIntroModal()
    })

    await wrapper.get('[data-testid="continue-demo-button"]').trigger('click')

    expect(mockLeaveDemoMode).not.toHaveBeenCalled()
    expect(demoStore.demoIntroModalVisible).toBe(false)
  })

  it('leaves demo mode through the application layer and closes the modal', async () => {
    const { wrapper, demoStore } = mountShell((appStore, nextDemoStore) => {
      appStore.setAppReady()
      nextDemoStore.setDemoModeActive(true)
      nextDemoStore.showDemoIntroModal()
    })

    await wrapper
      .get('[data-testid="confirm-leave-demo-button"]')
      .trigger('click')
    await flushPromises()

    expect(mockLeaveDemoMode).toHaveBeenCalledWith({})
    expect(demoStore.demoModeActive).toBe(false)
    expect(demoStore.demoIntroModalVisible).toBe(false)
  })

  it('keeps demo-exit failures visible above the modal', async () => {
    mockLeaveDemoMode.mockRejectedValueOnce(new Error('leave demo failed'))

    const { wrapper, demoStore } = mountShell((appStore, nextDemoStore) => {
      appStore.setAppReady()
      nextDemoStore.setDemoModeActive(true)
      nextDemoStore.showDemoIntroModal()
    })

    await wrapper
      .get('[data-testid="confirm-leave-demo-button"]')
      .trigger('click')
    await flushPromises()

    expect(wrapper.get('.floating-error-alert--modal').text()).toContain(
      'Nie udało się wyjść z trybu demo. Spróbuj ponownie.'
    )
    expect(demoStore.demoModeActive).toBe(true)
    expect(demoStore.demoIntroModalVisible).toBe(true)
  })

  it('disables the menu update action while the new shell is activating', async () => {
    mockNeedRefresh.value = true
    mockUpdatePending.value = true

    const { wrapper } = mountShell((appStore) => {
      appStore.setAppReady()
    })

    await getShellMenuButton(wrapper).trigger('click')

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

    const { wrapper, shellStore } = mountShell((appStore) => {
      appStore.setAppReady()
    })

    await getShellMenuButton(wrapper).trigger('click')
    await findButtonByText(wrapper, 'Aktualizuj aplikację')?.trigger('click')

    expect(mockRefreshApplication).toHaveBeenCalledTimes(1)
    expect(shellStore.drawerOpen).toBe(false)
    expect(wrapper.text()).not.toContain('Zaktualizuj teraz')
  })

  it('renders the drawer from the shared shell store state', () => {
    const { wrapper } = mountShell((appStore, _demoStore, shellStore) => {
      appStore.setAppReady()
      shellStore.openDrawer()
    })

    expect(wrapper.find('[data-testid="export-backup-button"]').exists()).toBe(
      true
    )
    expect(wrapper.text()).toMatch(/v\d+\.\d+\.\d+/)
  })

  it('closes the shared drawer after route changes', async () => {
    const { shellStore } = mountShell(
      (appStore, _demoStore, nextShellStore) => {
        appStore.setAppReady()
        nextShellStore.openDrawer()
      }
    )

    expect(shellStore.drawerOpen).toBe(true)

    mockRoute.fullPath = '/payments'
    await nextTick()

    expect(shellStore.drawerOpen).toBe(false)
  })

  it('exports a local backup from the menu through the application layer', async () => {
    const { wrapper, shellStore } = mountShell((appStore) => {
      appStore.setAppReady()
    })

    await getShellMenuButton(wrapper).trigger('click')
    await wrapper.get('[data-testid="export-backup-button"]').trigger('click')
    await flushPromises()

    expect(mockExportDatabaseBackup).toHaveBeenCalledWith({})
    expect(shellStore.drawerOpen).toBe(false)
  })

  it('shows pending backup copy while export is in progress', async () => {
    let resolveBackupExport:
      | ((value?: void | PromiseLike<void>) => void)
      | undefined

    mockExportDatabaseBackup.mockImplementationOnce(
      async () =>
        await new Promise<void>((resolve) => {
          resolveBackupExport = resolve
        })
    )

    const { wrapper } = mountShell((appStore) => {
      appStore.setAppReady()
    })

    await getShellMenuButton(wrapper).trigger('click')
    await wrapper.get('[data-testid="export-backup-button"]').trigger('click')
    await getShellMenuButton(wrapper).trigger('click')
    await nextTick()

    expect(wrapper.text()).toContain('Eksportowanie kopii...')
    expect(
      wrapper.get('[data-testid="export-backup-button"]').attributes('disabled')
    ).toBeDefined()

    resolveBackupExport?.()
    await flushPromises()
  })

  it('shows the floating backup error when backup export fails', async () => {
    mockExportDatabaseBackup.mockRejectedValueOnce(new Error('backup failed'))

    const { wrapper } = mountShell((appStore) => {
      appStore.setAppReady()
    })

    await getShellMenuButton(wrapper).trigger('click')
    await wrapper.get('[data-testid="export-backup-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain(
      'Nie udało się wyeksportować kopii danych. Spróbuj ponownie.'
    )
  })

  it('shows technical backup-export details when the workflow throws a browser error', async () => {
    mockExportDatabaseBackup.mockRejectedValueOnce(
      new DOMException('Gesture required', 'NotAllowedError')
    )

    const { wrapper } = mountShell((appStore) => {
      appStore.setAppReady()
    })

    await getShellMenuButton(wrapper).trigger('click')
    await wrapper.get('[data-testid="export-backup-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain(
      'Szczegóły techniczne: NotAllowedError: Gesture required'
    )
  })

  it('opens the native file picker from the backup import menu action', async () => {
    const { wrapper, shellStore } = mountShell((appStore) => {
      appStore.setAppReady()
    })

    await getShellMenuButton(wrapper).trigger('click')

    const importInput = wrapper.get('[data-testid="import-backup-input"]')
      .element as HTMLInputElement
    const inputClickSpy = vi
      .spyOn(importInput, 'click')
      .mockImplementation(() => undefined)

    await wrapper.get('[data-testid="import-backup-button"]').trigger('click')

    // What: verify the menu action delegates to the hidden native input click. Why: restore should rely on the browser picker instead of a custom upload surface.
    expect(inputClickSpy).toHaveBeenCalledTimes(1)
    expect(shellStore.drawerOpen).toBe(false)
  })

  it('imports a selected backup file through the application layer and reloads on success', async () => {
    const reloadSpy = vi
      .spyOn(window.location, 'reload')
      .mockImplementation(() => undefined)
    const { wrapper } = mountShell((appStore) => {
      appStore.setAppReady()
    })
    const backupFile = new File(['{"formatName":"dexie"}'], 'backup.json', {
      type: 'application/json'
    })
    const importInput = wrapper.get('[data-testid="import-backup-input"]')
      .element as HTMLInputElement

    Object.defineProperty(importInput, 'files', {
      value: [backupFile],
      configurable: true
    })

    await wrapper.get('[data-testid="import-backup-input"]').trigger('change')
    await flushPromises()

    expect(mockImportDatabaseBackup).toHaveBeenCalledWith({
      backupFile
    })
    expect(reloadSpy).toHaveBeenCalledTimes(1)

    reloadSpy.mockRestore()
  })

  it('shows the floating backup import error when restore fails', async () => {
    mockImportDatabaseBackup.mockRejectedValueOnce(new Error('import failed'))
    const reloadSpy = vi
      .spyOn(window.location, 'reload')
      .mockImplementation(() => undefined)
    const { wrapper } = mountShell((appStore) => {
      appStore.setAppReady()
    })
    const backupFile = new File(['{"formatName":"dexie"}'], 'backup.json', {
      type: 'application/json'
    })
    const importInput = wrapper.get('[data-testid="import-backup-input"]')
      .element as HTMLInputElement

    Object.defineProperty(importInput, 'files', {
      value: [backupFile],
      configurable: true
    })

    await wrapper.get('[data-testid="import-backup-input"]').trigger('change')
    await flushPromises()

    expect(wrapper.text()).toContain(
      'Nie udało się przywrócić kopii danych. Sprawdź plik i spróbuj ponownie.'
    )
    expect(reloadSpy).not.toHaveBeenCalled()

    reloadSpy.mockRestore()
  })

  it('switches locale from the hamburger menu and persists the choice locally', async () => {
    const { wrapper } = mountShell((appStore) => {
      appStore.setAppReady()
    })

    expect(document.title).toBe('Członkowie • Zeszyt Trenera')

    await getShellMenuButton(wrapper).trigger('click')
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
    // What: keep AppShell coverage at the shell composition boundary. Why: BottomNavigation owns detailed route-active tab behavior after extraction.
    expect(wrapper.find('[data-testid="bottom-navigation"]').exists()).toBe(
      true
    )
  })

  it('activates the attendance route title on the history screen', () => {
    mockRoute.name = 'attendance-history'
    mockRoute.path = '/attendance'
    mockRoute.fullPath = '/attendance'

    mountShell((appStore) => {
      appStore.setAppReady()
    })

    expect(document.title).toBe('Historia treningów • Zeszyt Trenera')
  })

  it('activates the attendance edit route title', () => {
    mockRoute.name = 'attendance-edit'
    mockRoute.path = '/attendance/attendance-list-1/edit'
    mockRoute.fullPath = '/attendance/attendance-list-1/edit'

    mountShell((appStore) => {
      appStore.setAppReady()
    })

    expect(document.title).toBe('Edycja treningu • Zeszyt Trenera')
  })

  it('activates the payments route title on the monthly ledger screen', () => {
    mockRoute.name = 'membership-payments'
    mockRoute.path = '/payments'
    mockRoute.fullPath = '/payments'

    mountShell((appStore) => {
      appStore.setAppReady()
    })

    expect(document.title).toBe('Płatności • Zeszyt Trenera')
  })

  it('enables full reset for case-insensitive confirmation phrase', async () => {
    const { wrapper, shellStore } = mountShell((appStore) => {
      appStore.setAppReady()
    })

    await getShellMenuButton(wrapper).trigger('click')
    await wrapper.get('[data-testid="open-reset-modal"]').trigger('click')

    const confirmButton = wrapper.get('[data-testid="confirm-reset-button"]')

    expect(confirmButton.attributes('disabled')).toBeDefined()
    expect(shellStore.drawerOpen).toBe(false)

    await wrapper
      .get('[data-testid="reset-confirmation-input"]')
      .setValue('delete all data')
    await nextTick()

    expect(confirmButton.attributes('disabled')).toBeUndefined()
  })

  it('keeps the generic reset action visible while demo mode is active', async () => {
    const { wrapper } = mountShell((appStore, demoStore) => {
      appStore.setAppReady()
      demoStore.setDemoModeActive(true)
    })

    await getShellMenuButton(wrapper).trigger('click')

    expect(wrapper.find('[data-testid="open-reset-modal"]').exists()).toBe(true)
  })

  it('resets app data after explicit confirmation phrase and confirm click', async () => {
    const reloadSpy = vi
      .spyOn(window.location, 'reload')
      .mockImplementation(() => undefined)
    const { wrapper } = mountShell((appStore) => {
      appStore.setAppReady()
    })

    await getShellMenuButton(wrapper).trigger('click')
    await wrapper.get('[data-testid="open-reset-modal"]').trigger('click')
    await wrapper
      .get('[data-testid="reset-confirmation-input"]')
      .setValue('DELETE ALL DATA')
    await wrapper.get('[data-testid="confirm-reset-button"]').trigger('click')
    await flushPromises()
    await nextTick()

    expect(mockResetApplicationData).toHaveBeenCalledWith({
      confirmationPhrase: 'DELETE ALL DATA'
    })
    // What: keep this shell assertion on orchestration side effects only. Why: modal hide timing now belongs to reset modal/composable unit specs after extraction from AppShell markup.
    expect(reloadSpy).toHaveBeenCalledTimes(1)

    reloadSpy.mockRestore()
  })

  it('keeps reset failures visible above the confirmation modal', async () => {
    mockResetApplicationData.mockRejectedValueOnce(new Error('reset failed'))
    const reloadSpy = vi
      .spyOn(window.location, 'reload')
      .mockImplementation(() => undefined)

    const { wrapper } = mountShell((appStore) => {
      appStore.setAppReady()
    })

    await getShellMenuButton(wrapper).trigger('click')
    await wrapper.get('[data-testid="open-reset-modal"]').trigger('click')
    await wrapper
      .get('[data-testid="reset-confirmation-input"]')
      .setValue('DELETE ALL DATA')
    await wrapper.get('[data-testid="confirm-reset-button"]').trigger('click')
    await flushPromises()

    // What: assert the failed reset still renders the shared alert in the modal-safe layer. Why: the destructive confirmation dialog stays open on failure, so the recovery copy cannot hide behind the overlay.
    const resetErrorAlert = wrapper.get('.floating-error-alert--modal')

    expect(wrapper.text()).toContain('Usuń wszystkie dane aplikacji')
    expect(resetErrorAlert.text()).toContain(
      'Nie udało się wyczyścić danych. Spróbuj ponownie.'
    )
    expect(reloadSpy).not.toHaveBeenCalled()

    reloadSpy.mockRestore()
  })
})
