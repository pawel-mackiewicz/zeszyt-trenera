import { expect, type Locator, type Page } from 'playwright/test'

import { openDemoRoster } from './demo'

export type DemoPaymentMemberTarget = {
  age: number
  fullName: string
  attendanceCount?: number
}

export type DemoPaymentTargets = {
  absent: DemoPaymentMemberTarget
  attended: DemoPaymentMemberTarget & {
    attendanceCount: number
  }
  paid: DemoPaymentMemberTarget
  monthLabel: string
}

export type PaymentConfirmationExpectation = {
  member: DemoPaymentMemberTarget
  monthLabel: string
  attendanceCount?: number
}

export type PaymentDeletionExpectation = {
  member: DemoPaymentMemberTarget
  monthLabel: string
}

// Why: payments specs need deterministic demo actors without reading IndexedDB directly, so this mirrors the demo seed's public input list while the app still performs every write.
const DEMO_MEMBER_NAMES = [
  'Royce Gracie',
  'Rickson Gracie',
  'Roger Gracie',
  'Marcelo Garcia',
  'Gordon Ryan',
  'Andre Galvao',
  'Marcus Almeida',
  'Romulo Barral',
  'Rafael Mendes',
  'Guilherme Mendes',
  'Rubens Cobrinha',
  'Rodolfo Vieira',
  'Bernardo Faria',
  'Leandro Lo',
  'Tainan Dalpra',
  'Mica Galvao',
  'Demian Maia',
  'Charles Oliveira',
  'Anderson Silva',
  'Jose Aldo',
  'Amanda Nunes',
  'Valentina Shevchenko',
  'Zhang Weili',
  'Joanna Jedrzejczyk',
  'Islam Makhachev',
  'Khabib Nurmagomedov',
  'Jon Jones',
  'Georges St-Pierre',
  'Daniel Cormier',
  'Kamaru Usman',
  'Israel Adesanya',
  'Alexander Volkanovski',
  'Max Holloway',
  'Conor McGregor',
  'Dustin Poirier',
  'Nate Diaz',
  'Nick Diaz',
  'Frankie Edgar',
  'Ronda Rousey',
  'Holly Holm',
  'Cris Cyborg',
  'Fedor Emelianenko',
  'Mirko Filipovic',
  'Fabricio Werdum',
  'Antonio Nogueira',
  'Junior Dos Santos',
  'Cain Velasquez',
  'Lyoto Machida',
  'Bj Penn',
  'Henry Cejudo',
  'Mamed Khalidov',
  'Mariusz Pudzianowski',
  'Janek Błachowicz',
  'Mateusz Gamrot',
  'Karolina Kowalkiewicz',
  'Damian Janikowski',
  'Michał Materla',
  'Łukasz Jurkowski',
  'Artur Szpilka',
  'Tomasz Adamek'
] as const

const DEMO_MEMBER_AGES = [
  5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 21, 22, 23, 24, 25, 26,
  27, 28, 29, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60,
  61, 62, 63, 64, 65, 67, 69, 71, 73, 75, 19, 31, 33, 35, 37, 39, 41, 43, 45, 47
] as const

const MONTH_SESSION_TEMPLATE = [
  { day: 1, hours: 8, minutes: 0 },
  { day: 1, hours: 12, minutes: 0 },
  { day: 2, hours: 18, minutes: 0 },
  { day: 4, hours: 18, minutes: 0 },
  { day: 6, hours: 18, minutes: 0 },
  { day: 8, hours: 18, minutes: 0 },
  { day: 10, hours: 18, minutes: 0 },
  { day: 12, hours: 18, minutes: 0 },
  { day: 14, hours: 18, minutes: 0 },
  { day: 17, hours: 18, minutes: 0 },
  { day: 19, hours: 18, minutes: 0 },
  { day: 21, hours: 18, minutes: 0 },
  { day: 24, hours: 18, minutes: 0 },
  { day: 26, hours: 18, minutes: 0 },
  { day: 28, hours: 18, minutes: 0 }
] as const

const DEMO_UNPAID_ABSENT_MEMBER_COUNT = 5
const MAX_UNPAID_ATTENDED_MEMBER_COUNT = 3

export async function openDemoPayments(page: Page) {
  await openDemoRoster(page)

  await page.goto('/payments')
  await expect(paymentsHeading(page)).toBeVisible()
}

export async function reloadPaymentsAfterLocalWrites(page: Page) {
  // Why: payment confirmation is only proven when the monthly ledger reloads from local storage after Vue loses transient state.
  await page.reload()
  await expect(paymentsHeading(page)).toBeVisible()
}

