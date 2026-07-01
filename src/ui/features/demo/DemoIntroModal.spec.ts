import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it } from 'vitest'

import DemoIntroModal from '@/ui/features/demo/DemoIntroModal.vue'
import { DemoIntroModalPath, useDemoStore } from '@/ui/features/demo/demo.store'
import { createAppI18n } from '@/ui/i18n'
import { useAppStore } from '@/ui/stores/app'

const demoIntroCopy = {
  title: 'Tryb Demo',
  copy: 'Sprawdź zeszyt-trenera na testowych danych',
  action: 'Sprawdzam!'
} as const

function prepareReadyDemoIntro(
  appStore: ReturnType<typeof useAppStore>,
  demoStore: ReturnType<typeof useDemoStore>
) {
  appStore.setAppReady()
  appStore.setSetupStatus('ready')
  demoStore.setDemoModeActive(true)
  demoStore.showDemoIntroModal(DemoIntroModalPath.Startup)
}

describe('DemoIntroModal', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function mountDemoIntroModal(
    prepareStores: (
      appStore: ReturnType<typeof useAppStore>,
      demoStore: ReturnType<typeof useDemoStore>
    ) => void = prepareReadyDemoIntro
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

    const wrapper = mount(DemoIntroModal, {
      global: {
        plugins: [pinia, i18n]
      }
    })

    return { appStore, demoStore, wrapper }
  }

  it('keeps the welcome hidden until the ready shell and startup path align', async () => {
    const { appStore, demoStore, wrapper } = mountDemoIntroModal(
      () => undefined
    )

    expect(wrapper.find('[data-testid="continue-demo-button"]').exists()).toBe(
      false
    )

    demoStore.showDemoIntroModal(DemoIntroModalPath.Startup)
    await nextTick()
    expect(wrapper.find('[data-testid="continue-demo-button"]').exists()).toBe(
      false
    )

    appStore.setAppReady()
    appStore.setSetupStatus('ready')
    await nextTick()

    expect(wrapper.get('[data-testid="continue-demo-button"]').text()).toBe(
      demoIntroCopy.action
    )
  })

  it('keeps the welcome hidden when the shared modal state points at the outro path', () => {
    const { wrapper } = mountDemoIntroModal((appStore, demoStore) => {
      appStore.setAppReady()
      appStore.setSetupStatus('ready')
      demoStore.setDemoModeActive(true)
      demoStore.showDemoIntroModal(DemoIntroModalPath.Exit)
    })

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="continue-demo-button"]').exists()).toBe(
      false
    )
  })

  it('shows the first-start demo path as one primary action', () => {
    const { wrapper } = mountDemoIntroModal()

    // What: keep the startup path to one visible decision. Why: the first run should invite exploration instead of asking the coach to choose a setup exit too early.
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    expect(wrapper.text()).toContain(demoIntroCopy.title)
    expect(wrapper.text()).toContain(demoIntroCopy.copy)
    expect(wrapper.get('[data-testid="continue-demo-button"]').text()).toBe(
      demoIntroCopy.action
    )
    expect(
      wrapper.find('[data-testid="confirm-leave-demo-button"]').exists()
    ).toBe(false)
    expect(
      wrapper.get('[data-testid="continue-demo-button"]').classes()
    ).toContain('app-button--primary')
  })

  it('lets the coach start checking the demo without leaving demo mode', async () => {
    const { demoStore, wrapper } = mountDemoIntroModal()

    await wrapper.get('[data-testid="continue-demo-button"]').trigger('click')

    expect(demoStore.demoIntroModalVisible).toBe(false)
    expect(demoStore.demoModeActive).toBe(true)
  })

  it('treats the welcome backdrop like the Sprawdzam action', async () => {
    const { demoStore, wrapper } = mountDemoIntroModal()

    await wrapper
      .get('[data-testid="demo-intro-modal-backdrop"]')
      .trigger('click')

    expect(demoStore.demoIntroModalVisible).toBe(false)
    expect(demoStore.demoModeActive).toBe(true)
  })
})
