import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

import { cloudflare } from '@cloudflare/vite-plugin'

const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf-8')
) as {
  version: string
}

export default defineConfig({
  define: {
    // Surfacing the package version at build time keeps the installed shell badge aligned with package.json without an extra runtime fetch.
    __APP_VERSION__: JSON.stringify(packageJson.version)
  },
  plugins: [
    tailwindcss(),
    vue(),
    // The custom-block plugin is what turns component-local <i18n> dictionaries into bundled offline resources.
    VueI18nPlugin({}),
    VitePWA({
      // Keeping prompt mode lets the next shell download quietly while the current local-first session stays stable until a full reopen.
      registerType: 'prompt',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Zeszyt Trenera',
        short_name: 'Zeszyt Trenera',
        description: 'Aplikacja do zarządzania zawodnikami i treningami.',
        theme_color: '#103b37',
        background_color: '#f4eee0',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Font fallbacks are part of the self-contained shell, so both woff2 and woff need the offline precache.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true
      },
      devOptions: {
        enabled: true,
        suppressWarnings: true
      }
    }),
    cloudflare()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
