import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { createAppServicesProvides } from '@/ui/appServices'
import DemoOutroModal from '@/ui/features/demo/DemoOutroModal.vue'
import { DemoIntroModalPath, useDemoStore } from '@/ui/features/demo/demo.store'
import { createAppI18n } from '@/ui/i18n'
import { useAppStore } from '@/ui/stores/app'

const demoOutroCopy = {
  title: 'Zaczynasz na serio?',
  copy: 'Jeśli demo już wystarczy, wyczyścimy testowe dane i przejdziesz do konfiguracji Twojego zeszytu.',
  confirmAction: 'Zaczynam na serio',
  pendingAction: 'Przechodzę do konfiguracji...',
  stayAction: 'Jeszcze testuję',
  error: 'Nie udało się wyjść z trybu demo. Spróbuj ponownie.'
} as const

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

function prepareReadyDemoOutro(
  appStore: ReturnType<typeof useAppStore>,
  demoStore: ReturnType<typeof useDemoStore>
) {
  appStore.setAppReady()
  appStore.setSetupStatus('ready')
  demoStore.setDemoModeActive(true)
  demoStore.showDemoIntroModal(DemoIntroModalPath.Exit)
}

describe('DemoOutroModal', () => {
  let mockLeaveDemoMode: Mock

  beforeEach(() => {
    mockLeaveDemoMode = vi.fn().mockResolvedValue(undefined)
  })

  function mountDemoOutroModal(
    prepareStores: (
      appStore: ReturnType<typeof useAppStore>,
      demoStore: ReturnType<typeof useDemoStore>
    ) => void = prepareReadyDemoOutro
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

    prepareStores(appStore, demoStore)

    const wrapper = mount(DemoOutroModal, {
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

  it('keeps the start-for-real dialog hidden until the ready shell and outro path align', async () => {
    const { appStore, demoStore, wrapper } = mountDemoOutroModal(
      () => undefined
    )

    expect(
      wrapper.find('[data-testid="confirm-leave-demo-button"]').exists()
    ).toBe(false)

    demoStore.showDemoIntroModal(DemoIntroModalPath.Exit)
    await nextTick()
    expect(
      wrapper.find('[data-testid="confirm-leave-demo-button"]').exists()
    ).toBe(false)

    appStore.setAppReady()
    appStore.setSetupStatus('ready')
    await nextTick()

    expect(
      wrapper.get('[data-testid="confirm-leave-demo-button"]').text()
    ).toBe(demoOutroCopy.confirmAction)
  })

  it('keeps the start-for-real dialog hidden when the shared modal state points at the intro path', () => {
    const { wrapper } = mountDemoOutroModal((appStore, demoStore) => {
      appStore.setAppReady()
      appStore.setSetupStatus('ready')
      demoStore.setDemoModeActive(true)
      demoStore.showDemoIntroModal(DemoIntroModalPath.Startup)
    })

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(
      wrapper.find('[data-testid="confirm-leave-demo-button"]').exists()
    ).toBe(false)
  })

  it('shows the start-for-real path after the coach opens the demo exit CTA', () => {
    const { wrapper } = mountDemoOutroModal()

    expect(wrapper.text()).toContain(demoOutroCopy.title)
    expect(wrapper.text()).toContain(demoOutroCopy.copy)
    expect(wrapper.get('[data-testid="continue-demo-button"]').text()).toBe(
      demoOutroCopy.stayAction
    )
    expect(
      wrapper.get('[data-testid="confirm-leave-demo-button"]').text()
    ).toBe(demoOutroCopy.confirmAction)
    expect(
      wrapper.get('[data-testid="continue-demo-button"]').classes()
    ).toContain('app-button--secondary')
    expect(
      wrapper.get('[data-testid="confirm-leave-demo-button"]').classes()
    ).toContain('app-button--primary')
  })

  it('routes start-for-real through the application layer and clears demo state on success', async () => {
    const { demoStore, wrapper } = mountDemoOutroModal()

    await wrapper
      .get('[data-testid="confirm-leave-demo-button"]')
      .trigger('click')
    await flushPromises()

    expect(mockLeaveDemoMode).toHaveBeenCalledWith({})
    expect(demoStore.demoModeActive).toBe(false)
    expect(demoStore.demoIntroModalVisible).toBe(false)
  })

  it('keeps the start-for-real path locked while leave-demo writes are pending', async () => {
    const deferredLeave = createDeferredPromise()
    mockLeaveDemoMode.mockReturnValueOnce(deferredLeave.promise)

    const { demoStore, wrapper } = mountDemoOutroModal()

    const leaveClick = wrapper
      .get('[data-testid="confirm-leave-demo-button"]')
      .trigger('click')
    await nextTick()

    const pendingLabel = demoOutroCopy.pendingAction

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
      .get('[data-testid="demo-outro-modal-backdrop"]')
      .trigger('click')
    expect(demoStore.demoIntroModalVisible).toBe(true)

    deferredLeave.resolve()
    await leaveClick
    await flushPromises()
  })

  it('keeps start-for-real failures visible above the modal', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    mockLeaveDemoMode.mockRejectedValueOnce(new Error('leave demo failed'))

    const { demoStore, wrapper } = mountDemoOutroModal()

    await wrapper
      .get('[data-testid="confirm-leave-demo-button"]')
      .trigger('click')
    await flushPromises()

    expect(wrapper.get('.floating-error-alert--modal').text()).toContain(
      demoOutroCopy.error
    )
    expect(demoStore.demoModeActive).toBe(true)
    expect(demoStore.demoIntroModalVisible).toBe(true)

    consoleErrorSpy.mockRestore()
  })

  it('clears a stale start-for-real failure when the outro reopens', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    mockLeaveDemoMode.mockRejectedValueOnce(new Error('leave demo failed'))

    const { demoStore, wrapper } = mountDemoOutroModal()

    await wrapper
      .get('[data-testid="confirm-leave-demo-button"]')
      .trigger('click')
    await flushPromises()
    expect(wrapper.find('.floating-error-alert--modal').exists()).toBe(true)

    demoStore.dismissDemoIntroModal()
    await nextTick()
    demoStore.showDemoIntroModal(DemoIntroModalPath.Exit)
    await nextTick()

    expect(wrapper.find('.floating-error-alert--modal').exists()).toBe(false)
    expect(
      wrapper.get('[data-testid="confirm-leave-demo-button"]').text()
    ).not.toContain(demoOutroCopy.pendingAction)

    consoleErrorSpy.mockRestore()
  })
})
