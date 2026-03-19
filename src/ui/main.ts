import { createPinia } from 'pinia'
import { createApp } from 'vue'

import { appServices } from '@/infra/appServices'
import { provideAppServices } from '@/ui/appServices'
import App from './App.vue'
import router from './router'
import { useAppStore } from './stores/app'
import './style.css'

function bootstrap() {
  const pinia = createPinia()
  const app = createApp(App)
  const services = appServices
  const database = services.database

  // Providing one shared service bag keeps bootstrap stable while the number of app workflows grows.
  provideAppServices(app, services)

  app.use(pinia)
  app.use(router)
  app.mount('#app')

  const appStore = useAppStore(pinia)

  void database
    .open()
    .then(() => {
      appStore.setDbConnected(true)
    })
    .catch((error: unknown) => {
      appStore.setUpdateError('Failed to open the local database.')
      console.error('Failed to open the local database.', error)
    })
}

bootstrap()
