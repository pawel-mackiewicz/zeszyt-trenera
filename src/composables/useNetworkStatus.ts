import { onMounted, onUnmounted } from 'vue'

import { useAppStore } from '@/stores/app'

export function useNetworkStatus() {
  const appStore = useAppStore()

  const syncStatus = () => {
    appStore.setOnlineStatus(window.navigator.onLine)
  }

  onMounted(() => {
    syncStatus()
    window.addEventListener('online', syncStatus)
    window.addEventListener('offline', syncStatus)
  })

  onUnmounted(() => {
    window.removeEventListener('online', syncStatus)
    window.removeEventListener('offline', syncStatus)
  })
}
