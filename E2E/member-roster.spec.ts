import { expect, test } from 'playwright/test'

import {
  addRosterMemberViaUi,
  addRosterMembersViaUi,
  openDemoRoster,
  reloadRosterAfterLocalWrites,
  rosterMemberRows,
  type RosterMemberDraft
} from './support/roster'

const SORT_MARKER = 'Sortcase'

const sortMembers: RosterMemberDraft[] = [
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

test('filters roster members by name', async ({ page }) => {
  await openDemoRoster(page)

  await page.getByLabel(/szukaj w rejestrze/i).fill('Kamaru')

  await expect(page.getByText(/^kamaru usman$/i)).toBeVisible()
  await expect(page.getByText(/^royce gracie$/i)).not.toBeVisible()
})

test('filters roster members by age range', async ({ page }) => {
  await openDemoRoster(page)

  await page.getByLabel(/minimalny wiek/i).fill('70')
  await page.getByLabel(/maksymalny wiek/i).fill('75')

  await expect(page.getByText(/70 - 75 lat/i)).toBeVisible()
  await expect(page.getByText(/^henry cejudo$/i)).toBeVisible()
  await expect(page.getByText(/^royce gracie$/i)).not.toBeVisible()
})

test('sorts roster members by first name, surname, join date, and direction', async ({
  page
}) => {
  await openDemoRoster(page)
  await addRosterMembersViaUi(page, sortMembers)
  await reloadRosterAfterLocalWrites(page)

  await page.getByLabel(/szukaj w rejestrze/i).fill(SORT_MARKER)

  const rows = rosterMemberRows(page, SORT_MARKER)
  await expect(rows).toHaveCount(sortMembers.length)
  await expect(rows).toHaveText([
    'adam sortcase zulu',
    'marta sortcase alpha',
    'zoja sortcase beta'
  ])

  await page.getByRole('button', { name: /kierunek: rosnąco/i }).click()
  await expect(rows).toHaveText([
    'zoja sortcase beta',
    'marta sortcase alpha',
    'adam sortcase zulu'
  ])

  await page.getByLabel(/opcje sortowania/i).selectOption('lastName')
  await expect(rows).toHaveText([
    'adam sortcase zulu',
    'zoja sortcase beta',
    'marta sortcase alpha'
  ])

  await page.getByRole('button', { name: /kierunek: malejąco/i }).click()
  await expect(rows).toHaveText([
    'marta sortcase alpha',
    'zoja sortcase beta',
    'adam sortcase zulu'
  ])

  await page.getByLabel(/opcje sortowania/i).selectOption('joinedAt')
  await expect(rows).toHaveText([
    'adam sortcase zulu',
    'zoja sortcase beta',
    'marta sortcase alpha'
  ])

  await page.getByRole('button', { name: /kierunek: rosnąco/i }).click()
  await expect(rows).toHaveText([
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
  await expect(page.getByText(/^licznik rosterowy$/i)).toBeVisible()
})

test('shows call and sms actions in member details', async ({ page }) => {
  await openDemoRoster(page)

  await page.getByText(/^kamaru usman$/i).click()

  const callLink = page.getByRole('link', {
    name: /zadzwoń \+48500000029/i
  })
  const smsLink = page.getByRole('link', {
    name: /sms \+48500000029/i
  })

  await expect(callLink).toHaveAttribute('href', 'tel:+48500000029')
  await expect(smsLink).toHaveAttribute('href', 'sms:+48500000029')
})
