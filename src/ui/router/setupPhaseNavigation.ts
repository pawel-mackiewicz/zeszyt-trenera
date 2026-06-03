import { watch, type WatchStopHandle } from 'vue'

import type { AppQueries } from '@/appServices'
import type { SetupStatus } from '@/read/ObserveSetupStatusQuery'
import type { AppRouteName } from '@/ui/router'
import type { RouteLocationNormalized, Router } from '@/ui/router/runtime'
import type { AppReadiness, useAppStore } from '@/ui/stores/app'

type SetupPhaseRouteName = AppRouteName | null
type AppStore = ReturnType<typeof useAppStore>

type ObservableSubscription = {
  unsubscribe(): void
}

export type SetupPhaseNavigationOptions = {
  readonly router: Router
  readonly appStore: AppStore
  readonly queries: Pick<AppQueries, 'observeSetupStatus'>
}

export type SetupRedirectInput = {
  readonly appReadiness: AppReadiness
  readonly setupStatus: SetupStatus
  readonly routeName: SetupPhaseRouteName
}

export function resolveSetupRedirectTarget({
  appReadiness,
  setupStatus,
  routeName
}: SetupRedirectInput) {
  if (appReadiness !== 'ready' || setupStatus === 'checking') {
    return null
  }

  if (setupStatus === 'requires-club') {
    return routeName === 'setup-club' ? null : '/setup/club'
  }

  if (setupStatus === 'requires-trainer') {
    return routeName === 'setup-trainer' ? null : '/setup/trainer'
  }

  return isSetupRoute(routeName) ? '/members' : null
}

export function installSetupPhaseNavigation({
  router,
  appStore,
  queries
}: SetupPhaseNavigationOptions) {
  let setupStatusSubscription: ObservableSubscription | null = null

  function unsubscribeSetupStatus() {
    setupStatusSubscription?.unsubscribe()
    setupStatusSubscription = null
  }

  function redirectCurrentRoute() {
    const currentRoute = router.currentRoute.value
    const redirectTarget = resolveSetupRedirectTarget({
      appReadiness: appStore.appReadiness,
      setupStatus: appStore.setupStatus,
      routeName: toAppRouteName(currentRoute)
    })

    if (!redirectTarget || currentRoute.fullPath === redirectTarget) {
      return
    }

    // What: repair the current route when setup state changes after a local write. Why: the first-run flow should advance immediately without setup forms coordinating shell navigation.
    void router.replace(redirectTarget)
  }

  function subscribeToSetupStatus() {
    if (setupStatusSubscription) {
      return
    }

    // What: reset setup routing before opening the live read model. Why: after database bootstrap, the PWA needs a neutral local-first loading state until the first setup snapshot arrives.
    appStore.setSetupStatus('checking')
    setupStatusSubscription = queries.observeSetupStatus.handle().subscribe({
      next(nextStatus) {
        appStore.setSetupStatus(nextStatus)
      },
      error(error) {
        unsubscribeSetupStatus()
        appStore.blockApplication('bootstrap')
        console.error('Failed to observe application setup status.', error)
      }
    })
  }

  const removeSetupGuard = router.beforeEach((to) => {
    const redirectTarget = resolveSetupRedirectTarget({
      appReadiness: appStore.appReadiness,
      setupStatus: appStore.setupStatus,
      routeName: toAppRouteName(to)
    })

    return redirectTarget && to.fullPath !== redirectTarget
      ? redirectTarget
      : undefined
  })

  const stopReadinessWatch = watch(
    () => appStore.appReadiness,
    (value) => {
      if (value === 'ready') {
        subscribeToSetupStatus()
        return
      }

      unsubscribeSetupStatus()
    },
    { immediate: true }
  )

  const stopRedirectWatch = watch(
    () =>
      [
        appStore.appReadiness,
        appStore.setupStatus,
        router.currentRoute.value.fullPath
      ] as const,
    () => {
      redirectCurrentRoute()
    },
    { immediate: true, flush: 'sync' }
  )

  const stopWatches: WatchStopHandle[] = [stopReadinessWatch, stopRedirectWatch]

  return () => {
    stopWatches.forEach((stopWatch) => stopWatch())
    removeSetupGuard()
    unsubscribeSetupStatus()
  }
}

function isSetupRoute(routeName: SetupPhaseRouteName) {
  return routeName === 'setup-club' || routeName === 'setup-trainer'
}

function toAppRouteName(route: Pick<RouteLocationNormalized, 'name'>) {
  return typeof route.name === 'string' ? (route.name as AppRouteName) : null
}
