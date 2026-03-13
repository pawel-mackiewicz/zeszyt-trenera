import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useAppStore } from '@/stores/app'

describe('useAppStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('tracks shell state transitions', () => {
    const store = useAppStore()

    store.setInstallAvailability(true)
    store.setNeedRefresh(true)
    store.setOnlineStatus(false)
    store.setDbConnected(true)

    expect(store.canInstall).toBe(true)
    expect(store.needRefresh).toBe(true)
    expect(store.isOnline).toBe(false)
    expect(store.dbConnected).toBe(true)
    expect(store.shellTone).toBe('update')
  })

  it('marks the app installed and hides the install button', () => {
    const store = useAppStore()

    store.setInstallAvailability(true)
    store.setInstalled(true)

    expect(store.installed).toBe(true)
    expect(store.canInstall).toBe(false)
  })
})
