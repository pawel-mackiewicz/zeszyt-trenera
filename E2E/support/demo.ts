import { expect, type Locator, type Page } from 'playwright/test'

export function demoIntroDialog(page: Page): Locator {
  return page.getByRole('dialog', {
    name: /sprawdź apkę/i
  })
}

export async function openDemoIntro(page: Page) {
  await page.goto('/')

  // Why: demo-mode specs should prove the real startup bootstrap opened the onboarding modal instead of assuming seeded state already exists.
  await expect(demoIntroDialog(page)).toBeVisible()
}

export async function continueDemo(page: Page) {
  await demoIntroDialog(page)
    .getByRole('button', { name: /sprawdzam!/i })
    .click()
  await expect(
    page.getByRole('heading', { name: /^aktywni członkowie$/i })
  ).toBeVisible()
}

export async function openDemoRoster(page: Page) {
  await openDemoIntro(page)
  await continueDemo(page)
}

export async function openLeaveDemoIntro(page: Page) {
  await page.getByRole('button', { name: /wyjdź z demo/i }).click()

  // Why: the header exit CTA must reuse the same intro modal so leaving demo and first-run demo onboarding stay one tested workflow.
  await expect(demoIntroDialog(page)).toBeVisible()
}

export async function exitDemoModeForSetup(page: Page) {
  // Why: specs that already entered demo should share the visible exit path instead of duplicating the header CTA plus confirmation modal sequence.
  await openLeaveDemoIntro(page)
  await leaveDemoForSetup(page)
}

export async function leaveDemoForSetup(page: Page) {
  await demoIntroDialog(page)
    .getByRole('button', { name: /już testowałem/i })
    .click()

  // Why: leaving demo is only complete when the seeded notebook is gone and setup routing opens the real local-first onboarding flow.
  await expect(page.getByRole('heading', { name: /dodaj klub/i })).toBeVisible()
}
