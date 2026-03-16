import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import { db } from './infra/db'
import router from './router'
import { useAppStore } from './stores/app'
import './style.css'

function bootstrap() {
  const pinia = createPinia()
  const app = createApp(App)
  app.use(pinia)
  app.use(router)
  app.mount('#app')

  const appStore = useAppStore(pinia)

  void db
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
