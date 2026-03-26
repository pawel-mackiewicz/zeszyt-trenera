import { createPinia } from 'pinia'
import { createApp } from 'vue'

import { appServices } from '@/infra/appServices'
import { i18n } from '@/ui/i18n'
import { provideAppServices } from '@/ui/appServices'
import App from './App.vue'
import router from './router'
import { useAppStore } from './stores/app'
// Keeping fonts bundled with the app preserves the installed shell when connectivity is poor or missing.
import './fonts.css'
import './style.css'

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