export async function filterPaymentsByMember(
  page: Page,
  member: DemoPaymentMemberTarget
) {
  await page.getByLabel(/szukaj członka/i).fill(member.fullName)
  await expect(paymentMemberName(page, member)).toBeVisible()
}

export async function expectUnpaidAttendedPaymentRow(
  page: Page,
  member: DemoPaymentMemberTarget & { attendanceCount: number }
) {
  await expect(
    page.getByText('Obecni i nieopłacili', { exact: true })
  ).toBeVisible()
  await expect(
    page.getByText(new RegExp(`^${member.attendanceCount} TR\\.$`, 'i'))
  ).toBeVisible()
}

export async function expectUnpaidAbsentPaymentRow(page: Page) {
  await expect(
    page.getByText('Nieobecni i nieopłacili', { exact: true })
  ).toBeVisible()
  await expect(page.getByText(/\d+ TR\./i)).not.toBeVisible()
}

export async function openPaymentConfirmation(page: Page) {
  await page.getByRole('button', { name: /^oznacz jako opłacone$/i }).click()
  await expect(paymentConfirmationDialog(page)).toBeVisible()
}

export async function cancelPaymentConfirmation(page: Page) {
  await paymentConfirmationDialog(page)
    .getByRole('button', { name: /^anuluj$/i })
    .click()
  await expect(paymentConfirmationDialog(page)).not.toBeVisible()
}

export async function confirmPayment(page: Page) {
  await paymentConfirmationDialog(page)
    .getByRole('button', { name: /^potwierdź płatność$/i })
    .click()
  await expect(paymentConfirmationDialog(page)).not.toBeVisible()
}

export async function openPaymentDeletion(
  page: Page,
  member: DemoPaymentMemberTarget
) {
  await page
    .getByRole('button', {
      name: new RegExp(`^usuń płatność: ${escapeRegExp(member.fullName)}$`, 'i')
    })
    .click()
  await expect(paymentDeletionDialog(page)).toBeVisible()
}

export async function confirmPaymentDeletion(page: Page) {
  await paymentDeletionDialog(page)
    .getByRole('button', { name: /^usuń płatność$/i })
    .click()
  await expect(paymentDeletionDialog(page)).not.toBeVisible()
}

export async function expectPaymentConfirmationContext(
  page: Page,
  { attendanceCount, member, monthLabel }: PaymentConfirmationExpectation
) {
  const dialog = paymentConfirmationDialog(page)

  await expect(dialog).toBeVisible()
  await expect(
    dialog.getByText(
      new RegExp(
        `Czy odebrano płatność od ${escapeRegExp(
          member.fullName
        )} za ${escapeRegExp(monthLabel)}\\?`,
        'i'
      )
    )
  ).toBeVisible()
  await expect(dialog.getByText(/^członek$/i)).toBeVisible()
  await expect(
    dialog.getByText(new RegExp(`^${escapeRegExp(member.fullName)}$`, 'i'))
  ).toBeVisible()
  await expect(dialog.getByText(/^miesiąc$/i)).toBeVisible()
  await expect(
    dialog.getByText(new RegExp(`^${escapeRegExp(monthLabel)}$`, 'i'))
  ).toBeVisible()
  await expect(dialog.getByText(/^wiek$/i)).toBeVisible()
  await expect(
    dialog.getByText(new RegExp(`^${member.age} lat$`, 'i'))
  ).toBeVisible()
  await expect(
    dialog.getByRole('button', { name: /^potwierdź płatność$/i })
  ).toBeVisible()
  await expect(dialog.getByRole('button', { name: /^anuluj$/i })).toBeVisible()

  if (attendanceCount === undefined) {
    await expect(dialog.getByText(/^obecności$/i)).not.toBeVisible()
    await expect(dialog.getByText(/treningi w tym miesiącu/i)).not.toBeVisible()
    return
  }

  await expect(dialog.getByText(/^obecności$/i)).toBeVisible()
  await expect(
    dialog.getByText(
      new RegExp(`^${attendanceCount} treningi w tym miesiącu$`, 'i')
    )
  ).toBeVisible()
}

