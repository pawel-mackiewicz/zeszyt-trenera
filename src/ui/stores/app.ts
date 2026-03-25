import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export type AppReadiness = 'checking' | 'ready' | 'blocked'
export type BlockingIssue = 'database' | 'bootstrap' | null
export type InstallSurface = 'hidden' | 'native' | 'manual'

const INSTALL_MODAL_SHOWN_STORAGE_KEY =
  'zeszyt-trenera.install-modal-shown-once'

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
  const needRefresh = ref(false)
  const updateModalVisible = ref(false)
  const offlineReady = ref(false)
  const updatePending = ref(false)
  const updateError = ref<string | null>(null)
  const appReadiness = ref<AppReadiness>('checking')
  const blockingIssue = ref<BlockingIssue>(null)
  const blockingMessage = ref<string | null>(null)
  const dbConnected = ref(false)

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
    blockingMessage.value = null
  }

  function blockApplication(
    issue: Exclude<BlockingIssue, null>,
    message: string
  ) {
    appReadiness.value = 'blocked'
    blockingIssue.value = issue
    blockingMessage.value = message
  }

  function setNeedRefresh(value: boolean) {
    needRefresh.value = value

    if (value) {
      updateModalVisible.value = true
      return
    }

    updateModalVisible.value = false
  }

  function setOfflineReady(value: boolean) {
    offlineReady.value = value
  }

  function dismissOfflineReady() {
    offlineReady.value = false
  }

  function setUpdatePending(value: boolean) {
    updatePending.value = value
  }

  function dismissUpdateModal() {
    updateModalVisible.value = false
  }

  function setUpdateError(value: string | null) {
    updateError.value = value
  }

  function clearUpdateError() {
    updateError.value = null
  }

  function setDbConnected(value: boolean) {
    dbConnected.value = value
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
    needRefresh,
    updateModalVisible,
    offlineReady,
    updatePending,
    updateError,
    appReadiness,
    blockingIssue,
    blockingMessage,
    dbConnected,
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
    setNeedRefresh,
    setOfflineReady,
    dismissOfflineReady,
    setUpdatePending,
    dismissUpdateModal,
    setUpdateError,
    clearUpdateError,
    setDbConnected
  }
})
