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
  })

  // What: keep this store focused on readiness and setup state. Why: install and update workflows now live behind dedicated feature stores instead of growing the bootstrap store.
})
