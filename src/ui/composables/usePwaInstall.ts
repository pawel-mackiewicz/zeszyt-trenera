import { computed, onMounted, onUnmounted, shallowRef } from 'vue'

import { useAppInstallStore } from '@/ui/features/app_install/app-install.store'

type BeforeInstallPromptOutcome = {
  outcome: 'accepted' | 'dismissed'
  platform: string
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<BeforeInstallPromptOutcome>
}

export type ManualInstallVariant = 'iosSafari'

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

export function usePwaInstall() {
  const appInstallStore = useAppInstallStore()
  const deferredPrompt = shallowRef<BeforeInstallPromptEvent | null>(null)

  const onBeforeInstallPrompt = (event: Event) => {
    const promptEvent = event as BeforeInstallPromptEvent
    promptEvent.preventDefault()
    deferredPrompt.value = promptEvent
    appInstallStore.setInstallSurface('native')
  }

  const onAppInstalled = () => {
    deferredPrompt.value = null
    appInstallStore.setInstalled(true)
    appInstallStore.setInstallPending(false)
  }

  onMounted(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches

    appInstallStore.setInstalled(isStandalone)

    if (!isStandalone && isManualInstallBrowser()) {
      // Apple touch browsers that skip beforeinstallprompt still need an install affordance because the app is designed around mobile-first PWA use.
      appInstallStore.setInstallSurface('manual')
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

    appInstallStore.setInstallPending(true)

    try {
      await deferredPrompt.value.prompt()
      const choice = await deferredPrompt.value.userChoice
      const wasAccepted = choice.outcome === 'accepted'

      if (wasAccepted) {
        appInstallStore.setInstalled(true)
      } else {
        // The browser prompt is single-use, so the shell should wait for a fresh event before showing a native install CTA again.
        appInstallStore.setInstallSurface('hidden')
      }

      deferredPrompt.value = null
      return wasAccepted
    } finally {
      appInstallStore.setInstallPending(false)
    }
  }

  const manualInstallVariant = computed(() =>
    // What: expose the one manual-install recipe the shell can render today. Why: manual mode is only reachable on iOS Safari, so broader variants would only create dead UI branches.
    appInstallStore.installSurface === 'manual' ? 'iosSafari' : null
  )

  return { promptInstall, manualInstallVariant }
}
