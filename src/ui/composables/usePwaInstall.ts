import { computed, onMounted, onUnmounted, shallowRef } from 'vue'

import { useAppStore } from '@/ui/stores/app'

type BeforeInstallPromptOutcome = {
  outcome: 'accepted' | 'dismissed'
  platform: string
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<BeforeInstallPromptOutcome>
}

export type InstallInstructions = {
  title: string
  steps: string[]
}

function isAppleTouchDevice() {
  const userAgent = window.navigator.userAgent.toLowerCase()

  // iPadOS can present a desktop-class Macintosh UA, so touch capability keeps the manual install path reachable on tablets too.
  return (
    /iphone|ipad|ipod/.test(userAgent) ||
    (userAgent.includes('macintosh') && window.navigator.maxTouchPoints > 1)
  )
}

function isManualInstallBrowser() {
  const userAgent = window.navigator.userAgent.toLowerCase()
  const vendor = (window.navigator.vendor ?? '').toLowerCase()
  const isSafari =
    vendor.includes('apple') &&
    !userAgent.includes('crios') &&
    !userAgent.includes('fxios')

  return isAppleTouchDevice() && isSafari
}

function getManualInstallInstructions(): InstallInstructions {
  if (isAppleTouchDevice()) {
    return {
      title: 'Dodaj do ekranu głównego',
      steps: [
        'Stuknij przycisk Udostępnij w Safari.',
        'Wybierz Do ekranu głównego i potwierdź dodanie aplikacji.'
      ]
    }
  }

  return {
    title: 'Zainstaluj z menu przeglądarki',
    steps: [
      'Otwórz menu przeglądarki.',
      'Wybierz opcję instalacji aplikacji lub dodania jej do ekranu głównego.'
    ]
  }
}

export function usePwaInstall() {
  const appStore = useAppStore()
  const deferredPrompt = shallowRef<BeforeInstallPromptEvent | null>(null)

  const onBeforeInstallPrompt = (event: Event) => {
    const promptEvent = event as BeforeInstallPromptEvent
    promptEvent.preventDefault()
    deferredPrompt.value = promptEvent
    appStore.setInstallSurface('native')
  }

  const onAppInstalled = () => {
    deferredPrompt.value = null
    appStore.setInstalled(true)
    appStore.setInstallPending(false)
  }

  onMounted(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches

    appStore.setInstalled(isStandalone)

    if (!isStandalone && isManualInstallBrowser()) {
      // Apple touch browsers that skip beforeinstallprompt still need an install affordance because the app is designed around mobile-first PWA use.
      appStore.setInstallSurface('manual')
    }

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
      } else {
        // The browser prompt is single-use, so the shell should wait for a fresh event before showing a native install CTA again.
        appStore.setInstallSurface('hidden')
      }

      deferredPrompt.value = null
      return wasAccepted
    } finally {
      appStore.setInstallPending(false)
    }
  }

  const installInstructions = computed(() =>
    appStore.installSurface === 'manual' ? getManualInstallInstructions() : null
  )

  return { promptInstall, installInstructions }
}
