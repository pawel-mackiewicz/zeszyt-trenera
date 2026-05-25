import { expect, test, type Page } from 'playwright/test'

import {
  addRosterMemberViaUi,
  addRosterMembersViaUi,
  expectRosterMemberVisible,
  openDemoRoster,
  openRosterMemberDetails,
  reloadRosterAfterLocalWrites,
  rosterMemberRows,
  updateRosterMemberFirstName,
  type RosterMemberDraft
} from './support/roster'

const ADDED_MEMBER: RosterMemberDraft = {
  firstName: 'Marta',
  lastName: 'Nowak',
  dateOfBirth: '2011-04-18',
  joinedAt: '2026-01-20',
  countryCode: '+48',
  phoneNumberRest: '600 700 800'
}

const SORT_MARKER = 'Sortcase'

const SORT_MEMBERS: RosterMemberDraft[] = [
  {
    firstName: 'Adam',
    lastName: `${SORT_MARKER} Zulu`,
    dateOfBirth: '2010-02-01',
    joinedAt: '2024-02-01'
  },
  {
    firstName: 'Marta',
    lastName: `${SORT_MARKER} Alpha`,
    dateOfBirth: '2011-02-01',
    joinedAt: '2026-01-20'
  },
  {
    firstName: 'Zoja',
    lastName: `${SORT_MARKER} Beta`,
    dateOfBirth: '2009-02-01',
    joinedAt: '2025-07-10'
  }
]

// Why: member specs share application-layer write helpers, while roster-only filter and sort steps stay local so each test reads as an end-to-end coach workflow.
async function addMemberAndReload(page: Page) {
  await addRosterMemberViaUi(page, ADDED_MEMBER)

  // Why: the local-first add-member flow is only complete when the application-layer write survives a fresh IndexedDB read after navigation and reload.
  await reloadRosterAfterLocalWrites(page)
  await expectRosterMemberVisible(page, 'Marta Nowak')
}

async function expectAddedMemberDetails(page: Page) {
  await openRosterMemberDetails(page, 'Marta Nowak')
  await expect(page.getByText('+48600700800')).toBeVisible()
  await expect(page.getByText('2011-04-18')).toBeVisible()
  await expect(page.getByText('2026-01-20')).toBeVisible()
}

async function filterRosterByName(page: Page, name: string) {
  await page.getByLabel(/szukaj w rejestrze/i).fill(name)
}

async function filterRosterByAgeRange(
  page: Page,
  {
    maxAge,
    minAge
  }: {
    maxAge: string
    minAge: string
  }
) {
  await page.getByLabel(/minimalny wiek/i).fill(minAge)
  await page.getByLabel(/maksymalny wiek/i).fill(maxAge)
}

async function expectSortcaseRows(page: Page, expectedRows: string[]) {
  await expect(rosterMemberRows(page, SORT_MARKER)).toHaveText(expectedRows)
}

test('adds a roster member and keeps it after reload', async ({ page }) => {
  await openDemoRoster(page)
  await addMemberAndReload(page)
  await expectAddedMemberDetails(page)
})

test('edits a demo member and keeps the change after reload', async ({
  page
}) => {
  await openDemoRoster(page)
  await updateRosterMemberFirstName(page, 'Kamaru Usman', 'MAKARON')

  // Why: the local-first contract needs proof that the visible edit was written to IndexedDB, not only patched into Vue state.
  await reloadRosterAfterLocalWrites(page)
  await expectRosterMemberVisible(page, 'MAKARON Usman')
})

test('filters roster members by name', async ({ page }) => {
  await openDemoRoster(page)
  await filterRosterByName(page, 'Kamaru')

  await expect(page.getByText(/^kamaru usman$/i)).toBeVisible()
  await expect(page.getByText(/^royce gracie$/i)).not.toBeVisible()
})

test('filters roster members by age range', async ({ page }) => {
  await openDemoRoster(page)
  await filterRosterByAgeRange(page, {
    minAge: '70',
    maxAge: '75'
  })

  await expect(page.getByText(/70 - 75 lat/i)).toBeVisible()
  await expect(page.getByText(/^henry cejudo$/i)).toBeVisible()
  await expect(page.getByText(/^royce gracie$/i)).not.toBeVisible()
})

test('sorts roster members by first name, surname, join date, and direction', async ({
  page
}) => {
  await openDemoRoster(page)
  await addRosterMembersViaUi(page, SORT_MEMBERS)
  await reloadRosterAfterLocalWrites(page)

  await filterRosterByName(page, SORT_MARKER)

  const rows = rosterMemberRows(page, SORT_MARKER)
  await expect(rows).toHaveCount(SORT_MEMBERS.length)
  await expectSortcaseRows(page, [
    'adam sortcase zulu',
    'marta sortcase alpha',
    'zoja sortcase beta'
  ])

  await page.getByRole('button', { name: /kierunek: rosnąco/i }).click()
  await expectSortcaseRows(page, [
    'zoja sortcase beta',
    'marta sortcase alpha',
    'adam sortcase zulu'
  ])

  await page.getByLabel(/opcje sortowania/i).selectOption('lastName')
  await expectSortcaseRows(page, [
    'adam sortcase zulu',
    'zoja sortcase beta',
    'marta sortcase alpha'
  ])

  await page.getByRole('button', { name: /kierunek: malejąco/i }).click()
  await expectSortcaseRows(page, [
    'marta sortcase alpha',
    'zoja sortcase beta',
    'adam sortcase zulu'
  ])

  await page.getByLabel(/opcje sortowania/i).selectOption('joinedAt')
  await expectSortcaseRows(page, [
    'adam sortcase zulu',
    'zoja sortcase beta',
    'marta sortcase alpha'
  ])

  await page.getByRole('button', { name: /kierunek: rosnąco/i }).click()
  await expectSortcaseRows(page, [
    'marta sortcase alpha',
    'zoja sortcase beta',
    'adam sortcase zulu'
  ])
})

test('updates the roster member counter after a persisted add', async ({
  page
}) => {
  await openDemoRoster(page)
  await addRosterMemberViaUi(page, {
    firstName: 'Licznik',
    lastName: 'Rosterowy',
    dateOfBirth: '2012-03-01',
    joinedAt: '2025-09-01'
  })

  await reloadRosterAfterLocalWrites(page)

  await expect(page.getByText(/^61 członków$/i)).toBeVisible()
  await expectRosterMemberVisible(page, 'Licznik Rosterowy')
})

test('shows call and sms actions in member details', async ({ page }) => {
  await openDemoRoster(page)
  await openRosterMemberDetails(page, 'Kamaru Usman')

  const callLink = page.getByRole('link', {
    name: /zadzwoń \+48500000029/i
  })
  const smsLink = page.getByRole('link', {
    name: /sms \+48500000029/i
  })

  await expect(callLink).toHaveAttribute('href', 'tel:+48500000029')
  await expect(smsLink).toHaveAttribute('href', 'sms:+48500000029')
})
