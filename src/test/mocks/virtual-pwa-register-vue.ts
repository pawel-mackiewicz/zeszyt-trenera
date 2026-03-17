import { ref } from 'vue'

type RegisterOptions = {
  onRegisteredSW?: (
    swUrl: string,
    registration: ServiceWorkerRegistration | undefined
  ) => void
  onRegisterError?: (error: unknown) => void
}

export function useRegisterSW(options: RegisterOptions = {}) {
  try {
    options.onRegisteredSW?.('', undefined)
  } catch (error) {
    options.onRegisterError?.(error)
  }

  return {
    needRefresh: ref(false),
    offlineReady: ref(false),
    updateServiceWorker: async () => undefined
  }
}
