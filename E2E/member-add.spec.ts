import { expect, test } from 'playwright/test'

import { openDemoRoster } from './support/demo'

test('adds a roster member and keeps it after reload', async ({ page }) => {
  await openDemoRoster(page)

  await page.getByRole('link', { name: /dodaj członka/i }).click()
  await expect(
    page.getByRole('heading', { name: /dodaj członka/i })
  ).toBeVisible()

  await page.getByRole('textbox', { name: /^imię$/i }).fill('Marta')
  await page.getByRole('textbox', { name: /^nazwisko$/i }).fill('Nowak')
  await page.getByRole('textbox', { name: /kierunkowy/i }).fill('+48')
  await page
    .getByRole('textbox', { name: /^reszta numeru$/i })
    .fill('600 700 800')
  await page.getByRole('textbox', { name: /dokładna data/i }).fill('2011-04-18')
  await page
    .getByRole('textbox', { name: /^data dołączenia$/i })
    .fill('2026-01-20')
  await page.getByRole('button', { name: /^zapisz$/i }).click()

  // Why: saving a new member should complete by returning the coach to the canonical roster page before any persistence reload hides a routing regression.
  await expect(page.getByRole('heading', { name: /członkowie/i })).toBeVisible()
  await expect(page.getByText(/^marta nowak$/i)).toBeVisible()

  // Why: the local-first add-member flow is only complete when the application-layer write survives a fresh IndexedDB read after navigation and reload.
  await page.reload()
  await expect(page.getByRole('heading', { name: /członkowie/i })).toBeVisible()
  await expect(page.getByText(/^marta nowak$/i)).toBeVisible()

  await page.getByText(/^marta nowak$/i).click()
  await expect(page.getByText('+48600700800')).toBeVisible()
  await expect(page.getByText('2011-04-18')).toBeVisible()
  await expect(page.getByText('2026-01-20')).toBeVisible()
})
