import { mount, type VueWrapper } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { createAppI18n } from '@/ui/i18n'
import InstallModal from '@/ui/components/modals/install/InstallModal.vue'
import { InstallModalStatus } from '@/ui/components/modals/install/InstallModal.contract'
import { INSTALL_MODAL_MESSAGES } from '@/ui/components/modals/install/InstallModal.messages'

function mountInstallModal(
  overrides: Partial<{
    status: (typeof InstallModalStatus)[keyof typeof InstallModalStatus]
    manualInstallVariant: 'iosSafari' | null
  }> = {}
): VueWrapper {
  const i18n = createAppI18n('pl')

  return mount(InstallModal, {
    props: {
      status: InstallModalStatus.NativeReady,
      manualInstallVariant: null,
      ...overrides
    },
    global: {
      plugins: [i18n]
    }
  })
}

describe('InstallModal', () => {
  it('emits a primary event when the main install action is clicked', async () => {
    const wrapper = mountInstallModal()

    await wrapper.get('[data-testid="install-modal-primary"]').trigger('click')

    expect(wrapper.emitted('primary')).toHaveLength(1)
  })

  it('emits a later event when the secondary action is clicked', async () => {
    const wrapper = mountInstallModal()

    await wrapper.get('[data-testid="install-modal-later"]').trigger('click')

    expect(wrapper.emitted('later')).toHaveLength(1)
  })

  it('emits a later event when the backdrop is clicked', async () => {
    const wrapper = mountInstallModal()

    await wrapper.get('[data-testid="install-modal-backdrop"]').trigger('click')

    expect(wrapper.emitted('later')).toHaveLength(1)
  })

  it('renders manual install steps only for the supported manual variant', () => {
    const wrapper = mountInstallModal({
      status: InstallModalStatus.ManualReady,
      manualInstallVariant: 'iosSafari'
    })

    // What: assert manual instructions from the shared message source. Why: locale copy changes should update one source and keep tests stable without duplicated literals.
    const firstManualStep =
      INSTALL_MODAL_MESSAGES.pl.install.manual.iosSafari.steps[0]

    expect(wrapper.text()).toContain(firstManualStep)
    expect(wrapper.findAll('.install-modal-card__step')).toHaveLength(2)
  })

  it('shows the native pending copy and disabled state while install is in progress', () => {
    const wrapper = mountInstallModal({
      status: InstallModalStatus.NativePending
    })

    const primaryButton = wrapper.get('[data-testid="install-modal-primary"]')
    const pendingLabel = INSTALL_MODAL_MESSAGES.pl.install.native.pending

    expect(primaryButton.text()).toContain(pendingLabel)
    expect(primaryButton.attributes('disabled')).toBeDefined()
    expect(wrapper.find('.install-modal-card__step').exists()).toBe(false)
  })

  it('does not render when status is hidden', () => {
    const wrapper = mountInstallModal({
      status: InstallModalStatus.Hidden
    })

    expect(wrapper.text()).toBe('')
  })
})
