import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useAppStore } from '@/ui/stores/app'

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
    expect(store.updateError).toBeNull()
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

  it('stores and clears service-worker registration errors without blocking the shell', () => {
    const store = useAppStore()

    store.setUpdateError({
      kind: 'registration'
    })

    expect(store.updateError).toEqual({
      kind: 'registration'
    })

    store.clearUpdateError()

    expect(store.updateError).toBeNull()
  })
})
