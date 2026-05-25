import { expect, type Locator, type Page } from 'playwright/test'

export type RosterMemberDraft = {
  firstName: string
  lastName: string
  dateOfBirth: string
  joinedAt?: string
  countryCode?: string
  phoneNumberRest?: string
}

export async function openDemoRoster(page: Page) {
  await page.goto('/')

  await page.getByRole('button', { name: /sprawdzam!/i }).click()
  await expect(page.getByRole('heading', { name: /członkowie/i })).toBeVisible()
}

export async function addRosterMemberViaUi(
  page: Page,
  member: RosterMemberDraft
) {
  // Why: roster E2E seed data must enter through the same application-layer write path that coaches use in the local-first PWA.
  await page.getByRole('link', { name: /dodaj członka/i }).click()
  await expect(
    page.getByRole('heading', { name: /dodaj członka/i })
  ).toBeVisible()

  await page.getByRole('textbox', { name: /^imię$/i }).fill(member.firstName)
  await page.getByRole('textbox', { name: /^nazwisko$/i }).fill(member.lastName)

  if (member.countryCode) {
    await page
      .getByRole('textbox', { name: /kierunkowy/i })
      .fill(member.countryCode)
  }

  if (member.phoneNumberRest) {
    await page
      .getByRole('textbox', { name: /^reszta numeru$/i })
      .fill(member.phoneNumberRest)
  }

  await page
    .getByRole('textbox', { name: /dokładna data/i })
    .fill(member.dateOfBirth)

  if (member.joinedAt) {
    await page
      .getByRole('textbox', { name: /^data dołączenia$/i })
      .fill(member.joinedAt)
  }

  await page.getByRole('button', { name: /^zapisz$/i }).click()
  await expect(page.getByRole('heading', { name: /członkowie/i })).toBeVisible()
  await expect(
    page.getByText(
      new RegExp(
        `^${escapeRegExp(member.firstName)} ${escapeRegExp(member.lastName)}$`,
        'i'
      )
    )
  ).toBeVisible()
}

export async function addRosterMembersViaUi(
  page: Page,
  members: RosterMemberDraft[]
) {
  for (const member of members) {
    await addRosterMemberViaUi(page, member)
  }
}

export async function reloadRosterAfterLocalWrites(page: Page) {
  // Why: local-first E2E assertions should prove IndexedDB was re-read after writes, not only that Vue kept temporary in-memory state.
  await page.reload()
  await expect(page.getByRole('heading', { name: /członkowie/i })).toBeVisible()
}

export function rosterMemberRows(page: Page, marker: string): Locator {
  return page.getByText(
    new RegExp(`^[\\p{L}\\s-]+${escapeRegExp(marker)}[\\p{L}\\s-]+$`, 'iu')
  )
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
