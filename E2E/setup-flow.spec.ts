import { expect, test, type Page } from 'playwright/test'

import { leaveDemoForSetup, openDemoIntro } from './support/demo'
import {
  expectActiveRosterHeading,
  expectRosterTotalCount
} from './support/roster'

type FakeBeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{
    outcome: 'dismissed'
    platform: string
  }>
}

test('completes first-run setup with a sample club and trainer', async ({
  page
}) => {
  await openDemoIntro(page)
  await exposeNativeInstallPrompt(page)
  await leaveDemoForSetup(page)

  await page.getByLabel(/^nazwa klubu$/i).fill('Sample Club')
  await page.getByLabel(/^data założenia$/i).fill('2024-01-01')
  await page.getByRole('button', { name: /^zapisz klub$/i }).click()

  await expect(
    page.getByRole('heading', { name: /dodaj trenera/i })
  ).toBeVisible()

  await page.getByLabel(/^imię$/i).fill('Sample Trainer')
  await page.getByRole('button', { name: /^zapisz trenera$/i }).click()

  const installDialog = page.getByRole('dialog', {
    name: /zainstaluj zeszyt trenera/i
  })

  // Why: the first completed local-first notebook should immediately receive the one-time PWA install nudge while the browser install event is still available.
  await expect(installDialog).toBeVisible()
  await expectActiveRosterHeading(page)

  // Why: first-run setup is only complete when the club and trainer writes survive a fresh local-first app boot.
  await page.reload()
  await exposeNativeInstallPrompt(page)
  await expectActiveRosterHeading(page)
  await expectRosterTotalCount(page, 0)

  // Why: once the automatic prompt has been shown, another install event during a fresh boot must not interrupt the same local-first notebook again.
  await expect(installDialog).not.toBeVisible()
})

async function exposeNativeInstallPrompt(page: Page) {
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', {
      cancelable: true
    }) as FakeBeforeInstallPromptEvent

    event.prompt = async () => {}
    event.userChoice = Promise.resolve({
      outcome: 'dismissed',
      platform: 'playwright'
    })

    // Why: Chromium does not surface the real install prompt in automated E2E runs, so the setup flow supplies the browser event consumed by the production PWA install feature.
    window.dispatchEvent(event)
  })
}
