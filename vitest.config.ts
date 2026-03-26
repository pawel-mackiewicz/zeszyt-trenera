import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf-8')
) as {
  version: string
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version)
  },
  plugins: [
    vue(),
    // Tests need the same SFC transform as the app or local <i18n> blocks will never be compiled.
    VueI18nPlugin({})
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'virtual:pwa-register/vue': fileURLToPath(
        new URL('./src/test/mocks/virtual-pwa-register-vue.ts', import.meta.url)
      )
    }
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8'
    }
  }
})
