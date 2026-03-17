import { onMounted, onUnmounted, shallowRef } from 'vue'

import { useAppStore } from '@/ui/stores/app'

type BeforeInstallPromptOutcome = {
  outcome: 'accepted' | 'dismissed'
  platform: string
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<BeforeInstallPromptOutcome>
}

export function usePwaInstall() {
  const appStore = useAppStore()
  const deferredPrompt = shallowRef<BeforeInstallPromptEvent | null>(null)

  const onBeforeInstallPrompt = (event: Event) => {
    const promptEvent = event as BeforeInstallPromptEvent
    promptEvent.preventDefault()
    deferredPrompt.value = promptEvent
    appStore.setInstallAvailability(true)
  }

  const onAppInstalled = () => {
    deferredPrompt.value = null
    appStore.setInstalled(true)
    appStore.setInstallPending(false)
  }

  onMounted(() => {
    appStore.setInstalled(
      window.matchMedia('(display-mode: standalone)').matches
    )
    window.addEventListener(
      'beforeinstallprompt',
      onBeforeInstallPrompt as EventListener
    )
    window.addEventListener('appinstalled', onAppInstalled)
  })

  onUnmounted(() => {
    window.removeEventListener(
      'beforeinstallprompt',
      onBeforeInstallPrompt as EventListener
    )
    window.removeEventListener('appinstalled', onAppInstalled)
  })

  const promptInstall = async () => {
    if (!deferredPrompt.value) {
      return false
    }

    appStore.setInstallPending(true)

    try {
      await deferredPrompt.value.prompt()
      const choice = await deferredPrompt.value.userChoice
      const wasAccepted = choice.outcome === 'accepted'

      if (wasAccepted) {
        appStore.setInstalled(true)
      }

      appStore.setInstallAvailability(false)
      deferredPrompt.value = null
      return wasAccepted
    } finally {
      appStore.setInstallPending(false)
    }
  }

  return { promptInstall }
}
