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
      // What: keep the browser failure in developer logs only. Why: update banners should stay product-facing even when the underlying runtime error is technical.
      console.error('Failed to prepare offline mode.', error)
      // Service-worker registration issues degrade offline behavior, but they should not block the local notebook from opening.
      appStore.setUpdateError({
        kind: 'registration'
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
      // What: keep activation diagnostics out of the user banner. Why: the recovery step is the same regardless of the raw browser error text.
      console.error('Failed to activate the latest app version.', error)
      appStore.setUpdateError({
        kind: 'activation'
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
