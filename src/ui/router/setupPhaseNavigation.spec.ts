import { createPinia, setActivePinia } from 'pinia'
import { nextTick, ref, type Ref } from 'vue'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import type { AppQueries } from '@/appServices'
import type { SetupStatus } from '@/read/ObserveSetupStatusQuery'
import type { RouteLocationNormalizedLoaded, Router } from '@/ui/router/runtime'
import {
  installSetupPhaseNavigation,
  resolveSetupRedirectTarget
} from '@/ui/router/setupPhaseNavigation'
import { useAppStore } from '@/ui/stores/app'

type SetupStatusObserver = {
  next(value: SetupStatus): void
  error?(error: unknown): void
}

type TestRoute = Pick<RouteLocationNormalizedLoaded, 'name' | 'fullPath'>

describe('setup phase navigation', () => {
  let currentRoute: Ref<TestRoute>
  let mockBeforeEach: Mock
  let mockReplace: Mock
  let mockRemoveGuard: Mock
  let mockUnsubscribe: Mock
  let mockObserveSetupStatus: Mock
  let setupGuard:
    | ((to: RouteLocationNormalizedLoaded) => string | undefined)
    | null
  let setupStatusObserver: SetupStatusObserver | null

  beforeEach(() => {
    setActivePinia(createPinia())
    currentRoute = ref({
      name: 'members-list',
      fullPath: '/members'
    })
    mockRemoveGuard = vi.fn()
    mockReplace = vi.fn((target: string) => {
      currentRoute.value = routeForPath(target)
      return Promise.resolve()
    })
    setupGuard = null
    mockBeforeEach = vi.fn((guard: typeof setupGuard) => {
      setupGuard = guard
      return mockRemoveGuard
    })
    mockUnsubscribe = vi.fn()
    setupStatusObserver = null
    mockObserveSetupStatus = vi.fn(() => ({
      subscribe(observer: SetupStatusObserver) {
        setupStatusObserver = observer

        return {
          unsubscribe: mockUnsubscribe
        }
      }
    }))
  })

  function createRouter() {
    return {
      currentRoute,
      beforeEach: mockBeforeEach,
      replace: mockReplace
    } as unknown as Router
  }

  function createQueries() {
    return {
      observeSetupStatus: {
        handle: mockObserveSetupStatus
      }
    } as unknown as Pick<AppQueries, 'observeSetupStatus'>
  }

  function installNavigation() {
    const appStore = useAppStore()
    const dispose = installSetupPhaseNavigation({
      router: createRouter(),
      appStore,
      queries: createQueries()
    })

    return { appStore, dispose }
  }

  function emitSetupStatus(value: SetupStatus) {
    setupStatusObserver?.next(value)
  }

  function emitSetupError(error: unknown) {
    setupStatusObserver?.error?.(error)
  }

  function resolveGuardRedirect(route: TestRoute) {
    return setupGuard?.(route as RouteLocationNormalizedLoaded)
  }

  function routeForPath(path: string): TestRoute {
    const routeName = path === '/setup/club' ? 'setup-club' : 'setup-trainer'

    return {
      name: path === '/members' ? 'members-list' : routeName,
      fullPath: path
    }
  }

  it('keeps navigation open while setup state is still bootstrapping', () => {
    expect(
      resolveSetupRedirectTarget({
        appReadiness: 'ready',
        setupStatus: 'checking',
        routeName: 'members-list'
      })
    ).toBeNull()
  })

  it('resolves setup redirects from current app readiness and setup status', () => {
    expect(
      resolveSetupRedirectTarget({
        appReadiness: 'ready',
        setupStatus: 'requires-club',
        routeName: 'members-list'
      })
    ).toBe('/setup/club')
    expect(
      resolveSetupRedirectTarget({
        appReadiness: 'ready',
        setupStatus: 'requires-trainer',
        routeName: 'setup-club'
      })
    ).toBe('/setup/trainer')
    expect(
      resolveSetupRedirectTarget({
        appReadiness: 'ready',
        setupStatus: 'ready',
        routeName: 'setup-trainer'
      })
    ).toBe('/members')
  })

  it('does not observe setup status before the app is ready', async () => {
    installNavigation()

    await nextTick()

    expect(mockObserveSetupStatus).not.toHaveBeenCalled()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('subscribes after readiness and redirects missing club setup through the router', async () => {
    const { appStore } = installNavigation()

    appStore.setAppReady()
    await nextTick()
    emitSetupStatus('requires-club')

    expect(mockObserveSetupStatus).toHaveBeenCalledTimes(1)
    expect(appStore.setupStatus).toBe('requires-club')
    expect(mockReplace).toHaveBeenCalledWith('/setup/club')
  })

  it('guards direct navigation after setup status is known', async () => {
    const { appStore } = installNavigation()

    appStore.setAppReady()
    await nextTick()
    emitSetupStatus('requires-club')

    expect(
      resolveGuardRedirect({
        name: 'members-list',
        fullPath: '/members'
      })
    ).toBe('/setup/club')
  })

  it('moves the setup route from club to trainer after the club is saved', async () => {
    currentRoute.value = {
      name: 'setup-club',
      fullPath: '/setup/club'
    }
    const { appStore } = installNavigation()

    appStore.setAppReady()
    await nextTick()
    emitSetupStatus('requires-trainer')

    expect(mockReplace).toHaveBeenCalledWith('/setup/trainer')
  })

  it('returns to members once setup is complete on a setup route', async () => {
    currentRoute.value = {
      name: 'setup-trainer',
      fullPath: '/setup/trainer'
    }
    const { appStore } = installNavigation()

    appStore.setAppReady()
    await nextTick()
    emitSetupStatus('ready')

    expect(mockReplace).toHaveBeenCalledWith('/members')
  })

  it('blocks the app when the setup read model fails', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    const readError = new Error('setup read failed')
    const { appStore } = installNavigation()

    appStore.setAppReady()
    await nextTick()
    emitSetupError(readError)

    expect(appStore.appReadiness).toBe('blocked')
    expect(appStore.blockingIssue).toBe('bootstrap')
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1)
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to observe application setup status.',
      readError
    )

    consoleErrorSpy.mockRestore()
  })

  it('removes the guard and subscription when disposed', async () => {
    const { appStore, dispose } = installNavigation()

    appStore.setAppReady()
    await nextTick()
    dispose()

    expect(mockRemoveGuard).toHaveBeenCalledTimes(1)
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1)
  })
})
