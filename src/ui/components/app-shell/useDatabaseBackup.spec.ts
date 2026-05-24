import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { useAppServices } from '@/ui/appServices'
import { useDatabaseBackup } from '@/ui/components/app-shell/useDatabaseBackup'
import { createAppI18n } from '@/ui/i18n'
import { useShellStore } from '@/ui/stores/shell.store'

vi.mock('@/ui/appServices', () => ({
  useAppServices: vi.fn()
}))

function createDeferredPromise() {
  let resolve!: () => void

  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise
  })

  return {
    promise,
    resolve
  }
}

const DatabaseBackupProbe = defineComponent({
  setup(_, { expose }) {
    const backup = useDatabaseBackup()
    expose(backup)

    return backup
  },
  template: `
    <input
      ref="backupImportInput"
      data-testid="import-backup-input"
      type="file"
      @change="handleBackupImportSelection"
    />
    <button data-testid="open-import-picker" @click="openBackupImportPicker">
      open
    </button>
    <button data-testid="export-backup" @click="exportDatabaseBackup">
      export
    </button>
    <button
      data-testid="dismiss-export-error"
      @click="dismissBackupExportError"
    >
      dismiss export
    </button>
    <button
      data-testid="dismiss-import-error"
      @click="dismissBackupImportError"
    >
      dismiss import
    </button>
    <p v-if="backupExportErrorVisible" data-testid="export-error">
      {{ backupExportAlertMessage }}
    </p>
    <p v-if="backupImportErrorVisible" data-testid="import-error">
      import error
    </p>
  `
})

