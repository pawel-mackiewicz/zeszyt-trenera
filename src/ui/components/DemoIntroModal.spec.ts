import { mount, type VueWrapper } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import DemoIntroModal from '@/ui/components/DemoIntroModal.vue'
import {
  DemoIntroModalStatus,
  type DemoIntroModalStatusValue
} from '@/ui/components/DemoIntroModal.contract'
import { DEMO_INTRO_MODAL_MESSAGES } from '@/ui/components/DemoIntroModal.messages'
import { createAppI18n } from '@/ui/i18n'

function mountDemoIntroModal(
  overrides: Partial<{
    status: DemoIntroModalStatusValue
  }> = {}
): VueWrapper {
  const i18n = createAppI18n('pl')

  return mount(DemoIntroModal, {
    props: {
      status: DemoIntroModalStatus.Ready,
      ...overrides
    },
    global: {
      plugins: [i18n]
    }
  })
}

describe('DemoIntroModal', () => {
  it('emits a stay event when the primary action is clicked', async () => {
    const wrapper = mountDemoIntroModal()

    await wrapper.get('[data-testid="continue-demo-button"]').trigger('click')

    expect(wrapper.emitted('stay')).toHaveLength(1)
  })

  it('emits a confirm event when the secondary action is clicked', async () => {
    const wrapper = mountDemoIntroModal()

    await wrapper
      .get('[data-testid="confirm-leave-demo-button"]')
      .trigger('click')

    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })

  it('emits a close event when the backdrop is clicked', async () => {
    const wrapper = mountDemoIntroModal()

    await wrapper
      .get('[data-testid="demo-intro-modal-backdrop"]')
      .trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('renders pending copy and disables actions while demo exit is in progress', () => {
    const wrapper = mountDemoIntroModal({
      status: DemoIntroModalStatus.Pending
    })

    const stayButton = wrapper.get('[data-testid="continue-demo-button"]')
    const confirmButton = wrapper.get(
      '[data-testid="confirm-leave-demo-button"]'
    )

    // What: assert pending copy from the shared message source. Why: translation edits should not require hunting duplicated literals across tests.
    const pendingLabel = DEMO_INTRO_MODAL_MESSAGES.pl.demo.actions.pending

    expect(stayButton.attributes('disabled')).toBeDefined()
    expect(confirmButton.attributes('disabled')).toBeDefined()
    expect(confirmButton.text()).toContain(pendingLabel)
  })

  it('does not render when it is inactive', () => {
    const wrapper = mountDemoIntroModal({
      status: DemoIntroModalStatus.Hidden
    })

    expect(wrapper.text()).toBe('')
    expect(wrapper.find('[data-testid="continue-demo-button"]').exists()).toBe(
      false
    )
  })
})
