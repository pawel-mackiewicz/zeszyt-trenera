import { createPinia } from 'pinia'
import { createApp } from 'vue'

import { createAppServices } from './appServices'
import { i18n } from './ui/i18n'
import { provideAppServices } from './ui/appServices'
import App from './ui/App.vue'
import router from './ui/router'
import { installSetupPhaseNavigation } from './ui/router/setupPhaseNavigation'
import { useAppStore } from './ui/stores/app'
import { useDemoStore } from './ui/features/demo/demo.store'
// This root entrypoint keeps the PWA bootstrap easy to find while Vite serves the shell from /src/main.ts.
import './ui/fonts.css'
import './ui/style.css'
import { TrainerNotebookDb } from './db'

function bootstrap() {
  const pinia = createPinia()
  const app = createApp(App)
  const services = createAppServices(new TrainerNotebookDb())
  const database = services.database
  const appStore = useAppStore(pinia)
  const demoStore = useDemoStore(pinia)

  // What: install setup navigation beside router bootstrap. Why: first-run routing depends on local setup read models, so AppShell should render state while the router enforces the unskippable setup path.
  installSetupPhaseNavigation({
    router,
    appStore,
    queries: services.queries
  })

  // Providing one shared service bag keeps bootstrap stable while the number of app workflows grows.
  provideAppServices(app, services)

  app.use(pinia)
  // Registering i18n before the router and mount lets the shell paint in the chosen locale on the first frame.
  app.use(i18n)
  app.use(router)
  app.mount('#app')

  void database
    .open()
    .then(async () => {
      appStore.setDbConnected(true)

      const demoMode = await services.system.demo.bootstrap.handle({})

      // What: consume the application result as a direct boolean flag. Why: the UI shell only needs to know whether demo mode is active, so bootstrap should not leak mode-string parsing into the entrypoint.
      demoStore.setDemoModeActive(demoMode.demoModeActive)

      if (demoMode.introModal) {
        // What: only surface the onboarding modal when this boot actually created demo data. Why: later launches should reopen straight into the notebook instead of re-explaining the same seeded state.
        demoStore.showDemoIntroModal()
      }

      appStore.setAppReady()
    })
    .catch((error: unknown) => {
      appStore.blockApplication(appStore.dbConnected ? 'bootstrap' : 'database')

      if (appStore.dbConnected) {
        console.error('Failed to bootstrap the local demo mode.', error)
        return
      }

      console.error('Failed to open the local database.', error)
    })
}

bootstrap()
