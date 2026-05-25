import { expect, test } from 'playwright/test'

import {
  addDays,
  attendanceHistorySessionLink,
  createAttendanceSessionViaUi,
  expectAttendanceHistoryMonth,
  expectAttendanceSessionInHistory,
  expectAttendanceSessionVisible,
  formatPolishMonthLabel,
  markAttendanceMembers,
  navigateAttendanceHistoryToMonth,
  openDemoAttendanceHistory,
  openNewAttendanceFromHistory,
  reloadAttendanceHistoryAfterLocalWrites,
  saveAttendanceEdits,
  saveNewAttendance,
  setAttendanceSessionDate,
  setAttendanceSessionTime,
  startOfToday
} from './support/attendance'

const ATTENDANCE_MEMBER_ONE = 'Anderson Silva'
const ATTENDANCE_MEMBER_TWO = 'Amanda Nunes'
const ATTENDANCE_MEMBER_THREE = 'Valentina Shevchenko'

test('filters attendance members by first name, surname, and age range', async ({
  page
}) => {
  await openDemoAttendanceHistory(page)
  await openNewAttendanceFromHistory(page)

  await page.getByLabel(/^filtr$/i).fill('Anderson')

  await expect(page.getByText(/^anderson silva$/i)).toBeVisible()
  await expect(page.getByText(/^royce gracie$/i)).not.toBeVisible()

  await page.getByLabel(/^filtr$/i).fill('Gracie')

  await expect(page.getByText(/^royce gracie$/i)).toBeVisible()
  await expect(page.getByText(/^anderson silva$/i)).not.toBeVisible()

  await page.getByLabel(/^filtr$/i).fill('')
  await page.getByLabel(/minimalny wiek/i).fill('70')
  await page.getByLabel(/maksymalny wiek/i).fill('75')

  await expect(page.getByText(/70 - 75 lat/i)).toBeVisible()
  await expect(page.getByText(/^henry cejudo$/i)).toBeVisible()
  await expect(page.getByText(/^royce gracie$/i)).not.toBeVisible()
})

test('persists attendance after changing the training date', async ({
  page
}) => {
  const sessionDate = addDays(startOfToday(), -1)
  const sessionTime = '23:30'

  await openDemoAttendanceHistory(page)
  await openNewAttendanceFromHistory(page)
  await setAttendanceSessionDate(page, sessionDate)
  await setAttendanceSessionTime(page, sessionTime)
  await markAttendanceMembers(page, [ATTENDANCE_MEMBER_ONE])
  await saveNewAttendance(page)

  // Why: changing the date only matters if the saved session comes back through the monthly history query after reload.
  await reloadAttendanceHistoryAfterLocalWrites(page)
  await navigateAttendanceHistoryToMonth(page, sessionDate)
  await expectAttendanceHistoryMonth(page, sessionDate)
  await expectAttendanceSessionVisible(page, {
    count: 1,
    date: sessionDate,
    time: sessionTime
  })
})

test('persists attendance after changing the training hour', async ({
  page
}) => {
  const sessionDate = startOfToday()
  const sessionTime = '23:45'

  await openDemoAttendanceHistory(page)
  await openNewAttendanceFromHistory(page)
  await setAttendanceSessionTime(page, sessionTime)
  await markAttendanceMembers(page, [ATTENDANCE_MEMBER_ONE])
  await saveNewAttendance(page)

  // Why: the local-first hour edit must survive a full browser reload before the history row is trusted.
  await reloadAttendanceHistoryAfterLocalWrites(page)
  await expectAttendanceSessionInHistory(page, {
    count: 1,
    date: sessionDate,
    time: sessionTime
  })
})

test('shows persisted training with correct date, time, and attendance count', async ({
  page
}) => {
  const sessionDate = startOfToday()
  const sessionTime = '23:15'

  await openDemoAttendanceHistory(page)
  await openNewAttendanceFromHistory(page)
  await setAttendanceSessionTime(page, sessionTime)
  await markAttendanceMembers(page, [
    ATTENDANCE_MEMBER_ONE,
    ATTENDANCE_MEMBER_TWO
  ])
  await saveNewAttendance(page)

  // Why: the count displayed in history is the read-model contract coaches use to audit a saved training at a glance.
  await reloadAttendanceHistoryAfterLocalWrites(page)
  await expectAttendanceSessionInHistory(page, {
    count: 2,
    date: sessionDate,
    time: sessionTime
  })
})

test('persists edits to an existing training', async ({ page }) => {
  const sessionDate = startOfToday()
  const originalTime = '22:45'
  const updatedTime = '23:00'

  await openDemoAttendanceHistory(page)
  await openNewAttendanceFromHistory(page)
  await setAttendanceSessionTime(page, originalTime)
  await markAttendanceMembers(page, [
    ATTENDANCE_MEMBER_ONE,
    ATTENDANCE_MEMBER_TWO
  ])
  await saveNewAttendance(page)
  await reloadAttendanceHistoryAfterLocalWrites(page)
  await expectAttendanceSessionInHistory(page, {
    count: 2,
    date: sessionDate,
    time: originalTime
  })

  await attendanceHistorySessionLink(page, {
    date: sessionDate,
    time: originalTime
  }).click()
  await expect(page.getByText(/edycja obecności/i)).toBeVisible()

  await setAttendanceSessionTime(page, updatedTime)
  await markAttendanceMembers(page, [ATTENDANCE_MEMBER_THREE])
  await saveAttendanceEdits(page)

  // Why: edit writes replace the stored training, so the old time must disappear after history reload while the new count is preserved.
  await reloadAttendanceHistoryAfterLocalWrites(page)
  await expect(
    attendanceHistorySessionLink(page, {
      date: sessionDate,
      time: originalTime
    })
  ).not.toBeVisible()
  await expectAttendanceSessionInHistory(page, {
    count: 3,
    date: sessionDate,
    time: updatedTime
  })
})

test('switches attendance history months', async ({ page }) => {
  const currentMonth = startOfToday()
  const previousMonthSessionDate = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() - 1,
    15
  )
  const currentMonthSession = {
    count: 1,
    date: currentMonth,
    time: '22:30'
  }
  const previousMonthSession = {
    count: 1,
    date: previousMonthSessionDate,
    time: '22:15'
  }

  await openDemoAttendanceHistory(page)
  await createAttendanceSessionViaUi(page, previousMonthSession, [
    ATTENDANCE_MEMBER_ONE
  ])
  await createAttendanceSessionViaUi(page, currentMonthSession, [
    ATTENDANCE_MEMBER_TWO
  ])
  await reloadAttendanceHistoryAfterLocalWrites(page)

  await expect(
    page.getByText(formatPolishMonthLabel(currentMonth))
  ).toBeVisible()
  await expect(
    attendanceHistorySessionLink(page, currentMonthSession)
  ).toBeVisible()

  await navigateAttendanceHistoryToMonth(page, previousMonthSession.date)

  await expect(
    page.getByText(formatPolishMonthLabel(previousMonthSession.date))
  ).toBeVisible()
  await expect(
    attendanceHistorySessionLink(page, previousMonthSession)
  ).toBeVisible()

  await navigateAttendanceHistoryToMonth(
    page,
    currentMonthSession.date,
    previousMonthSession.date
  )

  await expect(
    page.getByText(formatPolishMonthLabel(currentMonth))
  ).toBeVisible()
  await expect(
    attendanceHistorySessionLink(page, currentMonthSession)
  ).toBeVisible()
})
