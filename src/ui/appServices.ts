import type { AppServices } from '@/appServices'
import { inject, type App, type InjectionKey } from 'vue'

export type UiAppServices = {
  readonly queries: AppServices['queries']
  readonly useCases: AppServices['useCases']
}

// One app-level provider keeps bootstrap and tests stable as the number of workflows grows.
export const appServicesKey: InjectionKey<UiAppServices> = Symbol('appServices')

export function provideAppServices(
  app: Pick<App, 'provide'>,
  appServices: UiAppServices
) {
  // Wiring one service bag prevents each new workflow from introducing another provider path through the UI.
  app.provide(appServicesKey, appServices)
}

export function createAppServicesProvides(appServices: UiAppServices) {
  // Tests need a plain provide map so routed views can reuse the same UI seam without mounting the real infra graph.
  return {
    [appServicesKey as symbol]: appServices
  }
}

export function useAppServices(): UiAppServices {
  const appServices = inject(appServicesKey)

  if (!appServices) {
    // Missing the shared service bag means no domain workflow can run, so the failure should point straight at broken bootstrap wiring.
    throw new Error('App services were not provided.')
  }

  return appServices
}
