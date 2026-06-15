import { expect, test } from 'playwright/test'

import {
  continueDemo,
  demoIntroDialog,
  exitDemoModeForSetup,
  openDemoIntro
} from './support/demo'
import {
  currentDemoPaymentTargets,
  expectPaidPaymentRow,
  filterPaymentsByMember,
  paymentsHeading
} from './support/payments'
import { expectActiveRosterHeading } from './support/roster'

test('starts with demo data persisted across roster, trainings, and payments', async ({
  page
}) => {
  const { paid } = currentDemoPaymentTargets()

  await openDemoIntro(page)
  await continueDemo(page)

  // Why: demo bootstrap is an application-layer write, so the visible seed counts must survive a browser reload before the rest of the demo assertions can trust them.
  await page.reload()
  await expectActiveRosterHeading(page)
  await expect(page.getByTestId('member-counter-total')).toHaveText('60')

  await page.goto('/attendance')
  await expect(
    page.getByRole('heading', { level: 2, name: /historia treningów/i })
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: /edytuj trening z dnia/i }).first()
  ).toBeVisible()

  await page.goto('/payments')
  await expect(paymentsHeading(page)).toBeVisible()
  await filterPaymentsByMember(page, paid)
  await expectPaidPaymentRow(page, paid)
})

test('leaves demo through the intro modal and opens setup on reload', async ({
  page
}) => {
  await openDemoIntro(page)
  await continueDemo(page)
  await exitDemoModeForSetup(page)

  // Why: leaving demo must persist the dismissal choice outside the wiped notebook, otherwise a mobile reload would immediately reseed demo data again.
  await page.reload()
  await expect(page.getByRole('heading', { name: /dodaj klub/i })).toBeVisible()
  await expect(demoIntroDialog(page)).not.toBeVisible()
  await expect(page.getByTestId('member-counter-total')).not.toBeVisible()
})
