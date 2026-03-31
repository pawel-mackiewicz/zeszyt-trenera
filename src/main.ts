import { createPinia } from 'pinia'
import { createApp } from 'vue'

import { appServices } from './appServices'
import { i18n } from './ui/i18n'
import { provideAppServices } from './ui/appServices'
import App from './ui/App.vue'
import router from './ui/router'
import { useAppStore } from './ui/stores/app'
// This root entrypoint keeps the PWA bootstrap easy to find while Vite serves the shell from /src/main.ts.
import './ui/fonts.css'
import './ui/style.css'

function bootstrap() {
  const pinia = createPinia()
  const app = createApp(App)
  const services = appServices
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
    .then(() => {
      appStore.setDbConnected(true)
      appStore.setAppReady()
    })
    .catch((error: unknown) => {
      appStore.blockApplication('database')
      console.error('Failed to open the local database.', error)
    })
}

bootstrap()
