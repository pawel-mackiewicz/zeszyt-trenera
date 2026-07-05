/// <reference types="vite/client" />

// What: keep app-local ambient declarations that Vite and generated virtual modules do not provide to TypeScript.
// Why: this file must stay script-mode so `virtual:pwa-register/vue` and `__APP_VERSION__` are visible globally without shadowing package exports.
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

declare const __APP_VERSION__: string
