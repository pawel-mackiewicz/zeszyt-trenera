import { expect, type Locator, type Page } from 'playwright/test'

import { expectActiveRosterHeading } from './rosterAssertions'

const DEMO_STARTUP_TIMEOUT_MS = 5_000

export function demoIntroDialog(page: Page): Locator {
  return page.getByRole('dialog', {
    name: /tryb demo/i
  })
}

export function demoOutroDialog(page: Page): Locator {
  return page.getByRole('dialog', {
    name: /zaczynasz na serio/i
  })
}

export async function openDemoIntro(page: Page) {
  await page.goto('/')

  // Why: demo-mode specs should prove the real startup bootstrap opened the onboarding modal, and mobile Chromium can need more than the default assertion timeout while Dexie seeds the local-first notebook.
  await expect(demoIntroDialog(page)).toBeVisible({
    timeout: DEMO_STARTUP_TIMEOUT_MS
  })
}

export async function continueDemo(page: Page) {
  await demoIntroDialog(page)
    .getByRole('button', { name: /sprawdzam!/i })
    .click()
  await expectActiveRosterHeading(page)
}

export async function openDemoRoster(page: Page) {
  await openDemoIntro(page)
  await continueDemo(page)
}

export async function openDemoOutro(page: Page) {
  await page.getByRole('button', { name: /wyjdź z demo/i }).click()

  // Why: the header exit CTA should open the dedicated destructive outro before any local-first demo data is wiped.
  await expect(demoOutroDialog(page)).toBeVisible()
}

export async function exitDemoModeForSetup(page: Page) {
  // Why: specs that already entered demo should share the visible exit path instead of duplicating the header CTA plus confirmation modal sequence.
  await openDemoOutro(page)
  await leaveDemoForSetup(page)
}

export async function leaveDemoForSetup(page: Page) {
  if (await demoIntroDialog(page).isVisible()) {
    await continueDemo(page)
  }

  if (!(await demoOutroDialog(page).isVisible())) {
    await openDemoOutro(page)
  }

  await demoOutroDialog(page)
    .getByRole('button', { name: /zaczynam na serio/i })
    .click()

  // Why: leaving demo is only complete when the seeded notebook is gone and setup routing opens the real local-first onboarding flow.
  await expect(page.getByRole('heading', { name: /dodaj klub/i })).toBeVisible()
}
