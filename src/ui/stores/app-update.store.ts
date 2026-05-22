import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

import { registerPwa } from '@/ui/pwa/register'

export type AppUpdateErrorKind = 'registration' | 'activation'
export type AppUpdateErrorState = {
  kind: AppUpdateErrorKind
}

type PwaUpdateActivator = (reloadPage?: boolean) => Promise<void> | void

export const useAppUpdateStore = defineStore('appUpdate', () => {
  const updateAvailable = ref(false)
  const updatePending = ref(false)
  // What: keep update failures in a dedicated shell workflow store. Why: menu actions and floating banners need one safe, localized state source without coupling PWA registration to the broad app store.
  const updateError = ref<AppUpdateErrorState | null>(null)
  let registrationStarted = false
  let updateServiceWorker: PwaUpdateActivator | null = null

  function registerUpdateChecks() {
    if (registrationStarted) {
      return
    }

    registrationStarted = true

    try {
      // What: register once from the shell lifecycle and mirror the PWA plugin ref into store state. Why: repeated shell consumers must not create duplicate service-worker registrations.
      const registration = registerPwa({
        immediate: true,
        onRegisterError: (error) => {
          console.error('Failed to prepare offline mode.', error)
          updateError.value = {
            kind: 'registration'
          }
        }
      })

      updateServiceWorker = registration.updateServiceWorker
      watch(
        registration.needRefresh,
        (value) => {
          updateAvailable.value = value
        },
        { immediate: true }
      )
    } catch (error) {
      console.error('Failed to prepare offline mode.', error)
      updateError.value = {
        kind: 'registration'
      }
    }
  }

  async function activateWaitingUpdate() {
    if (updatePending.value) {
      return
    }

    // What: activate only after an explicit menu action. Why: mobile-first local sessions should not reload while the coach is entering data.
    updatePending.value = true
    updateError.value = null

    try {
      if (!updateServiceWorker) {
        throw new Error('PWA update registration is not ready.')
      }

      await updateServiceWorker(true)
    } catch (error) {
      console.error('Failed to activate the latest app version.', error)
      updateError.value = {
        kind: 'activation'
      }
    } finally {
      updatePending.value = false
    }
  }

  function clearUpdateError() {
    updateError.value = null
  }

  return {
    updateAvailable,
    updatePending,
    updateError,
    registerUpdateChecks,
    activateWaitingUpdate,
    clearUpdateError
  }
})
