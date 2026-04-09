import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { INSTALL_MODAL_SHOWN_STORAGE_KEY } from '@/appStorageKeys'
import type { SetupStatus } from '@/read/ObserveSetupStatusQuery'

export type AppReadiness = 'checking' | 'ready' | 'blocked'
export type BlockingIssue = 'database' | 'bootstrap' | null
export type InstallSurface = 'hidden' | 'native' | 'manual'
export type UpdateErrorKind = 'registration' | 'activation'
export type UpdateErrorState = {
  kind: UpdateErrorKind
}

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

export const useAppStore = defineStore('app', () => {
  const isOnline = ref(window.navigator.onLine)
  const canInstall = ref(false)
  const installPending = ref(false)
  const installed = ref(isStandaloneMode())
  const installSurface = ref<InstallSurface>('hidden')
  const installModalVisible = ref(false)
  const installCoachVisible = ref(false)
  const installModalShown = ref(readStoredFlag(INSTALL_MODAL_SHOWN_STORAGE_KEY))
  // What: store only the update failure kind for the shell. Why: user-facing banners must stay localized and safe even when browser errors are highly technical.
  const updateError = ref<UpdateErrorState | null>(null)
  const appReadiness = ref<AppReadiness>('checking')
  // Keeping only the issue code here lets the shell translate failure copy locally instead of storing hydrated text in shared state.
  const blockingIssue = ref<BlockingIssue>(null)
  const dbConnected = ref(false)
  // What: keep setup completeness separate from database readiness. Why: the shell must distinguish between "cannot boot" and "booted, but still missing required local identity data".
  const setupStatus = ref<SetupStatus>('checking')
  // What: keep demo-mode bootstrap state in Pinia instead of deriving it from routes. Why: the shell has to react immediately after startup seeding and after leaving demo mode, before any navigation settles.
  const demoModeActive = ref(false)
  const demoIntroModalVisible = ref(false)

  const showInstallEntry = computed(
    () => !installed.value && installSurface.value !== 'hidden'
  )
  const shouldAutoOpenInstallModal = computed(
    () =>
      appReadiness.value === 'ready' &&
      showInstallEntry.value &&
      !installModalShown.value
  )

  function setOnlineStatus(value: boolean) {
    isOnline.value = value
  }

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

  function setAppReady() {
    appReadiness.value = 'ready'
    blockingIssue.value = null
  }

  function blockApplication(issue: Exclude<BlockingIssue, null>) {
    appReadiness.value = 'blocked'
    blockingIssue.value = issue
  }

  function setUpdateError(value: UpdateErrorState | null) {
    updateError.value = value
  }

  function clearUpdateError() {
    updateError.value = null
  }

  function setDbConnected(value: boolean) {
    dbConnected.value = value
  }

  function setSetupStatus(value: SetupStatus) {
    setupStatus.value = value
  }

  function setDemoModeActive(value: boolean) {
    demoModeActive.value = value

    if (!value) {
      demoIntroModalVisible.value = false
    }
  }

  function showDemoIntroModal() {
    demoIntroModalVisible.value = true
  }

  function dismissDemoIntroModal() {
    demoIntroModalVisible.value = false
  }

  return {
    isOnline,
    canInstall,
    installPending,
    installed,
    installSurface,
    installModalVisible,
    installCoachVisible,
    installModalShown,
    showInstallEntry,
    shouldAutoOpenInstallModal,
    updateError,
    appReadiness,
    blockingIssue,
    dbConnected,
    setupStatus,
    demoModeActive,
    demoIntroModalVisible,
    setOnlineStatus,
    setInstallAvailability,
    setInstallSurface,
    setInstallPending,
    setInstalled,
    markInstallModalShown,
    openInstallModal,
    dismissInstallModal,
    showInstallCoach,
    hideInstallCoach,
    setAppReady,
    blockApplication,
    setUpdateError,
    clearUpdateError,
    setDbConnected,
    setSetupStatus,
    setDemoModeActive,
    showDemoIntroModal,
    dismissDemoIntroModal
  }
})
