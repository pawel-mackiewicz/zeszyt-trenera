import { mount, type VueWrapper } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { createAppI18n } from '@/ui/i18n'
import InstallModal from '@/ui/components/InstallModal.vue'

function mountInstallModal(
  overrides: Partial<{
    active: boolean
    surface: 'manual' | 'native'
    pending: boolean
    manualInstallVariant: 'iosSafari' | null
  }> = {}
): VueWrapper {
  const i18n = createAppI18n('pl')

  return mount(InstallModal, {
    props: {
      active: true,
      surface: 'native',
      pending: false,
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
      surface: 'manual',
      manualInstallVariant: 'iosSafari'
    })

    expect(wrapper.text()).toContain('Stuknij przycisk Udostępnij w Safari.')
    expect(wrapper.findAll('.install-modal-card__step')).toHaveLength(2)
  })

  it('shows the native pending copy and disabled state while install is in progress', () => {
    const wrapper = mountInstallModal({
      surface: 'native',
      pending: true
    })

    const primaryButton = wrapper.get('[data-testid="install-modal-primary"]')

    expect(primaryButton.text()).toContain('Instalowanie...')
    expect(primaryButton.attributes('disabled')).toBeDefined()
    expect(wrapper.find('.install-modal-card__step').exists()).toBe(false)
  })
})
