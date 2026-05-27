import { expect, type Locator, type Page } from 'playwright/test'

import { openDemoRoster } from './demo'

export type AttendanceSessionExpectation = {
  count: number
  date: Date
  time: string
}

export async function openDemoAttendanceHistory(page: Page) {
  await openDemoRoster(page)

  await page.goto('/attendance')
  await expect(attendanceHistoryHeading(page)).toBeVisible()

  // Why: demo bootstrap is a local-first application write, so attendance checks should start from a fresh IndexedDB read instead of the first in-memory render.
  await page.reload()
  await expect(attendanceHistoryHeading(page)).toBeVisible()
}

export async function openNewAttendanceFromHistory(page: Page) {
  await page.getByRole('link', { name: /\+\s*dodaj/i }).click()
  await expect(page.getByText(/lista obecności/i)).toBeVisible()
}

export async function reloadAttendanceHistoryAfterLocalWrites(page: Page) {
  // Why: saved attendance is only proven when the history screen reloads from local storage after the browser loses Vue's transient state.
  await page.reload()
  await expect(attendanceHistoryHeading(page)).toBeVisible()
}

export async function createAttendanceSessionViaUi(
  page: Page,
  session: AttendanceSessionExpectation,
  memberNames: string[]
) {
  // Why: attendance E2E setup must use the same application-layer write path as the live recorder instead of writing directly to IndexedDB.
  await openNewAttendanceFromHistory(page)
  await setAttendanceSessionDate(page, session.date)
  await setAttendanceSessionTime(page, session.time)
  await markAttendanceMembers(page, memberNames)
  await saveNewAttendance(page)
}

export async function setAttendanceSessionDate(page: Page, date: Date) {
  await page.getByRole('button', { name: /zmień datę treningu/i }).click()
  await page.getByLabel(/^data treningu$/i).fill(toDateInputValue(date))
}

export async function setAttendanceSessionTime(page: Page, time: string) {
  await page.getByRole('button', { name: /zmień godzinę treningu/i }).click()
  await page.getByLabel(/^godzina treningu$/i).fill(time)
}

export async function markAttendanceMembers(page: Page, memberNames: string[]) {
  for (const memberName of memberNames) {
    await page
      .getByRole('button', {
        name: new RegExp(escapeRegExp(memberName), 'i')
      })
      .click()
  }
}

export async function saveNewAttendance(page: Page) {
  await page.getByRole('button', { name: /^zapisz obecność$/i }).click()
  await expect(attendanceHistoryHeading(page)).toBeVisible()
}

export async function saveAttendanceEdits(page: Page) {
  await page.getByRole('button', { name: /^zapisz zmiany$/i }).click()
  await expect(attendanceHistoryHeading(page)).toBeVisible()
}

export async function navigateAttendanceHistoryToMonth(
  page: Page,
  targetDate: Date,
  currentDate = new Date()
) {
  const monthOffset =
    (targetDate.getFullYear() - currentDate.getFullYear()) * 12 +
    targetDate.getMonth() -
    currentDate.getMonth()
  const buttonName =
    monthOffset < 0 ? /poprzedni miesiąc/i : /następny miesiąc/i

  for (let index = 0; index < Math.abs(monthOffset); index += 1) {
    await page.getByRole('button', { name: buttonName }).click()
  }

  await expect(page.getByText(formatPolishMonthLabel(targetDate))).toBeVisible()
}

export async function expectAttendanceHistoryMonth(page: Page, date: Date) {
  // Why: persisted date checks must prove the history ledger is scoped to the same month the coach chose in the editor.
  await expect(page.getByText(formatPolishMonthLabel(date))).toBeVisible()
}

export function attendanceHistorySessionLink(
  page: Page,
  session: Pick<AttendanceSessionExpectation, 'date' | 'time'>
): Locator {
  return page.getByRole('link', {
    name: new RegExp(
      `edytuj trening z dnia ${escapeRegExp(
        formatPolishSessionDate(session.date)
      )}, godzina ${escapeRegExp(session.time)}`,
      'i'
    )
  })
}

export function attendanceHistoryDeleteButton(
  page: Page,
  session: Pick<AttendanceSessionExpectation, 'date' | 'time'>
): Locator {
  // Why: the history delete action is intentionally exposed through its localized aria label, so E2E coverage follows the same target a mobile screen reader user receives.
  return page.getByRole('button', {
    name: new RegExp(
      `usuń trening z dnia ${escapeRegExp(
        formatPolishSessionDate(session.date)
      )}, godzina ${escapeRegExp(session.time)}`,
      'i'
    )
  })
}

export async function expectAttendanceSessionVisible(
  page: Page,
  session: AttendanceSessionExpectation
) {
  const sessionLink = attendanceHistorySessionLink(page, session)

  await expect(sessionLink).toBeVisible()
  await expect(sessionLink).toContainText(
    formatPolishAttendanceCount(session.count)
  )
}

export async function expectAttendanceSessionInHistory(
  page: Page,
  session: AttendanceSessionExpectation
) {
  await navigateAttendanceHistoryToMonth(page, session.date)
  await expectAttendanceSessionVisible(page, session)
}

export function startOfToday(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export function addDays(value: Date, days: number): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate() + days)
}

export function formatPolishSessionDate(value: Date): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(value)
}

export function formatPolishMonthLabel(value: Date): string {
  return new Intl.DateTimeFormat('pl-PL', {
    month: 'long',
    year: 'numeric'
  }).format(value)
}

function toDateInputValue(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function attendanceHistoryHeading(page: Page): Locator {
  return page.getByRole('heading', {
    level: 2,
    name: /historia treningów/i
  })
}

function formatPolishAttendanceCount(count: number): string {
  return count === 1 ? '1 osoba' : `${count} osób`
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