export async function expectPaymentDeletionConfirmationContext(
  page: Page,
  { member, monthLabel }: PaymentDeletionExpectation
) {
  const dialog = paymentDeletionDialog(page)

  await expect(dialog).toBeVisible()
  await expect(
    dialog.getByText(
      new RegExp(
        `Czy usunąć płatność od ${escapeRegExp(
          member.fullName
        )} za ${escapeRegExp(monthLabel)}\\?`,
        'i'
      )
    )
  ).toBeVisible()
  await expect(dialog.getByText(/^członek$/i)).toBeVisible()
  await expect(
    dialog.getByText(new RegExp(`^${escapeRegExp(member.fullName)}$`, 'i'))
  ).toBeVisible()
  await expect(dialog.getByText(/^miesiąc$/i)).toBeVisible()
  await expect(
    dialog.getByText(new RegExp(`^${escapeRegExp(monthLabel)}$`, 'i'))
  ).toBeVisible()
  await expect(dialog.getByText(/^wiek$/i)).toBeVisible()
  await expect(
    dialog.getByText(new RegExp(`^${member.age} lat$`, 'i'))
  ).toBeVisible()
  await expect(
    dialog.getByRole('button', { name: /^usuń płatność$/i })
  ).toBeVisible()
  await expect(dialog.getByRole('button', { name: /^anuluj$/i })).toBeVisible()
}

export async function expectPaidPaymentRow(
  page: Page,
  member: DemoPaymentMemberTarget
) {
  await expect(page.getByText('Opłacili', { exact: true })).toBeVisible()
  await expect(paymentMemberName(page, member)).toBeVisible()
  await expect(page.getByText(/^opłacone$/i)).toBeVisible()
}

export async function expectPaymentWritePersistedAsPaid(
  page: Page,
  member: DemoPaymentMemberTarget
) {
  // Why: payment confirmation is a local-first write, so the final paid-state assertion must come from a fresh monthly ledger read.
  await reloadPaymentsAfterLocalWrites(page)
  await filterPaymentsByMember(page, member)
  await expectPaidPaymentRow(page, member)
  await expect(
    page.getByRole('button', { name: /^oznacz jako opłacone$/i })
  ).not.toBeVisible()
}

export async function expectPaymentWritePersistedAsUnpaid(
  page: Page,
  member: DemoPaymentMemberTarget
) {
  // Why: payment deletion is a local-first write, so the final assertion must come from a fresh monthly ledger read without assuming whether this demo member attended in the month.
  await reloadPaymentsAfterLocalWrites(page)
  await filterPaymentsByMember(page, member)
  await expect(paymentMemberName(page, member)).toBeVisible()
  await expect(
    page.getByRole('button', { name: /^oznacz jako opłacone$/i })
  ).toBeEnabled()
  await expect(page.getByText(/^opłacone$/i)).not.toBeVisible()
  await expect(
    page.getByRole('button', {
      name: new RegExp(`^usuń płatność: ${escapeRegExp(member.fullName)}$`, 'i')
    })
  ).not.toBeVisible()
}

export async function expectReminderWorkflowReachable(page: Page) {
  const reminderButton = page.getByRole('button', { name: /^przypomnij$/i })

  await expect(reminderButton).toBeEnabled()
  await reminderButton.click()

  await expect(reminderButton).toBeEnabled()
  await expect(
    page.getByText(/nie udało się otworzyć wiadomości SMS/i)
  ).not.toBeVisible()
  await expect(
    page.getByText(/ten ekran nie otworzył jeszcze wiadomości SMS/i)
  ).not.toBeVisible()
  await expect(paymentsHeading(page)).toBeVisible()
  await expect(page.getByLabel(/szukaj członka/i)).toBeEnabled()
  await expect(
    page.getByRole('button', { name: /^oznacz jako opłacone$/i })
  ).toBeEnabled()
}

export function currentDemoPaymentTargets(
  now = new Date()
): DemoPaymentTargets {
  const monthStart = startOfMonth(now)
  const coveredMonth = toCoveredMonth(monthStart)
  const currentSessions = resolveCurrentMonthSessions(monthStart, now)
  const attendedCount = Math.min(
    MAX_UNPAID_ATTENDED_MEMBER_COUNT,
    Math.max(1, currentSessions.length)
  )
  const memberOrder = shuffle(
    Array.from({ length: DEMO_MEMBER_NAMES.length }, (_, index) => index),
    createSeededRng(`${coveredMonth}:categories`)
  )
  const attendedIndexes = memberOrder.slice(0, attendedCount)
  const attendanceTargets = buildVariedAttendanceTargets(
    currentSessions.length,
    attendedIndexes.length,
    Math.min(6, currentSessions.length)
  )
  const absentIndexes = memberOrder.slice(
    attendedCount,
    attendedCount + DEMO_UNPAID_ABSENT_MEMBER_COUNT
  )
  const attendedIndex = attendedIndexes[0] as number
  const absentIndex = absentIndexes[0] as number
  const paidIndex = memberOrder[
    attendedCount + DEMO_UNPAID_ABSENT_MEMBER_COUNT
  ] as number

  return {
    attended: {
      ...demoMemberTarget(attendedIndex),
      attendanceCount: attendanceTargets[0] as number
    },
    absent: demoMemberTarget(absentIndex),
    paid: demoMemberTarget(paidIndex),
    monthLabel: formatPolishMonthLabel(monthStart)
  }
}

