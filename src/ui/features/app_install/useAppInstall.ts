import { storeToRefs } from 'pinia'
import { computed, watch } from 'vue'

import { usePwaInstall } from '@/ui/composables/usePwaInstall'
import { useDemoStore } from '@/ui/features/demo/demo.store'
import { useAppStore } from '@/ui/stores/app'
import {
  InstallModalStatus,
  type InstallModalStatusValue
} from '@/ui/features/app_install/InstallModal.contract'

export function useAppInstall() {
  const appStore = useAppStore()
  const demoStore = useDemoStore()
  const { promptInstall, manualInstallVariant } = usePwaInstall()
  const {
    appReadiness,
    installModalVisible,
    installPending,
    installSurface,
    setupStatus,
    showInstallEntry,
    shouldAutoOpenInstallModal
  } = storeToRefs(appStore)
  const { demoIntroModalVisible, demoModeActive } = storeToRefs(demoStore)

  const isShellReady = computed(
    () => appReadiness.value === 'ready' && setupStatus.value === 'ready'
  )

  // What: expose one status value for the smart modal. Why: consolidating shell readiness, visibility, install surface, and pending state keeps the feature UI from drifting into invalid combinations.
  const installModalStatus = computed<InstallModalStatusValue>(() => {
    if (!isShellReady.value || !installModalVisible.value) {
      return InstallModalStatus.Hidden
    }

    if (installSurface.value === 'manual') {
      return InstallModalStatus.ManualReady
    }

    if (installSurface.value === 'native') {
      return installPending.value
        ? InstallModalStatus.NativePending
        : InstallModalStatus.NativeReady
    }

    return InstallModalStatus.Hidden
  })
  const isInstallModalVisible = computed(
    () => installModalStatus.value !== InstallModalStatus.Hidden
  )
  const isInstallModalManual = computed(
    () => installModalStatus.value === InstallModalStatus.ManualReady
  )
  const isInstallModalPending = computed(
    () => installModalStatus.value === InstallModalStatus.NativePending
  )

  watch(
    [shouldAutoOpenInstallModal, isShellReady, demoIntroModalVisible],
    ([shouldOpen, shellReady, demoModalVisible]) => {
      if (shouldOpen && shellReady && !demoModalVisible) {
        // What: keep the one-time install nudge inside the install feature. Why: AppShell should not need to know when this PWA-specific modal is allowed to interrupt the mobile workflow.
        appStore.openInstallModal('automatic')
      }
    },
    { immediate: true }
  )

  watch(
    demoModeActive,
    (value) => {
      if (!value) {
        return
      }

      // What: collapse install-only surfaces while demo mode is active. Why: demo exploration should not compete with the local-first install prompt for the same first-run attention.
      appStore.dismissInstallModal()
      appStore.hideInstallCoach()
    },
    { immediate: true }
  )

  watch(showInstallEntry, (value) => {
    if (!value) {
      // What: hide drawer coaching when the install entry disappears. Why: the coach copy must not remain visible after native/manual install is no longer available.
      appStore.hideInstallCoach()
    }
  })

  async function handleInstallPrimaryAction() {
    if (installModalStatus.value === InstallModalStatus.ManualReady) {
      appStore.dismissInstallModal()
      return
    }

    if (installModalStatus.value !== InstallModalStatus.NativeReady) {
      return
    }

    const wasAccepted = await promptInstall()

    // What: close install surfaces only when the browser accepted install or the entry vanished after prompt resolution. Why: local-first shell coaching should stay available after a dismissed native prompt until install is no longer possible.
    if (wasAccepted || !showInstallEntry.value) {
      appStore.dismissInstallModal()
      appStore.hideInstallCoach()
    }
  }

  function handleInstallLater() {
    appStore.dismissInstallModal()
  }

  return {
    installModalStatus,
    // What: expose component-ready modal flags from the feature composable. Why: InstallModal should match the demo modal boundary and avoid duplicating status interpretation in the SFC.
    isInstallModalManual,
    isInstallModalPending,
    isInstallModalVisible,
    manualInstallVariant,
    handleInstallPrimaryAction,
    handleInstallLater
  }
}
