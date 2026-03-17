import { watch } from 'vue'

import { registerPwa } from '@/pwa/register'
import { useAppStore } from '@/stores/app'

export function useAppUpdate() {
  const appStore = useAppStore()
  const { needRefresh, offlineReady, updateServiceWorker } = registerPwa({
    immediate: true,
    onRegisteredSW: (_swUrl, registration) => {
      appStore.setServiceWorkerRegistered(Boolean(registration))
    },
    onRegisterError: (error) => {
      appStore.setUpdateError(
        error instanceof Error
          ? error.message
          : 'Service worker registration failed.'
      )
    }
  })

  watch(
    needRefresh,
    (value) => {
      appStore.setNeedRefresh(value)
    },
    { immediate: true }
  )

  watch(
    offlineReady,
    (value) => {
      appStore.setOfflineReady(value)
    },
    { immediate: true }
  )

  const refreshApplication = async () => {
    appStore.setUpdatePending(true)

    try {
      await updateServiceWorker(true)
    } finally {
      appStore.setUpdatePending(false)
    }
  }

  return { refreshApplication }
}