export function paymentMemberName(
  page: Page,
  member: DemoPaymentMemberTarget
): Locator {
  return page.getByText(new RegExp(`^${escapeRegExp(member.fullName)}$`, 'i'))
}

export function paymentsHeading(page: Page): Locator {
  return page.getByRole('heading', {
    level: 1,
    name: /płatności/i
  })
}

function paymentConfirmationDialog(page: Page): Locator {
  return page.getByRole('dialog', {
    name: /^oznaczyć składkę jako opłaconą\?$/i
  })
}

function paymentDeletionDialog(page: Page): Locator {
  return page.getByRole('dialog', {
    name: /^usunąć zapisaną płatność\?$/i
  })
}

function demoMemberTarget(index: number): DemoPaymentMemberTarget {
  return {
    fullName: DEMO_MEMBER_NAMES[index] as string,
    age: DEMO_MEMBER_AGES[index] as number
  }
}

function buildVariedAttendanceTargets(
  sessionCount: number,
  attendeeCount: number,
  maxTargetAttendanceCount: number
): number[] {
  const safeMaxTargetAttendanceCount = Math.max(
    1,
    Math.min(sessionCount, maxTargetAttendanceCount)
  )
  const candidates = [
    safeMaxTargetAttendanceCount,
    Math.max(1, safeMaxTargetAttendanceCount - 2),
    Math.max(1, Math.ceil(safeMaxTargetAttendanceCount / 2)),
    1
  ]
  const uniqueTargets = [...new Set(candidates)]
    .filter((count) => count <= sessionCount)
    .sort((left, right) => right - left)

  for (
    let candidate = Math.max(1, sessionCount - 1);
    uniqueTargets.length < attendeeCount && candidate >= 1;
    candidate -= 1
  ) {
    if (!uniqueTargets.includes(candidate)) {
      uniqueTargets.push(candidate)
    }
  }

  return uniqueTargets.slice(0, attendeeCount)
}

function resolveCurrentMonthSessions(monthStart: Date, now: Date): Date[] {
  const pastTemplateSessions = createMonthSessions(monthStart).filter(
    (sessionStart) => sessionStart.getTime() <= now.getTime()
  )

  if (pastTemplateSessions.length > 0) {
    return pastTemplateSessions
  }

  const fallbackSession = new Date(now)

  fallbackSession.setMinutes(fallbackSession.getMinutes() - 15)

  return [
    snapDateToQuarterHourGrid(
      fallbackSession.getTime() < monthStart.getTime()
        ? monthStart
        : fallbackSession
    )
  ]
}

function createMonthSessions(monthStart: Date): Date[] {
  return MONTH_SESSION_TEMPLATE.map((templateEntry) =>
    snapDateToQuarterHourGrid(
      new Date(
        monthStart.getFullYear(),
        monthStart.getMonth(),
        templateEntry.day,
        templateEntry.hours,
        templateEntry.minutes
      )
    )
  )
}

function formatPolishMonthLabel(value: Date): string {
  return new Intl.DateTimeFormat('pl-PL', {
    month: 'long',
    year: 'numeric'
  }).format(value)
}

function toCoveredMonth(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`
}

function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1)
}

function snapDateToQuarterHourGrid(value: Date): Date {
  const snappedValue = new Date(value)
  const roundedMinutes = Math.round(snappedValue.getMinutes() / 15) * 15

  snappedValue.setSeconds(0, 0)
  snappedValue.setMinutes(roundedMinutes)

  return snappedValue
}

function createSeededRng(seedValue: string) {
  return mulberry32(hashString(seedValue))
}

function hashString(value: string): number {
  let hash = 1779033703 ^ value.length

  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 3432918353)
    hash = (hash << 13) | (hash >>> 19)
  }

  return hash >>> 0
}

function mulberry32(seed: number) {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let result = Math.imul(state ^ (state >>> 15), 1 | state)

    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result)

    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(values: T[], rng: () => number): T[] {
  const copy = [...values]

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(rng() * (index + 1))
    const currentValue = copy[index]

    copy[index] = copy[randomIndex] as T
    copy[randomIndex] = currentValue as T
  }

  return copy
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
