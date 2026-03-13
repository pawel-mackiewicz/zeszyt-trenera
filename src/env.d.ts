/// <reference types="vite/client" />

declare module 'virtual:pwa-register/vue' {
  import type { Ref } from 'vue'

  export function useRegisterSW(options?: {
    immediate?: boolean
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void
    onRegisteredSW?: (
      swScriptUrl: string,
      registration: ServiceWorkerRegistration | undefined
    ) => void
    onRegisterError?: (error: unknown) => void
  }): {
    needRefresh: Ref<boolean>
    offlineReady: Ref<boolean>
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>
  }
}

declare module 'vue-router' {
  interface RouteMeta {
    title: string
    eyebrow: string
    summary: string
    navLabel: string
  }
}
