import { expect, test, type Page } from 'playwright/test'

import {
  createAttendanceSessionViaUi,
  reloadAttendanceHistoryAfterLocalWrites,
  startOfToday,
  type AttendanceSessionExpectation
} from './support/attendance'
import {
  expectAgeRangeFilterValues,
  setAgeRangeFilter
} from './support/ageRangeFilter'
import {
  confirmPayment,
  currentDemoPaymentTargets,
  expectPaymentWritePersistedAsPaid,
  filterPaymentsByMember,
  openDemoPayments,
  openPaymentConfirmation
} from './support/payments'
import {
  addRosterMemberViaUi,
  addRosterMembersViaUi,
  expectRosterMemberHidden,
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
const CLEAN_DELETE_MEMBER: RosterMemberDraft = {
  firstName: 'Delete',
  lastName: 'Clean',
  dateOfBirth: '2014-08-12',
  joinedAt: '2026-02-10'
}
const ATTENDANCE_BLOCKED_MEMBER: RosterMemberDraft = {
  firstName: 'Delete',
  lastName: 'Attendance',
  dateOfBirth: '2013-07-09',
  joinedAt: '2026-02-11'
}
const ATTENDANCE_BLOCKED_SESSION: AttendanceSessionExpectation = {
  count: 1,
  date: startOfToday(),
  time: '18:15'
}
const ARCHIVE_FLOW_MEMBER: RosterMemberDraft = {
  firstName: 'Archive',
  lastName: 'Restore',
  dateOfBirth: '2012-06-15',
  joinedAt: '2026-03-02'
}

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

async function openRosterAfterLocalWrites(page: Page) {
  await page.goto('/members')
  await expect(page.getByRole('heading', { name: /członkowie/i })).toBeVisible()
}

async function deleteRosterMemberFromDetails(page: Page, fullName: string) {
  await openRosterMemberDetails(page, fullName)
  await page
    .getByRole('button', {
      name: new RegExp(`usuń członka ${escapeRegExp(fullName)}`, 'i')
    })
    .click()

  await expect(
    page.getByRole('heading', { name: /usunąć członka/i })
  ).toBeVisible()
  await page.getByRole('button', { name: /^usuń$/i }).click()
}

async function archiveRosterMemberFromDetails(page: Page, fullName: string) {
  await openRosterMemberDetails(page, fullName)
  await page
    .getByRole('button', {
      name: new RegExp(`zarchiwizuj członka ${escapeRegExp(fullName)}`, 'i')
    })
    .click()

  await expect(
    page.getByRole('heading', { name: /zarchiwizować członka/i })
  ).toBeVisible()
  await page.getByRole('button', { name: /^archiwizuj$/i }).click()
  await expect(
    page.getByRole('heading', { name: /zarchiwizować członka/i })
  ).not.toBeVisible()
}

async function openRosterTab(page: Page, tabName: string) {
  const tab = page.getByRole('button', {
    name: new RegExp(`^${escapeRegExp(tabName)}$`, 'i')
  })

  await tab.click()
  await expect(tab).toHaveAttribute('aria-pressed', 'true')
}

async function openArchivedRosterMemberDetails(page: Page, fullName: string) {
  await page.getByText(new RegExp(`^${escapeRegExp(fullName)}$`, 'i')).click()
  await expect(
    page.getByRole('button', {
      name: new RegExp(`przywróć członka ${escapeRegExp(fullName)}`, 'i')
    })
  ).toBeVisible()
}

async function unarchiveRosterMemberFromDetails(page: Page, fullName: string) {
  await openArchivedRosterMemberDetails(page, fullName)
  await page
    .getByRole('button', {
      name: new RegExp(`przywróć członka ${escapeRegExp(fullName)}`, 'i')
    })
    .click()
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
  await setAgeRangeFilter(page, { minAge, maxAge })
}

async function expectSortcaseRows(page: Page, expectedRows: string[]) {
  await expect(rosterMemberRows(page, SORT_MARKER)).toHaveText(expectedRows)
}

async function createAttendanceBlocker(page: Page, fullName: string) {
  await page.goto('/attendance')
  await expect(
    page.getByRole('heading', { level: 2, name: /historia treningów/i })
  ).toBeVisible()

  await createAttendanceSessionViaUi(page, ATTENDANCE_BLOCKED_SESSION, [
    fullName
  ])

  // Why: a delete blocker must be persisted by the attendance write use case before the roster delete flow can prove DeleteMemberUseCase rejected it.
  await reloadAttendanceHistoryAfterLocalWrites(page)
}

function memberFullName(member: RosterMemberDraft): string {
  return `${member.firstName} ${member.lastName}`
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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

  await expectAgeRangeFilterValues(page, { minAge: '70', maxAge: '75' })
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

test('archives and restores a roster member after reload', async ({ page }) => {
  const fullName = memberFullName(ARCHIVE_FLOW_MEMBER)

  await openDemoRoster(page)
  await addRosterMemberViaUi(page, ARCHIVE_FLOW_MEMBER)
  await reloadRosterAfterLocalWrites(page)
  await expectRosterMemberVisible(page, fullName)

  await archiveRosterMemberFromDetails(page, fullName)
  await expectRosterMemberHidden(page, fullName)

  // Why: archive is a local-first roster mutation, so the archived projection must survive a fresh IndexedDB read before restoration is tested.
  await reloadRosterAfterLocalWrites(page)
  await expectRosterMemberHidden(page, fullName)
  await openRosterTab(page, 'Archiwum')
  await expectRosterMemberVisible(page, fullName)

  await unarchiveRosterMemberFromDetails(page, fullName)
  await expectRosterMemberHidden(page, fullName)

  // Why: restore is only complete when the member leaves the archived projection and returns to active roster after local storage is re-read.
  await reloadRosterAfterLocalWrites(page)
  await openRosterTab(page, 'Archiwum')
  await expectRosterMemberHidden(page, fullName)
  await openRosterTab(page, 'Aktywni')
  await expectRosterMemberVisible(page, fullName)
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

test('deletes a roster member without saved payments or attendance', async ({
  page
}) => {
  const fullName = memberFullName(CLEAN_DELETE_MEMBER)

  await openDemoRoster(page)
  await addRosterMemberViaUi(page, CLEAN_DELETE_MEMBER)
  await reloadRosterAfterLocalWrites(page)
  await expectRosterMemberVisible(page, fullName)

  await deleteRosterMemberFromDetails(page, fullName)
  await expect(
    page.getByRole('heading', { name: /usunąć członka/i })
  ).not.toBeVisible()
  await expectRosterMemberHidden(page, fullName)

  // Why: local-first deletion is only complete when the member stays gone after IndexedDB is re-read on reload.
  await reloadRosterAfterLocalWrites(page)
  await expectRosterMemberHidden(page, fullName)
})

test('keeps a roster member when saved payment history blocks deletion', async ({
  page
}) => {
  const { absent: memberWithPayment } = currentDemoPaymentTargets()

  await openDemoPayments(page)
  await filterPaymentsByMember(page, memberWithPayment)
  await openPaymentConfirmation(page)
  await confirmPayment(page)
  await expectPaymentWritePersistedAsPaid(page, memberWithPayment)

  await openRosterAfterLocalWrites(page)
  await deleteRosterMemberFromDetails(page, memberWithPayment.fullName)

  await expect(
    page.getByText(/nie możesz usunąć członka, który ma zapisane płatności/i)
  ).toBeVisible()

  // Why: DeleteMemberUseCase must leave paid members in the local roster even after the blocked delete attempt and a fresh read.
  await reloadRosterAfterLocalWrites(page)
  await expectRosterMemberVisible(page, memberWithPayment.fullName)
})

test('keeps a roster member when attendance history blocks deletion', async ({
  page
}) => {
  const fullName = memberFullName(ATTENDANCE_BLOCKED_MEMBER)

  await openDemoRoster(page)
  await addRosterMemberViaUi(page, ATTENDANCE_BLOCKED_MEMBER)
  await createAttendanceBlocker(page, fullName)

  await openRosterAfterLocalWrites(page)
  await deleteRosterMemberFromDetails(page, fullName)

  await expect(
    page.getByRole('heading', { name: /najpierw usuń z treningów/i })
  ).toBeVisible()
  await expect(
    page.getByText(/ten członek występuje na 1 listach obecności/i)
  ).toBeVisible()
  await page.getByRole('button', { name: /^rozumiem$/i }).click()

  // Why: attendance-linked members must remain after the explanatory modal is dismissed and the roster reloads from local storage.
  await reloadRosterAfterLocalWrites(page)
  await expectRosterMemberVisible(page, fullName)
})
