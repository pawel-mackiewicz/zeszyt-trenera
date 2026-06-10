import { expect, type Locator, type Page } from 'playwright/test'

import { openDemoRoster } from './demo'

export type CampDraft = {
  name: string
  startDate: string
  finishDate: string
  price: string
  note?: string
}

export async function openDemoCamps(page: Page) {
  await openDemoRoster(page)
  await page.goto('/camps')
  await expect(
    page.getByRole('heading', { exact: true, name: 'Obozy' })
  ).toBeVisible()
}

export async function addCampViaUi(page: Page, camp: CampDraft) {
  // Why: camp E2E data must be written through the same application-layer flow that coaches use in the local-first PWA.
  await page.getByRole('link', { name: /dodaj obóz/i }).click()
  await expect(
    page.getByRole('textbox', { name: /^nazwa obozu/i })
  ).toBeVisible()

  await page.getByRole('textbox', { name: /^nazwa obozu/i }).fill(camp.name)
  await page
    .getByRole('textbox', { name: /^data rozpoczęcia/i })
    .fill(camp.startDate)
  await page
    .getByRole('textbox', { name: /^data zakończenia/i })
    .fill(camp.finishDate)
  await page.getByRole('textbox', { name: /^koszt obozu/i }).fill(camp.price)

  if (camp.note) {
    await page.getByRole('textbox', { name: /^notatki/i }).fill(camp.note)
  }

  await page.getByRole('button', { name: /^zapisz$/i }).click()
  await expect(
    page.getByRole('heading', { exact: true, name: 'Obozy' })
  ).toBeVisible()
  await expectCampVisible(page, camp.name)
}

export async function reloadCampsAfterLocalWrites(page: Page) {
  // Why: local-first E2E assertions should prove IndexedDB was re-read after writes, not only that Vue kept temporary in-memory state.
  await page.reload()
  await expect(
    page.getByRole('heading', { exact: true, name: 'Obozy' })
  ).toBeVisible()
}

export function campName(page: Page, name: string): Locator {
  return page.getByText(new RegExp(`^${escapeRegExp(name)}$`, 'i'))
}

export async function expectCampVisible(page: Page, name: string) {
  await expect(campName(page, name)).toBeVisible()
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
