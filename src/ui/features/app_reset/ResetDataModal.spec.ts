import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { createAppServicesProvides } from '@/ui/appServices'
import { useAppResetStore } from '@/ui/features/app_reset/app-reset.store'
import { ResetDataModalStatus } from '@/ui/features/app_reset/ResetDataModal.contract'
import { RESET_DATA_MODAL_MESSAGES } from '@/ui/features/app_reset/ResetDataModal.messages'
import ResetDataModal from '@/ui/features/app_reset/ResetDataModal.vue'
import { createAppI18n } from '@/ui/i18n'
import { useAppStore } from '@/ui/stores/app'

type MountOptions = Partial<{
  confirmationInput: string
  open: boolean
  shellReady: boolean
}>

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

describe('ResetDataModal', () => {
  let resetApplicationData: Mock

  beforeEach(() => {
    resetApplicationData = vi.fn().mockResolvedValue(undefined)
  })

  async function mountResetDataModal(options: MountOptions = {}): Promise<{
    appResetStore: ReturnType<typeof useAppResetStore>
    wrapper: VueWrapper
  }> {
    const pinia = createPinia()
    const i18n = createAppI18n('pl')
    setActivePinia(pinia)
    const appStore = useAppStore()

    if (options.shellReady ?? true) {
      appStore.setAppReady()
      appStore.setSetupStatus('ready')
    }

    const wrapper = mount(ResetDataModal, {
      global: {
        plugins: [pinia, i18n],
        provide: createAppServicesProvides({
          queries: {} as never,
          useCases: {
            resetApplicationData: {
              handle: resetApplicationData
            }
          } as never
        })
      }
    })
    const appResetStore = useAppResetStore()

    if (options.open ?? true) {
      appResetStore.openResetModal()
    }

    if (options.confirmationInput !== undefined) {
      appResetStore.setResetConfirmationInput(options.confirmationInput)
    }

    await nextTick()

    return {
      appResetStore,
      wrapper
    }
  }

  it('renders destructive copy and controls in the ready state', async () => {
    const { wrapper } = await mountResetDataModal({
      confirmationInput: 'DELETE ALL DATA'
    })

    // What: keep markup checks on the smart reset modal. Why: AppShell should only prove it can open the workflow, not own destructive modal visuals.
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    expect(wrapper.text()).toContain(RESET_DATA_MODAL_MESSAGES.pl.reset.title)
    expect(wrapper.text()).toContain(RESET_DATA_MODAL_MESSAGES.pl.reset.copy)
    expect(
      wrapper.get('[data-testid="confirm-reset-button"]').text()
    ).toContain(RESET_DATA_MODAL_MESSAGES.pl.reset.actions.confirm)
  })

  it('enables the destructive CTA after the confirmation phrase matches', async () => {
    const { appResetStore, wrapper } = await mountResetDataModal()
    const confirmButton = wrapper.get('[data-testid="confirm-reset-button"]')

    expect(confirmButton.attributes('disabled')).toBeDefined()

    await wrapper
      .get('[data-testid="reset-confirmation-input"]')
      .setValue('delete all data')

    expect(appResetStore.resetConfirmationInput).toBe('delete all data')
    expect(confirmButton.attributes('disabled')).toBeUndefined()
  })

  it('does not render when the smart status is hidden', async () => {
    const { wrapper } = await mountResetDataModal({
      open: false
    })

    expect(wrapper.text()).toBe('')
    expect(wrapper.find('[data-testid="confirm-reset-button"]').exists()).toBe(
      false
    )
  })

  it('dismisses the modal when the backdrop is clicked', async () => {
    const { appResetStore, wrapper } = await mountResetDataModal()

    await wrapper
      .get('[data-testid="reset-data-modal-backdrop"]')
      .trigger('click')

    expect(appResetStore.resetModalStatus).toBe(ResetDataModalStatus.Hidden)
  })

  it('routes reset confirmation through the application layer', async () => {
    const reloadSpy = vi
      .spyOn(window.location, 'reload')
      .mockImplementation(() => undefined)
    const { wrapper } = await mountResetDataModal({
      confirmationInput: 'DELETE ALL DATA'
    })

    await wrapper.get('[data-testid="confirm-reset-button"]').trigger('click')
    await flushPromises()

    expect(resetApplicationData).toHaveBeenCalledWith({
      confirmationPhrase: 'DELETE ALL DATA'
    })
    expect(reloadSpy).toHaveBeenCalledTimes(1)

    reloadSpy.mockRestore()
  })

  it('renders pending CTA copy and locks modal actions while reset is in progress', async () => {
    const reloadSpy = vi
      .spyOn(window.location, 'reload')
      .mockImplementation(() => undefined)
    const deferredReset = createDeferredPromise()
    resetApplicationData.mockReturnValueOnce(deferredReset.promise)
    const { appResetStore, wrapper } = await mountResetDataModal({
      confirmationInput: 'DELETE ALL DATA'
    })

    const confirmClick = wrapper
      .get('[data-testid="confirm-reset-button"]')
      .trigger('click')
    await nextTick()

    const confirmButton = wrapper.get('[data-testid="confirm-reset-button"]')
    const cancelButton = wrapper.findAll('button')[0]

    expect(confirmButton.text()).toContain(
      RESET_DATA_MODAL_MESSAGES.pl.reset.actions.pending
    )
    expect(confirmButton.attributes('disabled')).toBeDefined()
    expect(cancelButton.attributes('disabled')).toBeDefined()

    await wrapper
      .get('[data-testid="reset-data-modal-backdrop"]')
      .trigger('click')

    // What: assert the destructive overlay stays visible while the write is pending. Why: local-first full resets should never look cancellable mid-flight.
    expect(appResetStore.resetModalStatus).toBe(ResetDataModalStatus.Pending)

    deferredReset.resolve()
    await confirmClick
    await flushPromises()

    reloadSpy.mockRestore()
  })

  it('keeps reset failures visible above the confirmation modal', async () => {
    const resetError = new Error('reset failed')
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    const reloadSpy = vi
      .spyOn(window.location, 'reload')
      .mockImplementation(() => undefined)
    resetApplicationData.mockRejectedValueOnce(resetError)
    const { appResetStore, wrapper } = await mountResetDataModal({
      confirmationInput: 'DELETE ALL DATA'
    })

    await wrapper.get('[data-testid="confirm-reset-button"]').trigger('click')
    await flushPromises()

    const resetErrorAlert = wrapper.get('.floating-error-alert--modal')

    expect(wrapper.text()).toContain(RESET_DATA_MODAL_MESSAGES.pl.reset.title)
    expect(resetErrorAlert.text()).toContain(
      RESET_DATA_MODAL_MESSAGES.pl.reset.error
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to reset all local application data.',
      resetError
    )
    expect(reloadSpy).not.toHaveBeenCalled()

    await resetErrorAlert.get('button').trigger('click')

    expect(appResetStore.resetErrorVisible).toBe(false)

    consoleErrorSpy.mockRestore()
    reloadSpy.mockRestore()
  })
})
