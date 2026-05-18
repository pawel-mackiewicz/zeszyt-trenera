import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import LeaveDemoButton from '@/ui/features/demo/LeaveDemoButton.vue'
import { createAppI18n } from '@/ui/i18n'
import { useDemoStore } from '@/ui/features/demo/demo.store'

describe('LeaveDemoButton', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function mountLeaveDemoButton(
    configureStore?: (demoStore: ReturnType<typeof useDemoStore>) => void
  ) {
    const pinia = createPinia()
    const i18n = createAppI18n('pl')
    setActivePinia(pinia)
    const demoStore = useDemoStore()

    configureStore?.(demoStore)

    const wrapper = mount(LeaveDemoButton, {
      global: {
        plugins: [pinia, i18n]
      }
    })

    return { wrapper, demoStore }
  }

  it('stays hidden outside demo mode', () => {
    const { wrapper } = mountLeaveDemoButton()

    expect(wrapper.find('[data-testid="open-demo-modal"]').exists()).toBe(false)
  })

  it('renders the shared compact CTA and opens the modal through shared demo state', async () => {
    const { wrapper, demoStore } = mountLeaveDemoButton((demoStore) => {
      demoStore.setDemoModeActive(true)
    })

    const trigger = wrapper.get('[data-testid="open-demo-modal"]')

    expect(trigger.classes()).toContain('app-button--compact')
    expect(trigger.text()).toContain('Wyjdź z demo')

    await trigger.trigger('click')

    expect(demoStore.demoIntroModalVisible).toBe(true)
  })
})
