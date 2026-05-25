import process from 'node:process'
import { defineConfig, devices } from 'playwright/test'

const E2E_BASE_URL = 'http://127.0.0.1:5173'
const isCi = Boolean(process.env.CI)

export default defineConfig({
  testDir: './E2E',
  testMatch: '**/*.spec.ts',
  outputDir: 'E2E/.temp/test-results',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  // Why: CI should favor deterministic local-first storage isolation over raw browser parallelism while local runs can use Playwright defaults.
  workers: isCi ? 1 : undefined,
  reporter: [
    ['list'],
    [
      'html',
      {
        open: 'never',
        outputFolder: 'E2E/.temp/html-report'
      }
    ]
  ],
  use: {
    baseURL: E2E_BASE_URL,
    locale: 'pl-PL',
    timezoneId: 'Europe/Warsaw',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure'
  },
  webServer: {
    // Why: Vite dev keeps the first E2E loop fast while the spec still exercises the real browser, IndexedDB, router, and PWA shell.
    command: 'pnpm dev:e2e',
    reuseExistingServer: !isCi,
    timeout: 120_000,
    url: E2E_BASE_URL
  },
  projects: [
    {
      name: 'mobile-chromium',
      use: {
        ...devices['Pixel 5']
      }
    },
    {
      name: 'desktop-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: {
          height: 900,
          width: 1280
        }
      }
    }
  ]
})
