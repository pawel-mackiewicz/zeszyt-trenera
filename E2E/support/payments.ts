import { expect, type Locator, type Page } from 'playwright/test'

import { openDemoRoster } from './demo'
import {
  type DemoPaymentMemberTarget,
  type DemoPaymentTargets
} from '@/write/infra/demo/demoPaymentTargets'

// Why: payments specs need deterministic demo actors without reading IndexedDB directly, so this keeps the test oracle aligned with the shared demo seed inputs while the app still performs every write.
export { currentDemoPaymentTargets } from '@/write/infra/demo/demoPaymentTargets'
export type { DemoPaymentMemberTarget, DemoPaymentTargets }

export type PaymentConfirmationExpectation = {
  member: DemoPaymentMemberTarget
  monthLabel: string
  attendanceCount?: number
}

export type PaymentDeletionExpectation = {
  member: DemoPaymentMemberTarget
  monthLabel: string
}

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
  const markAsPaidButton = page.getByRole('button', {
    name: /^oznacz jako opłacone$/i
  })

  await scrollActionIntoSafeView(markAsPaidButton)
  await markAsPaidButton.click()
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
  ).not.toBeVisible()
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
  ).not.toBeVisible()
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
  const paidSection = page.getByRole('region', { name: /^opłacili$/i })

  await expect(paidSection).toBeVisible()
  await expect(paymentMemberName(paidSection, member)).toBeVisible()
  await expect(
    paidSection.getByRole('button', {
      name: new RegExp(`^usuń płatność: ${escapeRegExp(member.fullName)}$`, 'i')
    })
  ).toBeVisible()
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
  await scrollActionIntoSafeView(reminderButton)
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

export function paymentMemberName(
  page: Page | Locator,
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

async function scrollActionIntoSafeView(locator: Locator) {
  await locator.evaluate((element) => {
    element.scrollIntoView({ block: 'center', inline: 'nearest' })
  })
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
