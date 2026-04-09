import { createPinia } from 'pinia'
import { createApp } from 'vue'

import { createAppServices } from './appServices'
import { i18n } from './ui/i18n'
import { provideAppServices } from './ui/appServices'
import App from './ui/App.vue'
import router from './ui/router'
import { useAppStore } from './ui/stores/app'
// This root entrypoint keeps the PWA bootstrap easy to find while Vite serves the shell from /src/main.ts.
import './ui/fonts.css'
import './ui/style.css'
import { TrainerNotebookDb } from './db'

function bootstrap() {
  const pinia = createPinia()
  const app = createApp(App)
  const services = createAppServices(new TrainerNotebookDb())
  const database = services.database

  // Providing one shared service bag keeps bootstrap stable while the number of app workflows grows.
  provideAppServices(app, services)

  app.use(pinia)
  // Registering i18n before the router and mount lets the shell paint in the chosen locale on the first frame.
  app.use(i18n)
  app.use(router)
  app.mount('#app')

  const appStore = useAppStore(pinia)

  void database
    .open()
    .then(async () => {
      appStore.setDbConnected(true)

      const demoMode = await services.useCases.bootstrapDemoMode.handle({})

      // What: consume the application result as a direct boolean flag. Why: the UI shell only needs to know whether demo mode is active, so bootstrap should not leak mode-string parsing into the entrypoint.
      appStore.setDemoModeActive(demoMode.demoModeActive)

      if (demoMode.introModal) {
        // What: only surface the onboarding modal when this boot actually created demo data. Why: later launches should reopen straight into the notebook instead of re-explaining the same seeded state.
        appStore.showDemoIntroModal()
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
