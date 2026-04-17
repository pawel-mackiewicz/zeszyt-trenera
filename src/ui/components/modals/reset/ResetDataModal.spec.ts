import { mount, type VueWrapper } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { createAppI18n } from '@/ui/i18n'
import ResetDataModal from '@/ui/components/modals/reset/ResetDataModal.vue'
import {
  ResetDataModalStatus,
  type ResetDataModalStatusValue
} from '@/ui/components/modals/reset/ResetDataModal.contract'
import { RESET_DATA_MODAL_MESSAGES } from '@/ui/components/modals/reset/ResetDataModal.messages'

function mountResetDataModal(
  overrides: Partial<{
    status: ResetDataModalStatusValue
    confirmationInput: string
    confirmationPhrase: string
    canConfirm: boolean
  }> = {}
): VueWrapper {
  const i18n = createAppI18n('pl')

  return mount(ResetDataModal, {
    props: {
      status: ResetDataModalStatus.Ready,
      confirmationInput: '',
      confirmationPhrase: 'DELETE ALL DATA',
      canConfirm: false,
      ...overrides
    },
    global: {
      plugins: [i18n]
    }
  })
}

describe('ResetDataModal', () => {
  it('renders destructive copy and controls in the ready state', () => {
    const wrapper = mountResetDataModal({
      canConfirm: true
    })

    // What: keep modal markup checks in the modal spec. Why: AppShell specs should stay focused on orchestration and application-layer wiring.
    expect(wrapper.find('.reset-data-modal-card__title').exists()).toBe(true)
    expect(wrapper.text()).toContain(RESET_DATA_MODAL_MESSAGES.pl.reset.title)
    expect(wrapper.text()).toContain(RESET_DATA_MODAL_MESSAGES.pl.reset.copy)
    expect(
      wrapper.get('[data-testid="confirm-reset-button"]').text()
    ).toContain(RESET_DATA_MODAL_MESSAGES.pl.reset.actions.confirm)
  })

  it('renders pending CTA copy and disables action buttons while reset is in progress', () => {
    const wrapper = mountResetDataModal({
      status: ResetDataModalStatus.Pending,
      canConfirm: true
    })

    const confirmButton = wrapper.get('[data-testid="confirm-reset-button"]')
    const cancelButton = wrapper.findAll('button')[0]

    expect(confirmButton.text()).toContain(
      RESET_DATA_MODAL_MESSAGES.pl.reset.actions.pending
    )
    expect(confirmButton.attributes('disabled')).toBeDefined()
    expect(cancelButton.attributes('disabled')).toBeDefined()
  })

  it('does not render when status is hidden', () => {
    const wrapper = mountResetDataModal({
      status: ResetDataModalStatus.Hidden
    })

    expect(wrapper.text()).toBe('')
    expect(wrapper.find('[data-testid="confirm-reset-button"]').exists()).toBe(
      false
    )
  })

  it('emits update:confirmationInput when the phrase input changes', async () => {
    const wrapper = mountResetDataModal()

    await wrapper.get('[data-testid="reset-confirmation-input"]').setValue('x')

    expect(wrapper.emitted('update:confirmationInput')).toEqual([['x']])
  })

  it('emits confirm when the destructive CTA is clicked', async () => {
    const wrapper = mountResetDataModal({
      canConfirm: true
    })

    await wrapper.get('[data-testid="confirm-reset-button"]').trigger('click')

    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })

  it('emits close when backdrop is clicked', async () => {
    const wrapper = mountResetDataModal()

    await wrapper
      .get('[data-testid="reset-data-modal-backdrop"]')
      .trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
