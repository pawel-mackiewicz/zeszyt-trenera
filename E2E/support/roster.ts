import { expect, type Locator, type Page } from 'playwright/test'

// Why: roster helpers keep exporting the demo entry point for existing specs, while the actual modal workflow lives in one demo-focused helper module.
export { openDemoRoster } from './demo'
export {
  expectActiveRosterHeading,
  expectRosterTotalCount,
  expectRosterTotalCounterHidden
} from './rosterAssertions'
import { expectActiveRosterHeading } from './rosterAssertions'

export type RosterMemberDraft = {
  firstName: string
  lastName: string
  dateOfBirth: string
  joinedAt?: string
  countryCode?: string
  phoneNumberRest?: string
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
  await expectActiveRosterHeading(page)
  await expect(
    rosterMemberName(page, `${member.firstName} ${member.lastName}`)
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
  await expectActiveRosterHeading(page)
}

export async function openRosterAfterLocalWrites(page: Page) {
  await page.goto('/members')
  await expectActiveRosterHeading(page)

  // Why: cross-feature member writes should be verified from a fresh roster projection, not from the route that performed the write.
  await reloadRosterAfterLocalWrites(page)
}

export async function openRosterTab(page: Page, tabName: string) {
  const tab = page.getByRole('button', {
    name: new RegExp(`^${escapeRegExp(tabName)}$`, 'i')
  })

  await tab.click()
  await expect(tab).toHaveAttribute('aria-pressed', 'true')
}

export function rosterMemberName(page: Page, fullName: string): Locator {
  // Why: member specs and shell flows share exact-name roster assertions, so escaping the regex once keeps readable tests from duplicating brittle locator details.
  return page.getByText(new RegExp(`^${escapeRegExp(fullName)}$`, 'i'))
}

export function rosterMemberRows(page: Page, marker: string): Locator {
  return page.getByText(
    new RegExp(`^[\\p{L}\\s-]+${escapeRegExp(marker)}[\\p{L}\\s-]+$`, 'iu')
  )
}

export async function expectRosterMemberVisible(page: Page, fullName: string) {
  await expect(rosterMemberName(page, fullName)).toBeVisible()
}

export async function expectRosterMemberHidden(page: Page, fullName: string) {
  await expect(rosterMemberName(page, fullName)).not.toBeVisible()
}

export async function openRosterMemberDetails(page: Page, fullName: string) {
  await rosterMemberName(page, fullName).click()

  // Why: detail-level member assertions must prove the roster row opened the persisted member card, not only that the list item was visible.
  await expect(page.getByRole('button', { name: /^edytuj$/i })).toBeVisible()
}

export async function updateRosterMemberFirstName(
  page: Page,
  fullName: string,
  firstName: string
) {
  const lastName = fullName.replace(/^\S+\s+/, '')
  const updatedFullName = `${firstName} ${lastName}`

  await openRosterMemberDetails(page, fullName)
  await page.getByRole('button', { name: /^edytuj$/i }).click()
  await page.getByLabel(/^imię$/i).fill(firstName)
  await page.getByRole('button', { name: /zapisz zmiany/i }).click()

  // Why: the edit form is inline on the roster route, so waiting for the already-visible page heading does not prove the IndexedDB-backed roster projection observed the saved member.
  await expectRosterMemberVisible(page, updatedFullName)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
