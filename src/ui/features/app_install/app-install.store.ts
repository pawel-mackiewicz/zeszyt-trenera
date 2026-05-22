import { computed, ref } from 'vue'
import { defineStore, storeToRefs } from 'pinia'

import { INSTALL_MODAL_SHOWN_STORAGE_KEY } from '@/appStorageKeys'
import { useDemoStore } from '@/ui/features/demo/demo.store'
import { useAppStore } from '@/ui/stores/app'

export type InstallSurface = 'hidden' | 'native' | 'manual'

function isStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches
}

function readStoredFlag(key: string) {
  try {
    return window.localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function writeStoredFlag(key: string, value: boolean) {
  try {
    if (value) {
      window.localStorage.setItem(key, '1')
      return
    }

    window.localStorage.removeItem(key)
  } catch {
    // The shell should still render when storage is unavailable, even if that means losing one-time prompt memory.
  }
}

export const useAppInstallStore = defineStore('appInstall', () => {
  const appStore = useAppStore()
  const demoStore = useDemoStore()
  const { appReadiness } = storeToRefs(appStore)
  const { demoModeActive } = storeToRefs(demoStore)
  const canInstall = ref(false)
  const installPending = ref(false)
  const installed = ref(isStandaloneMode())
  const installSurface = ref<InstallSurface>('hidden')
  const installModalVisible = ref(false)
  const installCoachVisible = ref(false)
  const installModalShown = ref(readStoredFlag(INSTALL_MODAL_SHOWN_STORAGE_KEY))

  // What: keep PWA install state in the app-install feature store. Why: install nudges depend on shell readiness and demo suppression, but should evolve outside the general bootstrap store.
  const showInstallEntry = computed(
    () =>
      !demoModeActive.value &&
      !installed.value &&
      installSurface.value !== 'hidden'
  )
  const shouldAutoOpenInstallModal = computed(
    () =>
      appReadiness.value === 'ready' &&
      showInstallEntry.value &&
      !installModalShown.value
  )

  function setInstallAvailability(value: boolean) {
    setInstallSurface(value ? 'native' : 'hidden')
  }

  function setInstallSurface(value: InstallSurface) {
    if (installed.value) {
      installSurface.value = 'hidden'
      canInstall.value = false
      return
    }

    installSurface.value = value
    canInstall.value = value === 'native'
  }

  function setInstallPending(value: boolean) {
    installPending.value = value
  }

  function setInstalled(value: boolean) {
    installed.value = value

    if (value) {
      setInstallSurface('hidden')
      installModalVisible.value = false
      installCoachVisible.value = false
      return
    }

    canInstall.value = installSurface.value === 'native'
  }

  function markInstallModalShown() {
    installModalShown.value = true
    // Persisting the auto-open state prevents the shell from interrupting every launch on the same device.
    writeStoredFlag(INSTALL_MODAL_SHOWN_STORAGE_KEY, true)
  }

  function openInstallModal(source: 'automatic' | 'manual' = 'manual') {
    if (!showInstallEntry.value) {
      return
    }

    if (source === 'automatic') {
      markInstallModalShown()
    }

    installCoachVisible.value = false
    installModalVisible.value = true
  }

  function dismissInstallModal() {
    installModalVisible.value = false
  }

  function showInstallCoach() {
    if (!showInstallEntry.value) {
      return
    }

    installCoachVisible.value = true
  }

  function hideInstallCoach() {
    installCoachVisible.value = false
  }

  return {
    canInstall,
    installPending,
    installed,
    installSurface,
    installModalVisible,
    installCoachVisible,
    installModalShown,
    showInstallEntry,
    shouldAutoOpenInstallModal,
    setInstallAvailability,
    setInstallSurface,
    setInstallPending,
    setInstalled,
    markInstallModalShown,
    openInstallModal,
    dismissInstallModal,
    showInstallCoach,
    hideInstallCoach
  }
})
