import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { usePwaInstall } from '@/ui/composables/usePwaInstall'
import { useAppStore } from '@/ui/stores/app'

describe('usePwaInstall', () => {
  const originalUserAgentDescriptor = Object.getOwnPropertyDescriptor(
    window.navigator,
    'userAgent'
  )
  const originalVendorDescriptor = Object.getOwnPropertyDescriptor(
    window.navigator,
    'vendor'
  )
  const originalMaxTouchPointsDescriptor = Object.getOwnPropertyDescriptor(
    window.navigator,
    'maxTouchPoints'
  )

  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    if (originalUserAgentDescriptor) {
      Object.defineProperty(
        window.navigator,
        'userAgent',
        originalUserAgentDescriptor
      )
    }

    if (originalVendorDescriptor) {
      Object.defineProperty(
        window.navigator,
        'vendor',
        originalVendorDescriptor
      )
    }

    if (originalMaxTouchPointsDescriptor) {
      Object.defineProperty(
        window.navigator,
        'maxTouchPoints',
        originalMaxTouchPointsDescriptor
      )
    }
  })

  function mountProbe() {
    const pinia = createPinia()
    let api!: ReturnType<typeof usePwaInstall>

    setActivePinia(pinia)

    const Probe = defineComponent({
      setup() {
        api = usePwaInstall()
        return () => null
      }
    })

    mount(Probe, {
      global: {
        plugins: [pinia]
      }
    })

    return { api, store: useAppStore() }
  }

  it('promotes native prompt availability into the shared install state', async () => {
    const { api, store } = mountProbe()
    const installEvent = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>
      userChoice: Promise<{
        outcome: 'accepted' | 'dismissed'
        platform: string
      }>
    }

    installEvent.prompt = async () => undefined
    installEvent.userChoice = Promise.resolve({
      outcome: 'accepted',
      platform: 'web'
    })

    window.dispatchEvent(installEvent)

    expect(store.installSurface).toBe('native')
    expect(store.canInstall).toBe(true)
    await expect(api.promptInstall()).resolves.toBe(true)
    expect(store.installed).toBe(true)
  })

  it('falls back to manual guidance on iOS Safari where no native prompt exists', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    })
    Object.defineProperty(window.navigator, 'vendor', {
      configurable: true,
      value: 'Apple Computer, Inc.'
    })

    const { api, store } = mountProbe()

    expect(store.installSurface).toBe('manual')
    expect(api.installInstructions.value?.title).toBe(
      'Dodaj do ekranu głównego'
    )
  })

  it('falls back to manual guidance on iPadOS Safari with a desktop-class user agent', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
    })
    Object.defineProperty(window.navigator, 'vendor', {
      configurable: true,
      value: 'Apple Computer, Inc.'
    })
    Object.defineProperty(window.navigator, 'maxTouchPoints', {
      configurable: true,
      value: 5
    })

    const { api, store } = mountProbe()

    expect(store.installSurface).toBe('manual')
    expect(api.installInstructions.value?.title).toBe(
      'Dodaj do ekranu głównego'
    )
  })

  it('does not show manual install guidance on desktop Safari', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
    })
    Object.defineProperty(window.navigator, 'vendor', {
      configurable: true,
      value: 'Apple Computer, Inc.'
    })
    Object.defineProperty(window.navigator, 'maxTouchPoints', {
      configurable: true,
      value: 0
    })

    const { api, store } = mountProbe()

    expect(store.installSurface).toBe('hidden')
    expect(api.installInstructions.value).toBeNull()
  })
})
