import { test } from 'playwright/test'

import {
  confirmPayment,
  currentDemoPaymentTargets,
  expectPaidPaymentRow,
  expectPaymentConfirmationContext,
  expectPaymentWritePersistedAsPaid,
  expectReminderWorkflowReachable,
  expectUnpaidAbsentPaymentRow,
  expectUnpaidAttendedPaymentRow,
  filterPaymentsByMember,
  openDemoPayments,
  openPaymentConfirmation
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

test('opens a payment reminder without showing SMS failure and keeps the ledger usable', async ({
  page
}) => {
  const { absent } = currentDemoPaymentTargets()

  await openDemoPayments(page)
  await filterPaymentsByMember(page, absent)
  await expectReminderWorkflowReachable(page)
})
