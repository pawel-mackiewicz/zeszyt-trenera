import { ref } from 'vue'

import { registerPwa } from '@/ui/pwa/register'
import { useAppStore } from '@/ui/stores/app'

export function useAppUpdate() {
  const appStore = useAppStore()
  const updatePending = ref(false)

  // Registering eagerly still warms the next version in the background, while skipping an in-session activation avoids interrupting active mobile work.
  const { needRefresh, updateServiceWorker } = registerPwa({
    immediate: true,
    onRegisterError: (error) => {
      // Service-worker registration issues degrade offline behavior, but they should not block the local notebook from opening.
      appStore.setUpdateError({
        kind: 'registration',
        detail: error instanceof Error ? error.message : null
      })
    }
  })

  const refreshApplication = async () => {
    // Keeping the activation behind an explicit menu action protects active mobile sessions from unexpected reloads.
    updatePending.value = true
    appStore.clearUpdateError()

    try {
      await updateServiceWorker(true)
    } catch (error) {
      appStore.setUpdateError({
        kind: 'activation',
        detail: error instanceof Error ? error.message : null
      })
    } finally {
      updatePending.value = false
    }
  }

  return {
    needRefresh,
    updatePending,
    refreshApplication
  }
}
