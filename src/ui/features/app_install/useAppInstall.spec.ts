import { createPinia, setActivePinia } from 'pinia'
import { computed, nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { usePwaInstall } from '@/ui/composables/usePwaInstall'
import { useAppInstallStore } from '@/ui/features/app_install/app-install.store'
import { useDemoStore } from '@/ui/features/demo/demo.store'
import { useAppStore } from '@/ui/stores/app'
import { InstallModalStatus } from '@/ui/features/app_install/InstallModal.contract'
import { useAppInstall } from '@/ui/features/app_install/useAppInstall'

vi.mock('@/ui/composables/usePwaInstall', () => ({
  usePwaInstall: vi.fn()
}))

describe('useAppInstall', () => {
  let promptInstall: Mock<() => Promise<boolean>>

  beforeEach(() => {
    window.localStorage.clear()
    promptInstall = vi.fn().mockResolvedValue(false)
  })

  function mountInstallModalController(
    options: Partial<{
      manualInstallVariant: 'iosSafari' | null
    }> = {}
  ) {
    const pinia = createPinia()
    setActivePinia(pinia)
    const appStore = useAppStore()
    const installStore = useAppInstallStore()
    const demoStore = useDemoStore()

    vi.mocked(usePwaInstall).mockReturnValue({
      promptInstall,
      manualInstallVariant: computed(
        () =>
          options.manualInstallVariant ??
          (installStore.installSurface === 'manual' ? 'iosSafari' : null)
      )
    })

    const composable = useAppInstall()

    return {
      appStore,
      composable,
      demoStore,
      installStore,
      promptInstall
    }
  }

  function makeShellReady(appStore: ReturnType<typeof useAppStore>) {
    appStore.setAppReady()
    appStore.setSetupStatus('ready')
  }

  it('keeps the modal hidden until shell readiness and modal visibility are true', () => {
    const { appStore, composable, installStore } = mountInstallModalController()

    installStore.setInstallSurface('native')
    installStore.openInstallModal()
    expect(composable.installModalStatus.value).toBe(InstallModalStatus.Hidden)
    expect(composable.isInstallModalVisible.value).toBe(false)

    makeShellReady(appStore)
    expect(composable.installModalStatus.value).toBe(
      InstallModalStatus.NativeReady
    )
    expect(composable.isInstallModalVisible.value).toBe(true)
    expect(composable.isInstallModalPending.value).toBe(false)
  })

  it('maps manual and native pending statuses for the smart component', () => {
    const { appStore, composable, installStore } = mountInstallModalController()

    makeShellReady(appStore)
    installStore.setInstallSurface('manual')
    installStore.openInstallModal()
    expect(composable.installModalStatus.value).toBe(
      InstallModalStatus.ManualReady
    )
    expect(composable.isInstallModalManual.value).toBe(true)
    expect(composable.isInstallModalPending.value).toBe(false)

    installStore.setInstallSurface('native')
    installStore.setInstallPending(true)
    expect(composable.installModalStatus.value).toBe(
      InstallModalStatus.NativePending
    )
    expect(composable.isInstallModalManual.value).toBe(false)
    expect(composable.isInstallModalPending.value).toBe(true)
  })

  it('dismisses the manual modal on primary action without touching native prompt flow', async () => {
    const { appStore, composable, installStore, promptInstall } =
      mountInstallModalController()

    makeShellReady(appStore)
    installStore.setInstallSurface('manual')
    installStore.openInstallModal()
    await nextTick()

    await composable.handleInstallPrimaryAction()

    // What: keep manual mode on a single dismiss-only CTA. Why: iOS Safari does not expose a native install prompt, so the primary action should only close guidance.
    expect(promptInstall).not.toHaveBeenCalled()
    expect(installStore.installModalVisible).toBe(false)
  })

  it('closes install surfaces after accepted native prompt', async () => {
    const { appStore, composable, installStore, promptInstall } =
      mountInstallModalController()

    makeShellReady(appStore)
    installStore.setInstallSurface('native')
    installStore.openInstallModal()
    installStore.showInstallCoach()
    promptInstall.mockResolvedValueOnce(true)
    await nextTick()

    await composable.handleInstallPrimaryAction()

    expect(promptInstall).toHaveBeenCalledTimes(1)
    expect(installStore.installModalVisible).toBe(false)
    expect(installStore.installCoachVisible).toBe(false)
  })

  it('keeps install surfaces open when native prompt is dismissed and entry is still available', async () => {
    const { appStore, composable, installStore, promptInstall } =
      mountInstallModalController()

    makeShellReady(appStore)
    installStore.setInstallSurface('native')
    installStore.openInstallModal()
    promptInstall.mockResolvedValueOnce(false)
    await nextTick()

    await composable.handleInstallPrimaryAction()

    expect(installStore.installModalVisible).toBe(true)
    expect(installStore.showInstallEntry).toBe(true)
  })

  it('closes the modal from the later action', async () => {
    const { appStore, composable, installStore } = mountInstallModalController()

    makeShellReady(appStore)
    installStore.setInstallSurface('native')
    installStore.openInstallModal()
    await nextTick()
    composable.handleInstallLater()

    expect(installStore.installModalVisible).toBe(false)
  })

  it('auto-opens the install modal once when the ready shell becomes installable', async () => {
    const { appStore, installStore } = mountInstallModalController()

    installStore.setInstallSurface('native')
    makeShellReady(appStore)
    await nextTick()

    // What: keep the auto-open assertion at the feature boundary. Why: the install feature now owns first-run PWA nudging instead of AppShell watchers.
    expect(installStore.installModalVisible).toBe(true)
    expect(installStore.installModalShown).toBe(true)
  })

  it('waits for the demo intro modal to close before auto-opening the install modal', async () => {
    const { appStore, demoStore, installStore } = mountInstallModalController()

    demoStore.showDemoIntroModal()
    installStore.setInstallSurface('native')
    makeShellReady(appStore)
    await nextTick()

    expect(installStore.installModalVisible).toBe(false)

    demoStore.dismissDemoIntroModal()
    await nextTick()

    expect(installStore.installModalVisible).toBe(true)
  })

  it('collapses install-only surfaces while demo mode is active', async () => {
    const { appStore, demoStore, installStore } = mountInstallModalController()

    makeShellReady(appStore)
    installStore.setInstallSurface('native')
    installStore.openInstallModal()
    installStore.showInstallCoach()

    demoStore.setDemoModeActive(true)
    await nextTick()

    expect(installStore.installModalVisible).toBe(false)
    expect(installStore.installCoachVisible).toBe(false)
  })
})
