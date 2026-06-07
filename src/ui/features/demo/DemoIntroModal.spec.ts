import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { createAppServicesProvides } from '@/ui/appServices'
import DemoIntroModal from '@/ui/features/demo/DemoIntroModal.vue'
import { DEMO_INTRO_MODAL_MESSAGES } from '@/ui/features/demo/DemoIntroModal.messages'
import { useDemoStore } from '@/ui/features/demo/demo.store'
import { createAppI18n } from '@/ui/i18n'
import { useAppStore } from '@/ui/stores/app'

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

function configureReadyDemo(
  appStore: ReturnType<typeof useAppStore>,
  demoStore: ReturnType<typeof useDemoStore>
) {
  appStore.setAppReady()
  appStore.setSetupStatus('ready')
  demoStore.setDemoModeActive(true)
  demoStore.showDemoIntroModal()
}

describe('DemoIntroModal', () => {
  let mockLeaveDemoMode: Mock

  beforeEach(() => {
    mockLeaveDemoMode = vi.fn().mockResolvedValue(undefined)
  })

  function mountDemoIntroModal(
    configureStores: (
      appStore: ReturnType<typeof useAppStore>,
      demoStore: ReturnType<typeof useDemoStore>
    ) => void = configureReadyDemo
  ): {
    appStore: ReturnType<typeof useAppStore>
    demoStore: ReturnType<typeof useDemoStore>
    wrapper: VueWrapper
  } {
    const pinia = createPinia()
    const i18n = createAppI18n('pl')
    setActivePinia(pinia)
    const appStore = useAppStore()
    const demoStore = useDemoStore()

    configureStores(appStore, demoStore)

    const wrapper = mount(DemoIntroModal, {
      global: {
        plugins: [pinia, i18n],
        provide: createAppServicesProvides({
          queries: {} as never,
          system: {
            demo: {
              leave: {
                handle: mockLeaveDemoMode
              }
            }
          } as never,
          useCases: {} as never
        })
      }
    })

    return { appStore, demoStore, wrapper }
  }

  it('keeps the modal hidden until the ready shell and shared visibility flag align', async () => {
    const { appStore, demoStore, wrapper } = mountDemoIntroModal(
      () => undefined
    )

    expect(wrapper.find('[data-testid="continue-demo-button"]').exists()).toBe(
      false
    )

    demoStore.showDemoIntroModal()
    await nextTick()
    expect(wrapper.find('[data-testid="continue-demo-button"]').exists()).toBe(
      false
    )

    appStore.setAppReady()
    appStore.setSetupStatus('ready')
    await nextTick()

    expect(wrapper.get('[data-testid="continue-demo-button"]').text()).not.toBe(
      ''
    )
  })

  it('renders modal structure and action variants in the ready state', () => {
    const { wrapper } = mountDemoIntroModal()

    // What: keep markup and CTA-variant assertions on the smart modal. Why: this component now owns both the visible overlay and the demo workflow boundary.
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="continue-demo-button"]').text()).not.toBe(
      ''
    )
    expect(
      wrapper.get('[data-testid="confirm-leave-demo-button"]').text()
    ).not.toBe('')
    expect(
      wrapper.get('[data-testid="continue-demo-button"]').classes()
    ).toContain('app-button--primary')
    expect(
      wrapper.get('[data-testid="confirm-leave-demo-button"]').classes()
    ).toContain('app-button--secondary')
  })

  it('closes the modal without leaving demo mode when the coach stays in demo', async () => {
    const { demoStore, wrapper } = mountDemoIntroModal()

    await wrapper.get('[data-testid="continue-demo-button"]').trigger('click')

    expect(mockLeaveDemoMode).not.toHaveBeenCalled()
    expect(demoStore.demoIntroModalVisible).toBe(false)
    expect(demoStore.demoModeActive).toBe(true)
  })

  it('routes demo exit through the application layer and clears demo state on success', async () => {
    const { demoStore, wrapper } = mountDemoIntroModal()

    await wrapper
      .get('[data-testid="confirm-leave-demo-button"]')
      .trigger('click')
    await flushPromises()

    expect(mockLeaveDemoMode).toHaveBeenCalledWith({})
    expect(demoStore.demoModeActive).toBe(false)
    expect(demoStore.demoIntroModalVisible).toBe(false)
  })

  it('keeps the intro modal locked while leave-demo writes are pending', async () => {
    const deferredLeave = createDeferredPromise()
    mockLeaveDemoMode.mockReturnValueOnce(deferredLeave.promise)

    const { demoStore, wrapper } = mountDemoIntroModal()

    const leaveClick = wrapper
      .get('[data-testid="confirm-leave-demo-button"]')
      .trigger('click')
    await nextTick()

    const pendingLabel = DEMO_INTRO_MODAL_MESSAGES.pl.demo.actions.pending

    expect(
      wrapper.get('[data-testid="continue-demo-button"]').attributes('disabled')
    ).toBeDefined()
    expect(
      wrapper
        .get('[data-testid="confirm-leave-demo-button"]')
        .attributes('disabled')
    ).toBeDefined()
    expect(
      wrapper.get('[data-testid="confirm-leave-demo-button"]').text()
    ).toContain(pendingLabel)

    await wrapper
      .get('[data-testid="demo-intro-modal-backdrop"]')
      .trigger('click')
    expect(demoStore.demoIntroModalVisible).toBe(true)

    deferredLeave.resolve()
    await leaveClick
    await flushPromises()
  })

  it('keeps leave-demo failures visible above the modal', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    mockLeaveDemoMode.mockRejectedValueOnce(new Error('leave demo failed'))

    const { demoStore, wrapper } = mountDemoIntroModal()

    await wrapper
      .get('[data-testid="confirm-leave-demo-button"]')
      .trigger('click')
    await flushPromises()

    expect(wrapper.get('.floating-error-alert--modal').text()).toContain(
      DEMO_INTRO_MODAL_MESSAGES.pl.demo.error
    )
    expect(demoStore.demoModeActive).toBe(true)
    expect(demoStore.demoIntroModalVisible).toBe(true)

    consoleErrorSpy.mockRestore()
  })

  it('clears a stale leave-demo failure when the intro modal reopens', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    mockLeaveDemoMode.mockRejectedValueOnce(new Error('leave demo failed'))

    const { demoStore, wrapper } = mountDemoIntroModal()

    await wrapper
      .get('[data-testid="confirm-leave-demo-button"]')
      .trigger('click')
    await flushPromises()
    expect(wrapper.find('.floating-error-alert--modal').exists()).toBe(true)

    demoStore.dismissDemoIntroModal()
    await nextTick()
    demoStore.showDemoIntroModal()
    await nextTick()

    expect(wrapper.find('.floating-error-alert--modal').exists()).toBe(false)
    expect(
      wrapper.get('[data-testid="confirm-leave-demo-button"]').text()
    ).not.toContain(DEMO_INTRO_MODAL_MESSAGES.pl.demo.actions.pending)

    consoleErrorSpy.mockRestore()
  })
})
