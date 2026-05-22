import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'
const dirname =
  typeof __dirname !== 'undefined'
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url))

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf-8')
) as {
  version: string
}

const EXPECTED_STORYBOOK_STDERR_PATTERNS = [
  (log: string) =>
    log.includes(
      '[@vue/compiler-core] decodeEntities option is passed but will be ignored in non-browser builds.'
    ),
  (log: string) =>
    log.includes('Failed to leave demo mode.') &&
    log.includes('Storybook leave-demo failure')
]

function isExpectedStorybookStderr(log: string, type: 'stdout' | 'stderr') {
  // What: suppress only known Storybook harness stderr. Why: expected browser-story warnings and intentional failure states should not hide real app/test failures in the suite output.
  return (
    type === 'stderr' &&
    EXPECTED_STORYBOOK_STDERR_PATTERNS.some((matches) => matches(log))
  )
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
  // What: pre-bundle the Pinia dependency used by smart Storybook stories. Why: browser story tests can reload when Vite discovers it mid-run, which breaks dynamic imports in the local test server.
  optimizeDeps: {
    include: ['pinia']
  },
  test: {
    onConsoleLog(log, type) {
      if (isExpectedStorybookStderr(log, type)) {
        return false
      }
    },
    coverage: {
      provider: 'v8'
    },
    projects: [
      {
        extends: true,
        test: {
          environment: 'happy-dom',
          setupFiles: ['./vitest.setup.ts']
        }
      },
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({
            configDir: path.join(dirname, '.storybook')
          })
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [
              {
                browser: 'chromium'
              }
            ]
          }
        }
      }
    ]
  }
})
