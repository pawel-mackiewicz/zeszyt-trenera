import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useAppInstallStore } from '@/ui/features/app_install/app-install.store'
import { useDemoStore } from '@/ui/features/demo/demo.store'
import { useAppStore } from '@/ui/stores/app'

describe('useAppInstallStore', () => {
  beforeEach(() => {
    window.localStorage.clear()
    setActivePinia(createPinia())
  })

  it('shows the install modal only once per device storage for automatic prompts', () => {
    const appStore = useAppStore()
    const installStore = useAppInstallStore()

    installStore.setInstallSurface('native')
    appStore.setAppReady()

    expect(installStore.shouldAutoOpenInstallModal).toBe(true)

    installStore.openInstallModal('automatic')
    installStore.dismissInstallModal()

    setActivePinia(createPinia())

    const reloadedAppStore = useAppStore()
    const reloadedInstallStore = useAppInstallStore()

    reloadedInstallStore.setInstallSurface('native')
    reloadedAppStore.setAppReady()

    expect(reloadedInstallStore.installModalShown).toBe(true)
    expect(reloadedInstallStore.shouldAutoOpenInstallModal).toBe(false)
  })

  it('marks the app installed and hides the install modal', () => {
    const installStore = useAppInstallStore()

    installStore.setInstallSurface('native')
    installStore.openInstallModal()
    installStore.setInstalled(true)

    expect(installStore.installed).toBe(true)
    expect(installStore.showInstallEntry).toBe(false)
    expect(installStore.installModalVisible).toBe(false)
  })

  it('suppresses install entry points while demo mode is active', () => {
    const installStore = useAppInstallStore()
    const demoStore = useDemoStore()

    installStore.setInstallSurface('native')
    demoStore.setDemoModeActive(true)

    expect(installStore.showInstallEntry).toBe(false)

    demoStore.setDemoModeActive(false)

    expect(installStore.showInstallEntry).toBe(true)
  })
})
