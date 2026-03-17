import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

function isStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches
}

export const useAppStore = defineStore('app', () => {
  const isOnline = ref(window.navigator.onLine)
  const canInstall = ref(false)
  const installPending = ref(false)
  const installed = ref(isStandaloneMode())
  const needRefresh = ref(false)
  const offlineReady = ref(false)
  const updatePending = ref(false)
  const updateError = ref<string | null>(null)
  const swRegistered = ref(false)
  const dbConnected = ref(false)

  const shellTone = computed<'online' | 'offline' | 'update'>(() => {
    if (needRefresh.value) {
      return 'update'
    }

    return isOnline.value ? 'online' : 'offline'
  })

  function setOnlineStatus(value: boolean) {
    isOnline.value = value
  }

  function setInstallAvailability(value: boolean) {
    canInstall.value = value
  }

  function setInstallPending(value: boolean) {
    installPending.value = value
  }

  function setInstalled(value: boolean) {
    installed.value = value
    if (value) {
      canInstall.value = false
    }
  }

  function setNeedRefresh(value: boolean) {
    needRefresh.value = value
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

  function setUpdateError(value: string | null) {
    updateError.value = value
  }

  function setServiceWorkerRegistered(value: boolean) {
    swRegistered.value = value
  }

  function setDbConnected(value: boolean) {
    dbConnected.value = value
  }

  return {
    isOnline,
    canInstall,
    installPending,
    installed,
    needRefresh,
    offlineReady,
    updatePending,
    updateError,
    swRegistered,
    dbConnected,
    shellTone,
    setOnlineStatus,
    setInstallAvailability,
    setInstallPending,
    setInstalled,
    setNeedRefresh,
    setOfflineReady,
    dismissOfflineReady,
    setUpdatePending,
    setUpdateError,
    setServiceWorkerRegistered,
    setDbConnected
  }
})
