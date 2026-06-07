import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { useAppServices } from '@/ui/appServices'
import { useAppResetStore } from '@/ui/features/app_reset/app-reset.store'
import { useAppReset } from '@/ui/features/app_reset/useAppReset'
import { useAppStore } from '@/ui/stores/app'

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

function makeShellReady() {
  const appStore = useAppStore()

  appStore.setAppReady()
  appStore.setSetupStatus('ready')

  return appStore
}

describe('useAppReset', () => {
  let resetApplicationData: Mock

  beforeEach(() => {
    setActivePinia(createPinia())
    resetApplicationData = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useAppServices).mockReset()
    vi.mocked(useAppServices).mockReturnValue({
      queries: {} as never,
      system: {
        reset: {
          applicationData: {
            handle: resetApplicationData
          }
        }
      } as never,
      useCases: {} as never
    })
  })

  it('keeps the reset modal hidden until the shell is ready and the workflow is open', () => {
    const appStore = useAppStore()
    const appResetStore = useAppResetStore()
    const composable = useAppReset()

    appResetStore.openResetModal()

    expect(composable.isResetModalVisible.value).toBe(false)

    appStore.setAppReady()
    appStore.setSetupStatus('ready')

    expect(composable.isResetModalVisible.value).toBe(true)
  })

  it('maps confirmation input through the reset store', () => {
    makeShellReady()
    const appResetStore = useAppResetStore()
    const composable = useAppReset()

    appResetStore.openResetModal()
    composable.resetConfirmationInputModel.value = 'delete all data'

    // What: exercise the model exposed to the smart modal. Why: ResetDataModal should not duplicate reset phrase normalization or store mutation details.
    expect(appResetStore.resetConfirmationInput).toBe('delete all data')
    expect(composable.isResetModalVisible.value).toBe(true)
    expect(composable.isResetModalPending.value).toBe(false)
    expect(composable.isResetConfirmationValid.value).toBe(true)
  })

  it('routes confirmed reset through the application layer and reloads after success', async () => {
    const reloadSpy = vi
      .spyOn(window.location, 'reload')
      .mockImplementation(() => undefined)
    makeShellReady()
    const appResetStore = useAppResetStore()
    const composable = useAppReset()

    appResetStore.openResetModal()
    composable.resetConfirmationInputModel.value = 'DELETE ALL DATA'
    await composable.confirmResetApplicationData()

    // What: assert the composable owns the write-layer handoff. Why: the reset store should stay a global workflow state holder without application-service access.
    expect(resetApplicationData).toHaveBeenCalledWith({
      confirmationPhrase: 'DELETE ALL DATA'
    })
    expect(reloadSpy).toHaveBeenCalledTimes(1)
    expect(composable.isResetModalVisible.value).toBe(false)
    expect(appResetStore.resetConfirmationInput).toBe('')

    reloadSpy.mockRestore()
  })

  it('keeps the modal locked while reset writes are pending', async () => {
    const reloadSpy = vi
      .spyOn(window.location, 'reload')
      .mockImplementation(() => undefined)
    const deferredReset = createDeferredPromise()
    resetApplicationData.mockReturnValueOnce(deferredReset.promise)
    makeShellReady()
    const appResetStore = useAppResetStore()
    const composable = useAppReset()

    appResetStore.openResetModal()
    composable.resetConfirmationInputModel.value = 'DELETE ALL DATA'
    const confirmPromise = composable.confirmResetApplicationData()
    await nextTick()

    composable.closeResetModal()

    expect(composable.isResetModalPending.value).toBe(true)
    expect(composable.isResetModalVisible.value).toBe(true)

    deferredReset.resolve()
    await confirmPromise

    reloadSpy.mockRestore()
  })

  it('dismisses failed reset feedback without closing the modal', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    const reloadSpy = vi
      .spyOn(window.location, 'reload')
      .mockImplementation(() => undefined)
    resetApplicationData.mockRejectedValueOnce(new Error('reset failed'))
    makeShellReady()
    const appResetStore = useAppResetStore()
    const composable = useAppReset()

    appResetStore.openResetModal()
    composable.resetConfirmationInputModel.value = 'DELETE ALL DATA'
    await composable.confirmResetApplicationData()

    expect(composable.resetErrorVisible.value).toBe(true)
    expect(composable.isResetModalVisible.value).toBe(true)

    composable.dismissResetError()

    expect(composable.resetErrorVisible.value).toBe(false)
    expect(composable.isResetModalVisible.value).toBe(true)

    consoleErrorSpy.mockRestore()
    reloadSpy.mockRestore()
  })
})
