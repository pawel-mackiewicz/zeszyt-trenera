import { expect, test } from 'playwright/test'

import { openDemoRoster } from './support/demo'

test('edits a demo member and keeps the change after reload', async ({
  page
}) => {
  await openDemoRoster(page)

  await page.getByText(/^kamaru usman$/i).click()
  await page.getByRole('button', { name: /^edytuj$/i }).click()
  await page.getByLabel(/^imię$/i).fill('MAKARON')
  await page.getByRole('button', { name: /zapisz zmiany/i }).click()

  // Why: the local-first contract needs proof that the visible edit was written to IndexedDB, not only patched into Vue state.
  await page.reload()
  await expect(page.getByRole('heading', { name: /członkowie/i })).toBeVisible()
  await expect(page.getByText(/^makaron usman$/i)).toBeVisible()
})
