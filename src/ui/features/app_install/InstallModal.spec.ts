import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { computed } from 'vue'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { usePwaInstall } from '@/ui/composables/usePwaInstall'
import { createAppI18n } from '@/ui/i18n'
import {
  useAppInstallStore,
  type InstallSurface
} from '@/ui/features/app_install/app-install.store'
import { useAppStore } from '@/ui/stores/app'
import InstallModal from '@/ui/features/app_install/InstallModal.vue'
import { INSTALL_MODAL_MESSAGES } from '@/ui/features/app_install/InstallModal.messages'

vi.mock('@/ui/composables/usePwaInstall', () => ({
  usePwaInstall: vi.fn()
}))

describe('InstallModal', () => {
  let mockPromptInstall: Mock<() => Promise<boolean>>

  beforeEach(() => {
    mockPromptInstall = vi.fn().mockResolvedValue(false)
  })

  function mountInstallModal(
    options: Partial<{
      installModalVisible: boolean
      installPending: boolean
      installSurface: InstallSurface
      manualInstallVariant: 'iosSafari' | null
      shellReady: boolean
    }> = {}
  ): {
    installStore: ReturnType<typeof useAppInstallStore>
    wrapper: VueWrapper
  } {
    const pinia = createPinia()
    const i18n = createAppI18n('pl')
    setActivePinia(pinia)
    const appStore = useAppStore()
    const installStore = useAppInstallStore()
    const installSurface = options.installSurface ?? 'native'

    vi.mocked(usePwaInstall).mockReturnValue({
      promptInstall: mockPromptInstall,
      manualInstallVariant: computed(
        () =>
          options.manualInstallVariant ??
          (installStore.installSurface === 'manual' ? 'iosSafari' : null)
      )
    })

    installStore.setInstallSurface(installSurface)

    if (options.shellReady ?? true) {
      appStore.setAppReady()
      appStore.setSetupStatus('ready')
    }

    if (options.installPending) {
      installStore.setInstallPending(true)
    }

    if (options.installModalVisible ?? true) {
      installStore.openInstallModal()
    }

    const wrapper = mount(InstallModal, {
      global: {
        plugins: [pinia, i18n]
      }
    })

    return { installStore, wrapper }
  }

  it('routes the native primary action through the PWA prompt composable', async () => {
    const { wrapper } = mountInstallModal()

    await wrapper.get('[data-testid="install-modal-primary"]').trigger('click')

    expect(mockPromptInstall).toHaveBeenCalledTimes(1)
  })

  it('dismisses the modal when the secondary action is clicked', async () => {
    const { installStore, wrapper } = mountInstallModal()

    await wrapper.get('[data-testid="install-modal-later"]').trigger('click')

    expect(installStore.installModalVisible).toBe(false)
  })

  it('dismisses the modal when the backdrop is clicked', async () => {
    const { installStore, wrapper } = mountInstallModal()

    await wrapper.get('[data-testid="install-modal-backdrop"]').trigger('click')

    expect(installStore.installModalVisible).toBe(false)
  })

  it('renders manual install steps only for the supported manual variant', () => {
    const { wrapper } = mountInstallModal({
      installSurface: 'manual',
      manualInstallVariant: 'iosSafari'
    })

    // What: assert manual instructions from the shared message source. Why: locale copy changes should update one source and keep tests stable without duplicated literals.
    const firstManualStep =
      INSTALL_MODAL_MESSAGES.pl.install.manual.iosSafari.steps[0]

    expect(wrapper.text()).toContain(firstManualStep)
    expect(wrapper.findAll('li')).toHaveLength(2)
  })

  it('shows the native pending copy and disabled state while install is in progress', () => {
    const { wrapper } = mountInstallModal({
      installPending: true
    })

    const primaryButton = wrapper.get('[data-testid="install-modal-primary"]')
    const pendingLabel = INSTALL_MODAL_MESSAGES.pl.install.native.pending

    expect(primaryButton.text()).toContain(pendingLabel)
    expect(primaryButton.attributes('disabled')).toBeDefined()
    expect(wrapper.findAll('li')).toHaveLength(0)
  })

  it('does not render when the feature status is hidden', () => {
    const { wrapper } = mountInstallModal({
      installModalVisible: false
    })

    expect(wrapper.text()).toBe('')
  })
})
