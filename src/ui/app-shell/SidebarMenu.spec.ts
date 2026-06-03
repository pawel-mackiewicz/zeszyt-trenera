import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { APP_LOCALE_STORAGE_KEY } from '@/appStorageKeys'
import { useAppServices } from '@/ui/appServices'
import SidebarMenu from '@/ui/app-shell/SidebarMenu.vue'
import { useAppInstallStore } from '@/ui/features/app_install/app-install.store'
import { useAppResetStore } from '@/ui/features/app_reset/app-reset.store'
import { createAppI18n } from '@/ui/i18n'
import { createNavigationItems } from '@/ui/router'
import { useAppUpdateStore } from '@/ui/stores/app-update.store'
import { useShellStore } from '@/ui/stores/shell.store'

vi.mock('@/ui/router', () => ({
  createNavigationItems: vi.fn()
}))

vi.mock('@/ui/router/runtime', () => ({
  RouterLink: {
    emits: ['click'],
    props: ['to'],
    template: '<a :href="to" @click="$emit(\'click\')"><slot /></a>'
  }
}))

vi.mock('@/ui/appServices', () => ({
  useAppServices: vi.fn()
}))

describe('SidebarMenu', () => {
  let mockImportDatabaseBackup: Mock
  let mockExportDatabaseBackup: Mock

  beforeEach(() => {
    window.localStorage.clear()
    mockImportDatabaseBackup = vi.fn().mockResolvedValue(undefined)
    mockExportDatabaseBackup = vi.fn().mockResolvedValue(undefined)

    vi.mocked(createNavigationItems).mockReturnValue([
      {
        name: 'members-list',
        to: '/members'
      }
    ])
    vi.mocked(useAppServices).mockReturnValue({
      queries: {} as unknown,
      useCases: {
        importDatabaseBackup: {
          handle: mockImportDatabaseBackup
        },
        exportDatabaseBackup: {
          handle: mockExportDatabaseBackup
        }
      } as unknown
    } as unknown as ReturnType<typeof useAppServices>)
  })

  function mountSidebarMenu(
    configureStores?: (
      shellStore: ReturnType<typeof useShellStore>,
      appInstallStore: ReturnType<typeof useAppInstallStore>,
      appUpdateStore: ReturnType<typeof useAppUpdateStore>,
      appResetStore: ReturnType<typeof useAppResetStore>
    ) => void
  ) {
    const pinia = createPinia()
    const i18n = createAppI18n('pl')
    setActivePinia(pinia)
    const shellStore = useShellStore()
    const appInstallStore = useAppInstallStore()
    const appUpdateStore = useAppUpdateStore()
    const appResetStore = useAppResetStore()

    configureStores?.(
      shellStore,
      appInstallStore,
      appUpdateStore,
      appResetStore
    )

    const wrapper = mount(SidebarMenu, {
      global: {
        plugins: [pinia, i18n]
      }
    })

    return {
      wrapper,
      shellStore,
      appInstallStore,
      appUpdateStore,
      appResetStore
    }
  }

  function findButtonByText(wrapper: VueWrapper, text: string) {
    return wrapper
      .findAll('button')
      .find((buttonWrapper) => buttonWrapper.text().includes(text))
  }

  function openSidebar(shellStore: ReturnType<typeof useShellStore>) {
    // What: open the menu through the public shell store API. Why: SidebarMenu should be verified against the same header-driven contract used in the PWA shell.
    shellStore.openSidebar()
  }

  function spyOnExpectedConsoleError() {
    // What: silence intentionally exercised sidebar failure logs in component specs. Why: passing `pnpm test` output should reserve stderr for unexpected failures while still verifying diagnostics.
    return vi.spyOn(console, 'error').mockImplementation(() => undefined)
  }

  it('renders only when the shared sidebar state is open', async () => {
    const { wrapper, shellStore } = mountSidebarMenu()

    expect(wrapper.find('[data-testid="shell-sidebar"]').exists()).toBe(false)

    openSidebar(shellStore)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-testid="shell-sidebar"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Zeszyt Trenera')
    expect(wrapper.text()).toMatch(/v\d+\.\d+\.\d+/)
  })

  it('closes when a navigation link is selected', async () => {
    const { wrapper, shellStore } = mountSidebarMenu((nextShellStore) => {
      openSidebar(nextShellStore)
    })

    await wrapper.get('a[href="/members"]').trigger('click')

    expect(shellStore.sidebarOpen).toBe(false)
  })

  it('switches locale and persists the choice locally', async () => {
    const { wrapper, shellStore } = mountSidebarMenu((nextShellStore) => {
      openSidebar(nextShellStore)
    })

    await wrapper.get('[data-testid="locale-en"]').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Language')
    expect(window.localStorage.getItem(APP_LOCALE_STORAGE_KEY)).toBe('en')
    expect(shellStore.sidebarOpen).toBe(true)
  })

  it('opens the install modal from the sidebar action', async () => {
    const { wrapper, shellStore, appInstallStore } = mountSidebarMenu(
      (nextShellStore, nextInstallStore) => {
        nextInstallStore.setInstallSurface('native')
        openSidebar(nextShellStore)
      }
    )

    await findButtonByText(wrapper, 'Zainstaluj aplikację')?.trigger('click')

    expect(appInstallStore.installModalVisible).toBe(true)
    expect(shellStore.sidebarOpen).toBe(false)
  })

  it('activates an available update from the sidebar action', async () => {
    const { wrapper, shellStore, appUpdateStore } = mountSidebarMenu(
      (nextShellStore, _installStore, nextUpdateStore) => {
        nextUpdateStore.updateAvailable = true
        openSidebar(nextShellStore)
      }
    )
    const activateUpdateSpy = vi
      .spyOn(appUpdateStore, 'activateWaitingUpdate')
      .mockResolvedValue(undefined)

    await findButtonByText(wrapper, 'Aktualizuj aplikację')?.trigger('click')

    expect(activateUpdateSpy).toHaveBeenCalledTimes(1)
    expect(shellStore.sidebarOpen).toBe(false)
  })

  it('exports a local backup through the application layer', async () => {
    const { wrapper, shellStore } = mountSidebarMenu((nextShellStore) => {
      openSidebar(nextShellStore)
    })

    await wrapper.get('[data-testid="export-backup-button"]').trigger('click')
    await flushPromises()

    expect(mockExportDatabaseBackup).toHaveBeenCalledWith({})
    expect(shellStore.sidebarOpen).toBe(false)
  })

  it('shows the floating backup error when backup export fails', async () => {
    const backupError = new DOMException('Gesture required', 'NotAllowedError')
    const consoleErrorSpy = spyOnExpectedConsoleError()
    mockExportDatabaseBackup.mockRejectedValueOnce(backupError)
    const { wrapper } = mountSidebarMenu((nextShellStore) => {
      openSidebar(nextShellStore)
    })

    await wrapper.get('[data-testid="export-backup-button"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain(
      'Szczegóły techniczne: NotAllowedError: Gesture required'
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to export local database backup.',
      backupError
    )

    consoleErrorSpy.mockRestore()
  })

  it('opens the native file picker from the backup import action', async () => {
    const { wrapper, shellStore } = mountSidebarMenu((nextShellStore) => {
      openSidebar(nextShellStore)
    })
    const importInput = wrapper.get('[data-testid="import-backup-input"]')
      .element as HTMLInputElement
    const inputClickSpy = vi
      .spyOn(importInput, 'click')
      .mockImplementation(() => undefined)

    await wrapper.get('[data-testid="import-backup-button"]').trigger('click')

    expect(inputClickSpy).toHaveBeenCalledTimes(1)
    expect(shellStore.sidebarOpen).toBe(false)
  })

  it('imports a selected backup file through the application layer and reloads on success', async () => {
    const reloadSpy = vi
      .spyOn(window.location, 'reload')
      .mockImplementation(() => undefined)
    const { wrapper } = mountSidebarMenu()
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

  it('opens reset confirmation from the sidebar action', async () => {
    const { wrapper, shellStore, appResetStore } = mountSidebarMenu(
      (nextShellStore) => {
        openSidebar(nextShellStore)
      }
    )

    await wrapper.get('[data-testid="open-reset-modal"]').trigger('click')

    expect(appResetStore.resetModalVisible).toBe(true)
    expect(shellStore.sidebarOpen).toBe(false)
  })
})
