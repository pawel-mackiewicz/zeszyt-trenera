import { mount } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import { ResetDataModalStatus } from '@/ui/components/modals/reset/ResetDataModal.contract'
import { useResetDataModal } from '@/ui/components/modals/reset/useResetDataModal'

function createDeferredPromise() {
  let resolve!: () => void
  let reject!: (error?: unknown) => void

  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return {
    promise,
    resolve,
    reject
  }
}

function mountResetDataModalController() {
  const isShellReady = ref(true)
  const onResetApplicationData = vi.fn().mockResolvedValue(undefined)
  const onReloadApplication = vi.fn()

  let composable!: ReturnType<typeof useResetDataModal>

  const Probe = defineComponent({
    setup() {
      composable = useResetDataModal({
        isShellReady,
        onResetApplicationData,
        onReloadApplication
      })

      return () => null
    }
  })

  mount(Probe)

  return {
    composable,
    isShellReady,
    onResetApplicationData,
    onReloadApplication
  }
}

describe('useResetDataModal', () => {
  it('maps reset modal status from shell readiness, visibility, and pending state', async () => {
    const { composable, isShellReady, onResetApplicationData } =
      mountResetDataModalController()

    expect(composable.resetModalStatus.value).toBe(ResetDataModalStatus.Hidden)

    composable.openResetModal()
    await nextTick()
    expect(composable.resetModalStatus.value).toBe(ResetDataModalStatus.Ready)

    isShellReady.value = false
    await nextTick()
    expect(composable.resetModalStatus.value).toBe(ResetDataModalStatus.Hidden)

    isShellReady.value = true
    const deferredReset = createDeferredPromise()
    onResetApplicationData.mockReturnValueOnce(deferredReset.promise)
    composable.setResetConfirmationInput('DELETE ALL DATA')

    const confirmPromise = composable.confirmResetApplicationData()
    await nextTick()

    expect(composable.resetModalStatus.value).toBe(ResetDataModalStatus.Pending)

    deferredReset.resolve()
    await confirmPromise
  })

  it('validates confirmation phrase case-insensitively', async () => {
    const { composable } = mountResetDataModalController()

    composable.openResetModal()
    composable.setResetConfirmationInput('delete all data')
    await nextTick()

    expect(composable.isResetConfirmationValid.value).toBe(true)

    composable.setResetConfirmationInput('delete all member data')
    await nextTick()

    expect(composable.isResetConfirmationValid.value).toBe(false)
  })

  it('keeps the modal open when close is requested during pending reset writes', async () => {
    const deferredReset = createDeferredPromise()
    const { composable, onResetApplicationData } =
      mountResetDataModalController()

    onResetApplicationData.mockReturnValueOnce(deferredReset.promise)
    composable.openResetModal()
    composable.setResetConfirmationInput('DELETE ALL DATA')
    await nextTick()

    const confirmPromise = composable.confirmResetApplicationData()
    await nextTick()

    composable.closeResetModal()

    // What: assert close-lock behavior while pending. Why: destructive reset must keep context visible until application-layer writes settle.
    expect(composable.resetModalStatus.value).toBe(ResetDataModalStatus.Pending)

    deferredReset.resolve()
    await confirmPromise
  })

  it('runs reset through callbacks and reloads after a successful confirmation', async () => {
    const { composable, onResetApplicationData, onReloadApplication } =
      mountResetDataModalController()

    composable.openResetModal()
    composable.setResetConfirmationInput('DELETE ALL DATA')
    await composable.confirmResetApplicationData()

    expect(onResetApplicationData).toHaveBeenCalledWith({
      confirmationPhrase: 'DELETE ALL DATA'
    })
    expect(onReloadApplication).toHaveBeenCalledTimes(1)
    expect(composable.resetModalStatus.value).toBe(ResetDataModalStatus.Hidden)
    expect(composable.resetConfirmationInput.value).toBe('')
    expect(composable.resetErrorVisible.value).toBe(false)
  })

  it('shows reset failures until dismissed', async () => {
    const { composable, onResetApplicationData } =
      mountResetDataModalController()

    onResetApplicationData.mockRejectedValueOnce(new Error('reset failed'))
    composable.openResetModal()
    composable.setResetConfirmationInput('DELETE ALL DATA')

    await composable.confirmResetApplicationData()

    expect(composable.resetErrorVisible.value).toBe(true)
    expect(composable.resetModalStatus.value).toBe(ResetDataModalStatus.Ready)

    composable.dismissResetError()
    expect(composable.resetErrorVisible.value).toBe(false)
  })
})
