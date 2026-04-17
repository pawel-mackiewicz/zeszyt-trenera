import { mount } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import { DemoIntroModalStatus } from '@/ui/components/modals/demo/DemoIntroModal.contract'
import { useDemoIntroModal } from '@/ui/components/modals/demo/useDemoIntroModal'

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

function mountDemoIntroModalController() {
  const isShellReady = ref(true)
  const demoIntroModalVisible = ref(false)
  const showDemoIntroModal = vi.fn(() => {
    demoIntroModalVisible.value = true
  })
  const dismissDemoIntroModal = vi.fn(() => {
    demoIntroModalVisible.value = false
  })
  const onLeaveDemoMode = vi.fn().mockResolvedValue(undefined)

  let composable!: ReturnType<typeof useDemoIntroModal>

  const Probe = defineComponent({
    setup() {
      composable = useDemoIntroModal({
        isShellReady,
        demoIntroModalVisible,
        showDemoIntroModal,
        dismissDemoIntroModal,
        onLeaveDemoMode
      })

      return () => null
    }
  })

  mount(Probe)

  return {
    composable,
    isShellReady,
    demoIntroModalVisible,
    showDemoIntroModal,
    dismissDemoIntroModal,
    onLeaveDemoMode
  }
}

describe('useDemoIntroModal', () => {
  it('exposes the modal as hidden until both shell readiness and visibility are true', async () => {
    const { composable, isShellReady, demoIntroModalVisible } =
      mountDemoIntroModalController()

    expect(composable.demoIntroModalStatus.value).toBe(
      DemoIntroModalStatus.Hidden
    )

    demoIntroModalVisible.value = true
    await nextTick()
    expect(composable.demoIntroModalStatus.value).toBe(
      DemoIntroModalStatus.Ready
    )

    isShellReady.value = false
    await nextTick()
    expect(composable.demoIntroModalStatus.value).toBe(
      DemoIntroModalStatus.Hidden
    )
  })

  it('opens the modal and clears stale leave-demo errors before showing it again', async () => {
    const { composable, onLeaveDemoMode } = mountDemoIntroModalController()

    onLeaveDemoMode.mockRejectedValueOnce(new Error('leave demo failed'))
    composable.openDemoIntroModal()
    await composable.leaveDemoMode()

    expect(composable.demoExitErrorVisible.value).toBe(true)

    composable.openDemoIntroModal()
    await nextTick()

    expect(composable.demoExitErrorVisible.value).toBe(false)
    expect(composable.demoIntroModalStatus.value).toBe(
      DemoIntroModalStatus.Ready
    )
  })

  it('keeps the intro modal locked while leave-demo writes are pending', async () => {
    const deferredLeave = createDeferredPromise()
    const {
      composable,
      onLeaveDemoMode,
      demoIntroModalVisible,
      dismissDemoIntroModal
    } = mountDemoIntroModalController()

    onLeaveDemoMode.mockReturnValueOnce(deferredLeave.promise)
    composable.openDemoIntroModal()
    await nextTick()

    const leavePromise = composable.leaveDemoMode()
    await nextTick()

    expect(composable.demoIntroModalStatus.value).toBe(
      DemoIntroModalStatus.Pending
    )

    composable.closeDemoIntroModal()
    expect(dismissDemoIntroModal).not.toHaveBeenCalled()
    expect(demoIntroModalVisible.value).toBe(true)

    deferredLeave.resolve()
    await leavePromise
  })

  it('leaves demo mode through the injected callback while keeping modal visibility external', async () => {
    const { composable, onLeaveDemoMode, dismissDemoIntroModal } =
      mountDemoIntroModalController()

    composable.openDemoIntroModal()
    await nextTick()

    await composable.leaveDemoMode()

    expect(onLeaveDemoMode).toHaveBeenCalledWith()
    expect(dismissDemoIntroModal).not.toHaveBeenCalled()
    expect(composable.demoIntroModalStatus.value).toBe(
      DemoIntroModalStatus.Ready
    )
    expect(composable.demoExitErrorVisible.value).toBe(false)
  })

  it('surfaces leave-demo failures until the alert is dismissed', async () => {
    const { composable, onLeaveDemoMode } = mountDemoIntroModalController()

    onLeaveDemoMode.mockRejectedValueOnce(new Error('leave demo failed'))
    composable.openDemoIntroModal()
    await nextTick()

    await composable.leaveDemoMode()

    expect(composable.demoExitErrorVisible.value).toBe(true)

    composable.dismissDemoExitError()
    expect(composable.demoExitErrorVisible.value).toBe(false)
  })
})
