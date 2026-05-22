import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useAppStore } from '@/ui/stores/app'
import { useDemoStore } from '@/ui/features/demo/demo.store'

describe('useAppStore', () => {
  beforeEach(() => {
    window.localStorage.clear()
    setActivePinia(createPinia())
  })

  it('tracks readiness transitions and connectivity state for the shell', () => {
    const store = useAppStore()

    store.setOnlineStatus(false)
    store.setDbConnected(true)
    store.setAppReady()
    store.setSetupStatus('requires-club')

    expect(store.appReadiness).toBe('ready')
    expect(store.isOnline).toBe(false)
    expect(store.dbConnected).toBe(true)
    expect(store.setupStatus).toBe('requires-club')
  })

  it('shows the install modal only once per device storage for automatic prompts', () => {
    const store = useAppStore()

    store.setInstallSurface('native')
    store.setAppReady()

    expect(store.shouldAutoOpenInstallModal).toBe(true)

    store.openInstallModal('automatic')
    store.dismissInstallModal()

    setActivePinia(createPinia())

    const reloadedStore = useAppStore()

    reloadedStore.setInstallSurface('native')
    reloadedStore.setAppReady()

    expect(reloadedStore.installModalShown).toBe(true)
    expect(reloadedStore.shouldAutoOpenInstallModal).toBe(false)
  })

  it('marks the app installed and hides install-specific UI', () => {
    const store = useAppStore()

    store.setInstallSurface('native')
    store.openInstallModal()
    store.showInstallCoach()
    store.setInstalled(true)

    expect(store.installed).toBe(true)
    expect(store.showInstallEntry).toBe(false)
    expect(store.installModalVisible).toBe(false)
    expect(store.installCoachVisible).toBe(false)
  })

  it('suppresses install entry points while demo mode is active', () => {
    const store = useAppStore()
    const demoStore = useDemoStore()

    store.setInstallSurface('native')
    demoStore.setDemoModeActive(true)

    expect(store.showInstallEntry).toBe(false)

    demoStore.setDemoModeActive(false)

    expect(store.showInstallEntry).toBe(true)
  })

  // What: keep this store focused on readiness and install state. Why: PWA update errors now live in the dedicated app-update store where registration and activation are guarded together.
})
