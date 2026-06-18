import { expect, type Locator, type Page } from 'playwright/test'

import { openDemoRoster } from './demo'

export type CampDraft = {
  name: string
  startDate: string
  finishDate: string
  price: string
  note?: string
}

export type CampParticipantMoneyDraft = {
  discount?: string
  payment?: string
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

export async function openCampDetailsViaUi(page: Page, campNameValue: string) {
  await page
    .getByRole('link', {
      name: new RegExp(escapeRegExp(campNameValue), 'i')
    })
    .click()
  await expect(
    page.getByRole('heading', { exact: true, name: campNameValue })
  ).toBeVisible()
}

export async function openCampParticipantPicker(page: Page) {
  await page.getByRole('link', { name: /dodaj uczestnika/i }).click()
  await expect(
    page.getByRole('heading', { name: /dodaj uczestnika obozu/i })
  ).toBeVisible()
}

export async function openExternalCampParticipantForm(page: Page) {
  await page.getByRole('button', { name: /dodaj spoza klubu/i }).click()
  await expect(page.getByRole('textbox', { name: /^imię$/i })).toBeVisible()
  await expect(page.getByRole('textbox', { name: /^nazwisko$/i })).toBeVisible()
}

export async function openClubCampParticipantForm(
  page: Page,
  fullName: string
) {
  await page
    .getByRole('button', {
      name: new RegExp(escapeRegExp(fullName), 'i')
    })
    .click()
  await expect(page.getByText(/^zapis na obóz$/i)).toBeVisible()
  await expect(campParticipantName(page, fullName)).toBeVisible()
}

export async function fillCampParticipantMoney(
  page: Page,
  money: CampParticipantMoneyDraft
) {
  if (money.discount) {
    await page.getByLabel(/przyznaj zniżkę/i).check()
    await page.getByLabel(/^kwota zniżki$/i).fill(money.discount)
  }

  if (money.payment) {
    await page.getByLabel(/przyjmij wpłatę/i).check()
    await page.getByLabel(/^kwota wpłaty$/i).fill(money.payment)
  }
}

export async function registerClubCampParticipantViaUi(
  page: Page,
  {
    fullName,
    money
  }: {
    fullName: string
    money?: CampParticipantMoneyDraft
  }
) {
  await openClubCampParticipantForm(page, fullName)

  if (money) {
    await fillCampParticipantMoney(page, money)
  }

  await page.getByRole('button', { name: /zapisz klubowicza/i }).click()
}

export async function registerExternalCampParticipantViaUi(
  page: Page,
  {
    firstName,
    lastName,
    money
  }: {
    firstName: string
    lastName: string
    money?: CampParticipantMoneyDraft
  }
) {
  await openExternalCampParticipantForm(page)
  await page.getByRole('textbox', { name: /^imię$/i }).fill(firstName)
  await page.getByRole('textbox', { name: /^nazwisko$/i }).fill(lastName)

  if (money) {
    await fillCampParticipantMoney(page, money)
  }

  await page.getByRole('button', { name: /zapisz uczestnika/i }).click()
}

export async function reloadCampsAfterLocalWrites(page: Page) {
  // Why: local-first E2E assertions should prove IndexedDB was re-read after writes, not only that Vue kept temporary in-memory state.
  await page.reload()
  await expect(
    page.getByRole('heading', { exact: true, name: 'Obozy' })
  ).toBeVisible()
}

export async function reloadCampDetailsAfterLocalWrites(
  page: Page,
  campNameValue: string
) {
  // Why: camp detail assertions must prove participant and ledger writes survive a fresh IndexedDB read.
  await page.reload()
  await expect(
    page.getByRole('heading', { exact: true, name: campNameValue })
  ).toBeVisible()
}

export function campName(page: Page, name: string): Locator {
  return page.getByText(new RegExp(`^${escapeRegExp(name)}$`, 'i'))
}

export function campParticipantName(page: Page, fullName: string): Locator {
  return page.getByText(new RegExp(`^${escapeRegExp(fullName)}$`, 'i'))
}

export async function expectCampVisible(page: Page, name: string) {
  await expect(campName(page, name)).toBeVisible()
}

export async function expectCampParticipantVisible(
  page: Page,
  fullName: string
) {
  await expect(campParticipantName(page, fullName)).toBeVisible()
}

export async function expectCampParticipantShownOnce(
  page: Page,
  fullName: string
) {
  await expect(campParticipantName(page, fullName)).toHaveCount(1)
}

export async function expectMoneyVisible(page: Page, amount: string) {
  await expect(page.getByText(moneyRegExp(amount))).toBeVisible()
}

export async function expectSignedCampCandidate(page: Page, fullName: string) {
  const candidate = page.getByRole('button', {
    name: new RegExp(escapeRegExp(fullName), 'i')
  })

  await expect(candidate).toHaveAttribute('aria-disabled', 'true')
  await expect(candidate).toContainText(/już zapisany/i)
}

function moneyRegExp(amount: string): RegExp {
  return new RegExp(`${escapeRegExp(amount)}\\s*zł`, 'i')
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
