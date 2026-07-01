import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'

import { usePwaInstall } from '@/ui/composables/usePwaInstall'
import { useAppInstallStore } from '@/ui/features/app_install/app-install.store'
import { useDemoStore } from '@/ui/features/demo/demo.store'
import { useAppStore } from '@/ui/stores/app'
import {
  InstallModalStatus,
  type InstallModalStatusValue
} from '@/ui/features/app_install/InstallModal.contract'

export function useAppInstall() {
  const appStore = useAppStore()
  const appInstallStore = useAppInstallStore()
  const demoStore = useDemoStore()
  const { promptInstall, manualInstallVariant } = usePwaInstall()
  const { appReadiness, setupStatus } = storeToRefs(appStore)
  const {
    installModalVisible,
    installPending,
    installSurface,
    showInstallEntry,
    shouldAutoOpenInstallModal
  } = storeToRefs(appInstallStore)
  const { demoIntroModalVisible, demoModeActive } = storeToRefs(demoStore)
  const postDemoInstallPromptRequested = ref(false)

  const isAppReady = computed(() => appReadiness.value === 'ready')
  const isShellReady = computed(
    () => isAppReady.value && setupStatus.value === 'ready'
  )

  // What: expose one status value for the smart modal. Why: consolidating shell readiness, visibility, install surface, and pending state keeps the feature UI from drifting into invalid combinations.
  const installModalStatus = computed<InstallModalStatusValue>(() => {
    if (!isAppReady.value || !installModalVisible.value) {
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
        appInstallStore.openInstallModal('automatic')
      }
    },
    { immediate: true }
  )

  watch(
    demoModeActive,
    (value, previousValue) => {
      if (value) {
        postDemoInstallPromptRequested.value = false
        // What: collapse install-only surfaces while demo mode is active. Why: demo exploration should not compete with the local-first install prompt for the same first-run attention.
        appInstallStore.dismissInstallModal()
        return
      }

      if (previousValue === true) {
        // What: keep the post-demo install nudge as session-only state. Why: exiting demo should get one immediate PWA prompt over setup without making future app launches reopen it.
        postDemoInstallPromptRequested.value = true
      }
    },
    { immediate: true }
  )

  watch(
    [
      postDemoInstallPromptRequested,
      isAppReady,
      demoIntroModalVisible,
      showInstallEntry
    ],
    ([shouldOpen, appReady, demoModalVisible, canShowInstallEntry]) => {
      if (
        !shouldOpen ||
        !appReady ||
        demoModalVisible ||
        !canShowInstallEntry
      ) {
        return
      }

      appInstallStore.openInstallModal('post-demo')

      if (installModalVisible.value) {
        postDemoInstallPromptRequested.value = false
      }
    },
    { immediate: true }
  )

  async function handleInstallPrimaryAction() {
    if (installModalStatus.value === InstallModalStatus.ManualReady) {
      appInstallStore.dismissInstallModal()
      return
    }

    if (installModalStatus.value !== InstallModalStatus.NativeReady) {
      return
    }

    const wasAccepted = await promptInstall()

    // What: close the install modal only when the browser accepted install or the entry vanished after prompt resolution. Why: a dismissed native prompt should keep the local-first install guidance visible until install is no longer possible.
    if (wasAccepted || !showInstallEntry.value) {
      appInstallStore.dismissInstallModal()
    }
  }

  function handleInstallLater() {
    appInstallStore.dismissInstallModal()
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