describe('useDatabaseBackup', () => {
  let mockImportDatabaseBackup: Mock
  let mockExportDatabaseBackup: Mock

  beforeEach(() => {
    setActivePinia(createPinia())
    mockImportDatabaseBackup = vi.fn().mockResolvedValue(undefined)
    mockExportDatabaseBackup = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useAppServices).mockReset()
    vi.mocked(useAppServices).mockReturnValue({
      queries: {} as never,
      useCases: {
        importDatabaseBackup: {
          handle: mockImportDatabaseBackup
        },
        exportDatabaseBackup: {
          handle: mockExportDatabaseBackup
        }
      } as never
    })
  })

  function mountDatabaseBackupProbe() {
    return mount(DatabaseBackupProbe, {
      global: {
        plugins: [createPinia(), createAppI18n('pl')]
      }
    })
  }

  function selectBackupFile(input: HTMLInputElement, backupFile: File) {
    Object.defineProperty(input, 'files', {
      value: [backupFile],
      configurable: true
    })
  }

  function spyOnExpectedConsoleError() {
    // What: silence intentionally exercised backup failure logs in composable specs. Why: passing `pnpm test` output should reserve stderr for unexpected failures while still verifying diagnostics.
    return vi.spyOn(console, 'error').mockImplementation(() => undefined)
  }

  it('opens the native import picker and closes the shell menu', async () => {
    const wrapper = mountDatabaseBackupProbe()
    const shellStore = useShellStore()
    const importInput = wrapper.get('[data-testid="import-backup-input"]')
      .element as HTMLInputElement
    const inputClickSpy = vi
      .spyOn(importInput, 'click')
      .mockImplementation(() => undefined)

    shellStore.openSidebar()

    await wrapper.get('[data-testid="open-import-picker"]').trigger('click')

    // What: assert the backup composable owns picker orchestration. Why: SidebarMenu should not need backup-specific DOM ref handling after the extraction.
    expect(inputClickSpy).toHaveBeenCalledTimes(1)
    expect(shellStore.sidebarOpen).toBe(false)
  })

  it('imports a selected backup through the application layer and reloads after success', async () => {
    const reloadSpy = vi
      .spyOn(window.location, 'reload')
      .mockImplementation(() => undefined)
    const wrapper = mountDatabaseBackupProbe()
    const backupFile = new File(['{"formatName":"dexie"}'], 'backup.json', {
      type: 'application/json'
    })
    const importInput = wrapper.get('[data-testid="import-backup-input"]')
      .element as HTMLInputElement

    selectBackupFile(importInput, backupFile)

    await wrapper.get('[data-testid="import-backup-input"]').trigger('change')
    await flushPromises()

    expect(mockImportDatabaseBackup).toHaveBeenCalledWith({
      backupFile
    })
    expect(importInput.value).toBe('')
    expect(reloadSpy).toHaveBeenCalledTimes(1)

    reloadSpy.mockRestore()
  })

  it('ignores import selections while a restore is already pending', async () => {
    const reloadSpy = vi
      .spyOn(window.location, 'reload')
      .mockImplementation(() => undefined)
    const deferredImport = createDeferredPromise()
    mockImportDatabaseBackup.mockReturnValueOnce(deferredImport.promise)
    const wrapper = mountDatabaseBackupProbe()
    const backupFile = new File(['{"formatName":"dexie"}'], 'backup.json', {
      type: 'application/json'
    })
    const importInput = wrapper.get('[data-testid="import-backup-input"]')
      .element as HTMLInputElement

    selectBackupFile(importInput, backupFile)

    await wrapper.get('[data-testid="import-backup-input"]').trigger('change')
    await nextTick()
    await wrapper.get('[data-testid="import-backup-input"]').trigger('change')

    // What: keep only one restore in flight. Why: import overwrites local-first data, so duplicate mobile taps must not start competing destructive workflows.
    expect(mockImportDatabaseBackup).toHaveBeenCalledTimes(1)

    deferredImport.resolve()
    await flushPromises()

    reloadSpy.mockRestore()
  })

  it('shows and dismisses import errors when restore fails', async () => {
    const restoreError = new Error('invalid backup')
    const consoleErrorSpy = spyOnExpectedConsoleError()
    const reloadSpy = vi
      .spyOn(window.location, 'reload')
      .mockImplementation(() => undefined)
    mockImportDatabaseBackup.mockRejectedValueOnce(restoreError)
    const wrapper = mountDatabaseBackupProbe()
    const backupFile = new File(['not-json'], 'backup.json', {
      type: 'application/json'
    })
    const importInput = wrapper.get('[data-testid="import-backup-input"]')
      .element as HTMLInputElement

    selectBackupFile(importInput, backupFile)

    await wrapper.get('[data-testid="import-backup-input"]').trigger('change')
    await flushPromises()

    expect(wrapper.find('[data-testid="import-error"]').exists()).toBe(true)
    expect(reloadSpy).not.toHaveBeenCalled()
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to import local database backup.',
      restoreError
    )

    await wrapper.get('[data-testid="dismiss-import-error"]').trigger('click')

    expect(wrapper.find('[data-testid="import-error"]').exists()).toBe(false)

    consoleErrorSpy.mockRestore()
    reloadSpy.mockRestore()
  })

  it('ignores empty import selections', async () => {
    const wrapper = mountDatabaseBackupProbe()

    await wrapper.get('[data-testid="import-backup-input"]').trigger('change')
    await flushPromises()

    expect(mockImportDatabaseBackup).not.toHaveBeenCalled()
  })

  it('exports a backup through the application layer and closes the shell menu', async () => {
    const wrapper = mountDatabaseBackupProbe()
    const shellStore = useShellStore()

    shellStore.openSidebar()

    await wrapper.get('[data-testid="export-backup"]').trigger('click')
    await flushPromises()

    expect(mockExportDatabaseBackup).toHaveBeenCalledWith({})
    expect(shellStore.sidebarOpen).toBe(false)
  })

  it('ignores export requests while a backup export is already pending', async () => {
    const deferredExport = createDeferredPromise()
    mockExportDatabaseBackup.mockReturnValueOnce(deferredExport.promise)
    const wrapper = mountDatabaseBackupProbe()

    await wrapper.get('[data-testid="export-backup"]').trigger('click')
    await nextTick()
    await wrapper.get('[data-testid="export-backup"]').trigger('click')

    // What: keep export delivery single-flight. Why: native share/download surfaces on mobile should not be opened twice from quick repeated taps.
    expect(mockExportDatabaseBackup).toHaveBeenCalledTimes(1)

    deferredExport.resolve()
    await flushPromises()
  })

  it('shows technical export details and lets the alert be dismissed', async () => {
    const backupError = new DOMException('Gesture required', 'NotAllowedError')
    const consoleErrorSpy = spyOnExpectedConsoleError()
    mockExportDatabaseBackup.mockRejectedValueOnce(backupError)
    const wrapper = mountDatabaseBackupProbe()

    await wrapper.get('[data-testid="export-backup"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="export-error"]').text()).toContain(
      'Szczegóły techniczne: NotAllowedError: Gesture required'
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to export local database backup.',
      backupError
    )

    await wrapper.get('[data-testid="dismiss-export-error"]').trigger('click')

    expect(wrapper.find('[data-testid="export-error"]').exists()).toBe(false)

    consoleErrorSpy.mockRestore()
  })
})
