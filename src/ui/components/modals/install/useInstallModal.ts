import { computed, type Ref } from 'vue'

import type { InstallSurface } from '@/ui/stores/app'
import {
  InstallModalStatus,
  type InstallModalStatusValue
} from '@/ui/components/modals/install/InstallModal.contract'

type UseInstallModalOptions = {
  isShellReady: Readonly<Ref<boolean>>
  installModalVisible: Readonly<Ref<boolean>>
  installSurface: Readonly<Ref<InstallSurface>>
  installPending: Readonly<Ref<boolean>>
  showInstallEntry: Readonly<Ref<boolean>>
  promptInstall: () => Promise<boolean>
  dismissInstallModal: () => void
  hideInstallCoach: () => void
}

export function useInstallModal(options: UseInstallModalOptions) {
  // What: expose one status value for the modal presentation component. Why: consolidating visibility/surface/pending avoids invalid combinations leaking from shell state into UI rendering.
  const installModalStatus = computed<InstallModalStatusValue>(() => {
    if (!options.isShellReady.value || !options.installModalVisible.value) {
      return InstallModalStatus.Hidden
    }

    if (options.installSurface.value === 'manual') {
      return InstallModalStatus.ManualReady
    }

    if (options.installSurface.value === 'native') {
      return options.installPending.value
        ? InstallModalStatus.NativePending
        : InstallModalStatus.NativeReady
    }

    return InstallModalStatus.Hidden
  })

  async function handleInstallPrimaryAction() {
    if (installModalStatus.value === InstallModalStatus.ManualReady) {
      options.dismissInstallModal()
      return
    }

    if (installModalStatus.value !== InstallModalStatus.NativeReady) {
      return
    }

    const wasAccepted = await options.promptInstall()

    // What: close install surfaces only when the browser accepted install or the entry vanished after prompt resolution. Why: local-first shell coaching should stay available after a dismissed native prompt until install is no longer possible.
    if (wasAccepted || !options.showInstallEntry.value) {
      options.dismissInstallModal()
      options.hideInstallCoach()
    }
  }

  function handleInstallLater() {
    options.dismissInstallModal()
  }

  return {
    installModalStatus,
    handleInstallPrimaryAction,
    handleInstallLater
  }
}
