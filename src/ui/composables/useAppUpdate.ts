import { watch } from 'vue'

import { registerPwa } from '@/ui/pwa/register'
import { useAppStore } from '@/ui/stores/app'

export function useAppUpdate() {
  const appStore = useAppStore()
  const { needRefresh, offlineReady, updateServiceWorker } = registerPwa({
    immediate: true,
    onRegisterError: (error) => {
      // Service-worker registration issues degrade offline behavior, but they should not block the local notebook from opening.
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
