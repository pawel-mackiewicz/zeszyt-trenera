import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { ResetDataModalStatus } from '@/ui/features/app_reset/ResetDataModal.contract'
import { useAppServices } from '@/ui/appServices'
import { useAppStore } from '@/ui/stores/app'
import { useAppResetStore } from '@/ui/features/app_reset/app-reset.store'

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

function prepareReadyShell() {
  const appStore = useAppStore()

  appStore.setAppReady()
  appStore.setSetupStatus('ready')
}

describe('useAppResetStore', () => {
  let resetApplicationData: Mock

  beforeEach(() => {
    setActivePinia(createPinia())
    resetApplicationData = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useAppServices).mockReset()
    vi.mocked(useAppServices).mockReturnValue({
      queries: {} as never,
      useCases: {
        resetApplicationData: {
          handle: resetApplicationData
        }
      } as never
    })
    prepareReadyShell()
  })

  it('opens and closes modal state', () => {
    const store = useAppResetStore()

    expect(store.resetModalStatus).toBe(ResetDataModalStatus.Hidden)

    store.openResetModal()
    expect(store.resetModalStatus).toBe(ResetDataModalStatus.Ready)

    store.setResetConfirmationInput('DELETE ALL DATA')
    store.closeResetModal()

    expect(store.resetModalStatus).toBe(ResetDataModalStatus.Hidden)
    expect(store.resetConfirmationInput).toBe('')
  })

  it('validates the confirmation phrase case-insensitively', () => {
    const store = useAppResetStore()

    store.openResetModal()
    store.setResetConfirmationInput('delete all data')

    expect(store.isResetConfirmationValid).toBe(true)

    store.setResetConfirmationInput('delete all member data')

    expect(store.isResetConfirmationValid).toBe(false)
  })

  it('blocks close while reset is pending', async () => {
    const reloadSpy = vi
      .spyOn(window.location, 'reload')
      .mockImplementation(() => undefined)
    const deferredReset = createDeferredPromise()
    resetApplicationData.mockReturnValueOnce(deferredReset.promise)
    const store = useAppResetStore()

    store.openResetModal()
    store.setResetConfirmationInput('DELETE ALL DATA')
    const confirmPromise = store.confirmResetApplicationData()
    await nextTick()

    store.closeResetModal()

    // What: verify pending reset stays visible. Why: destructive application-layer writes should not be hidden while they are still settling.
    expect(store.resetModalStatus).toBe(ResetDataModalStatus.Pending)

    deferredReset.resolve()
    await confirmPromise

    reloadSpy.mockRestore()
  })

  it('calls resetApplicationData.handle through the application layer', async () => {
    const reloadSpy = vi
      .spyOn(window.location, 'reload')
      .mockImplementation(() => undefined)
    const store = useAppResetStore()

    store.openResetModal()
    store.setResetConfirmationInput('DELETE ALL DATA')
    await store.confirmResetApplicationData()

    expect(resetApplicationData).toHaveBeenCalledWith({
      confirmationPhrase: 'DELETE ALL DATA'
    })

    reloadSpy.mockRestore()
  })

  it('reloads after successful reset', async () => {
    const reloadSpy = vi
      .spyOn(window.location, 'reload')
      .mockImplementation(() => undefined)
    const store = useAppResetStore()

    store.openResetModal()
    store.setResetConfirmationInput('DELETE ALL DATA')
    await store.confirmResetApplicationData()

    expect(reloadSpy).toHaveBeenCalledTimes(1)
    expect(store.resetModalStatus).toBe(ResetDataModalStatus.Hidden)
    expect(store.resetConfirmationInput).toBe('')
    expect(store.resetErrorVisible).toBe(false)

    reloadSpy.mockRestore()
  })

  it('keeps error visible after failed reset', async () => {
    const resetError = new Error('reset failed')
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    const reloadSpy = vi
      .spyOn(window.location, 'reload')
      .mockImplementation(() => undefined)
    resetApplicationData.mockRejectedValueOnce(resetError)
    const store = useAppResetStore()

    store.openResetModal()
    store.setResetConfirmationInput('DELETE ALL DATA')
    await store.confirmResetApplicationData()

    expect(store.resetErrorVisible).toBe(true)
    expect(store.resetModalStatus).toBe(ResetDataModalStatus.Ready)
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to reset all local application data.',
      resetError
    )
    expect(reloadSpy).not.toHaveBeenCalled()

    store.dismissResetError()
    expect(store.resetErrorVisible).toBe(false)

    consoleErrorSpy.mockRestore()
    reloadSpy.mockRestore()
  })
})
