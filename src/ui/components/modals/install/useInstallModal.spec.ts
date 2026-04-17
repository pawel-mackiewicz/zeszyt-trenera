import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import { InstallModalStatus } from '@/ui/components/modals/install/InstallModal.contract'
import { useInstallModal } from '@/ui/components/modals/install/useInstallModal'

describe('useInstallModal', () => {
  function mountInstallModalController() {
    const isShellReady = ref(true)
    const installModalVisible = ref(false)
    const installSurface = ref<'hidden' | 'native' | 'manual'>('hidden')
    const installPending = ref(false)
    const showInstallEntry = ref(true)
    const promptInstall = vi.fn<() => Promise<boolean>>()
    const dismissInstallModal = vi.fn()
    const hideInstallCoach = vi.fn()

    const composable = useInstallModal({
      isShellReady,
      installModalVisible,
      installSurface,
      installPending,
      showInstallEntry,
      promptInstall,
      dismissInstallModal,
      hideInstallCoach
    })

    return {
      composable,
      isShellReady,
      installModalVisible,
      installSurface,
      installPending,
      showInstallEntry,
      promptInstall,
      dismissInstallModal,
      hideInstallCoach
    }
  }

  it('keeps the modal hidden until shell readiness and modal visibility are true', () => {
    const { composable, installModalVisible, installSurface } =
      mountInstallModalController()

    installSurface.value = 'native'
    expect(composable.installModalStatus.value).toBe(InstallModalStatus.Hidden)

    installModalVisible.value = true
    expect(composable.installModalStatus.value).toBe(
      InstallModalStatus.NativeReady
    )
  })

  it('maps manual and native pending statuses for the presentation component', () => {
    const { composable, installModalVisible, installSurface, installPending } =
      mountInstallModalController()

    installModalVisible.value = true

    installSurface.value = 'manual'
    expect(composable.installModalStatus.value).toBe(
      InstallModalStatus.ManualReady
    )

    installSurface.value = 'native'
    installPending.value = true
    expect(composable.installModalStatus.value).toBe(
      InstallModalStatus.NativePending
    )
  })

  it('dismisses the manual modal on primary action without touching native prompt flow', async () => {
    const {
      composable,
      installModalVisible,
      installSurface,
      promptInstall,
      dismissInstallModal
    } = mountInstallModalController()

    installModalVisible.value = true
    installSurface.value = 'manual'

    await composable.handleInstallPrimaryAction()

    // What: keep manual mode on a single dismiss-only CTA. Why: iOS Safari does not expose a native install prompt, so the primary action should only close guidance.
    expect(promptInstall).not.toHaveBeenCalled()
    expect(dismissInstallModal).toHaveBeenCalledTimes(1)
  })

  it('closes install surfaces after accepted native prompt', async () => {
    const {
      composable,
      installModalVisible,
      installSurface,
      promptInstall,
      dismissInstallModal,
      hideInstallCoach
    } = mountInstallModalController()

    installModalVisible.value = true
    installSurface.value = 'native'
    promptInstall.mockResolvedValueOnce(true)

    await composable.handleInstallPrimaryAction()

    expect(promptInstall).toHaveBeenCalledTimes(1)
    expect(dismissInstallModal).toHaveBeenCalledTimes(1)
    expect(hideInstallCoach).toHaveBeenCalledTimes(1)
  })

  it('keeps install surfaces open when native prompt is dismissed and entry is still available', async () => {
    const {
      composable,
      installModalVisible,
      installSurface,
      promptInstall,
      showInstallEntry,
      dismissInstallModal,
      hideInstallCoach
    } = mountInstallModalController()

    installModalVisible.value = true
    installSurface.value = 'native'
    showInstallEntry.value = true
    promptInstall.mockResolvedValueOnce(false)

    await composable.handleInstallPrimaryAction()

    expect(dismissInstallModal).not.toHaveBeenCalled()
    expect(hideInstallCoach).not.toHaveBeenCalled()
  })

  it('closes the modal from the later action', () => {
    const { composable, dismissInstallModal } = mountInstallModalController()

    composable.handleInstallLater()

    expect(dismissInstallModal).toHaveBeenCalledTimes(1)
  })
})
