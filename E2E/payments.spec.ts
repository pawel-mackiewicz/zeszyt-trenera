import { expect, test } from 'playwright/test'

import {
  confirmPayment,
  confirmPaymentDeletion,
  currentDemoPaymentTargets,
  expectPaidPaymentRow,
  expectPaymentDeletionConfirmationContext,
  expectPaymentConfirmationContext,
  expectPaymentWritePersistedAsUnpaid,
  expectPaymentWritePersistedAsPaid,
  expectReminderWorkflowReachable,
  expectUnpaidAbsentPaymentRow,
  expectUnpaidAttendedPaymentRow,
  filterPaymentsByMember,
  openDemoPayments,
  openMonthlyPaymentSummary,
  openPaymentConfirmation,
  readMonthlyPaymentSummary,
  openPaymentDeletion
} from './support/payments'

test('shows attendance context in the mark-as-paid modal for an attended unpaid member', async ({
  page
}) => {
  const { attended, monthLabel } = currentDemoPaymentTargets()

  await openDemoPayments(page)
  await filterPaymentsByMember(page, attended)
  await expectUnpaidAttendedPaymentRow(page, attended)
  await openPaymentConfirmation(page)
  await expectPaymentConfirmationContext(page, {
    attendanceCount: attended.attendanceCount,
    member: attended,
    monthLabel
  })
  await expect(
    page.getByTestId('payment-confirmation-charged-amount')
  ).toBeVisible()
})

test('hides attendance context in the mark-as-paid modal for an absent unpaid member', async ({
  page
}) => {
  const { absent, monthLabel } = currentDemoPaymentTargets()

  await openDemoPayments(page)
  await filterPaymentsByMember(page, absent)
  await expectUnpaidAbsentPaymentRow(page)
  await openPaymentConfirmation(page)
  await expectPaymentConfirmationContext(page, {
    member: absent,
    monthLabel
  })
})

test('moves a confirmed payment to paid members', async ({ page }) => {
  const { absent } = currentDemoPaymentTargets()

  await openDemoPayments(page)
  await filterPaymentsByMember(page, absent)

  await openPaymentConfirmation(page)
  await confirmPayment(page)
  await expectPaidPaymentRow(page, absent)
  await expectPaymentWritePersistedAsPaid(page, absent)
})

test('updates the monthly statistics after a confirmed payment and reload', async ({
  page
}) => {
  const { absent } = currentDemoPaymentTargets()

  await openDemoPayments(page)
  await openMonthlyPaymentSummary(page)
  const initialSummary = await readMonthlyPaymentSummary(page)

  if (initialSummary.totalPaidAmountMinor === null) {
    throw new Error('Expected the initial monthly payment total to be present')
  }

  const initialTotalMemberCount =
    initialSummary.paidMembersCount + initialSummary.unpaidMembersCount

  await filterPaymentsByMember(page, absent)
  await openPaymentConfirmation(page)
  await confirmPayment(page)
  await expectPaymentWritePersistedAsPaid(page, absent)

  await openMonthlyPaymentSummary(page)
  const updatedSummary = await readMonthlyPaymentSummary(page)

  expect(updatedSummary.paidMembersCount).toBe(
    initialSummary.paidMembersCount + 1
  )
  expect(updatedSummary.unpaidMembersCount).toBe(
    initialSummary.unpaidMembersCount - 1
  )
  expect(updatedSummary.totalPaidAmountMinor).toBe(
    initialSummary.totalPaidAmountMinor + 160_00
  )
  expect(updatedSummary.completionPercent).toBe(
    Math.round(
      ((initialSummary.paidMembersCount + 1) / initialTotalMemberCount) * 100
    )
  )
})

test('moves a deleted payment back to unpaid members', async ({ page }) => {
  const { monthLabel, paid } = currentDemoPaymentTargets()

  await openDemoPayments(page)
  await filterPaymentsByMember(page, paid)
  await expectPaidPaymentRow(page, paid)

  await openPaymentDeletion(page, paid)
  await expectPaymentDeletionConfirmationContext(page, {
    member: paid,
    monthLabel
  })
  await confirmPaymentDeletion(page)
  await expectPaymentWritePersistedAsUnpaid(page, paid)
})

test('opens a payment reminder without showing SMS failure and keeps the ledger usable', async ({
  page
}) => {
  const { absent } = currentDemoPaymentTargets()

  await openDemoPayments(page)
  await filterPaymentsByMember(page, absent)
  await expectReminderWorkflowReachable(page)
})
