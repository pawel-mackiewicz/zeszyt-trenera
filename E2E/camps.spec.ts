import { expect, test } from 'playwright/test'

import {
  addCampViaUi,
  acceptCampParticipantResignationViaUi,
  cancelCampParticipantResignationViaUi,
  expectCampParticipantDiscountVisible,
  expectCampParticipantShownOnce,
  expectCampParticipantStatus,
  expectCampParticipantVisible,
  expectCampVisible,
  expectMoneyVisible,
  expectSignedCampCandidate,
  fillCampParticipantMoney,
  grantCampParticipantDiscountViaUi,
  openCampDetailsViaUi,
  openCampParticipantDetailsViaUi,
  openCampParticipantPicker,
  openClubCampParticipantForm,
  openDemoCamps,
  registerCampParticipantPaymentViaUi,
  registerCampParticipantRefundViaUi,
  registerExternalCampParticipantViaUi,
  reloadCampDetailsAfterLocalWrites,
  reloadCampParticipantDetailsAfterLocalWrites,
  reloadCampsAfterLocalWrites,
  type CampDraft
} from './support/camps'

const NEW_CAMP: CampDraft = {
  name: 'Obóz techniczny lato',
  startDate: '2026-07-10',
  finishDate: '2026-07-17',
  price: '2400',
  note: 'Gi, ochraniacze, zgody rodziców'
}
const FUNDAMENTALS_CAMP = 'Fundamentals weekend camp'
const COMPETITION_CAMP = 'Competition preparation camp'
const LEDGER_PARTICIPANT = 'Pola Ledger'
const RESIGNATION_PARTICIPANT = 'Renata Zwrot'

test('adds a camp and keeps it after reload with an empty participant ledger', async ({
  page
}) => {
  await openDemoCamps(page)
  await addCampViaUi(page, NEW_CAMP)

  await reloadCampsAfterLocalWrites(page)
  await expectCampVisible(page, NEW_CAMP.name)
  await openCampDetailsViaUi(page, NEW_CAMP.name)
  await expect(page.getByText(/brak uczestników na tym obozie/i)).toBeVisible()
})

test('registers a club member for a demo camp with discount and initial payment', async ({
  page
}) => {
  await openDemoCamps(page)
  await openCampDetailsViaUi(page, FUNDAMENTALS_CAMP)
  await openCampParticipantPicker(page)
  await openClubCampParticipantForm(page, 'Amanda Nunes')
  await expect(
    page.getByText(new RegExp(`^${FUNDAMENTALS_CAMP}$`, 'i'))
  ).toBeVisible()

  await fillCampParticipantMoney(page, {
    discount: '123,45',
    payment: '234,56'
  })
  await expectMoneyVisible(page, '591,99')
  await page.getByRole('button', { name: /zapisz klubowicza/i }).click()
  await expect(
    page.getByRole('heading', { exact: true, name: FUNDAMENTALS_CAMP })
  ).toBeVisible()

  await reloadCampDetailsAfterLocalWrites(page, FUNDAMENTALS_CAMP)
  await expectCampParticipantVisible(page, 'Amanda Nunes')
  await expectCampParticipantDiscountVisible(page, 'Amanda Nunes')
  await expectMoneyVisible(page, '234,56')
  await expectMoneyVisible(page, '826,55')
})

test('registers an external participant for a demo camp with a full initial payment', async ({
  page
}) => {
  await openDemoCamps(page)
  await openCampDetailsViaUi(page, COMPETITION_CAMP)
  await openCampParticipantPicker(page)
  await registerExternalCampParticipantViaUi(page, {
    firstName: 'Ewelina',
    lastName: 'Platna',
    money: {
      payment: '1250'
    }
  })
  await expect(
    page.getByRole('heading', { exact: true, name: COMPETITION_CAMP })
  ).toBeVisible()

  await reloadCampDetailsAfterLocalWrites(page, COMPETITION_CAMP)
  await expectCampParticipantVisible(page, 'Ewelina Platna')
})

test('prevents duplicate external participant registration through the UI', async ({
  page
}) => {
  await openDemoCamps(page)
  await openCampDetailsViaUi(page, COMPETITION_CAMP)
  await openCampParticipantPicker(page)
  await registerExternalCampParticipantViaUi(page, {
    firstName: 'Nina',
    lastName: 'Dublet'
  })
  await expect(
    page.getByRole('heading', { exact: true, name: COMPETITION_CAMP })
  ).toBeVisible()
  await reloadCampDetailsAfterLocalWrites(page, COMPETITION_CAMP)
  await expectCampParticipantVisible(page, 'Nina Dublet')

  await openCampParticipantPicker(page)
  await registerExternalCampParticipantViaUi(page, {
    firstName: 'Nina',
    lastName: 'Dublet'
  })

  await expect(
    page.getByText(/ten uczestnik jest już zapisany na ten obóz/i)
  ).toBeVisible()
  await page.goto('/camps')
  await expect(
    page.getByRole('heading', { exact: true, name: 'Obozy' })
  ).toBeVisible()
  await openCampDetailsViaUi(page, COMPETITION_CAMP)
  await reloadCampDetailsAfterLocalWrites(page, COMPETITION_CAMP)
  await expectCampParticipantShownOnce(page, 'Nina Dublet')
})

test('marks an already signed club member in the candidate picker', async ({
  page
}) => {
  await openDemoCamps(page)
  await openCampDetailsViaUi(page, FUNDAMENTALS_CAMP)
  await openCampParticipantPicker(page)

  await expectSignedCampCandidate(page, 'Gordon Ryan')
  await expect(
    page.getByRole('heading', { name: /dodaj uczestnika obozu/i })
  ).toBeVisible()
})

test('updates an active camp participant ledger from participant details and keeps it after reload', async ({
  page
}) => {
  await openDemoCamps(page)
  await openCampDetailsViaUi(page, COMPETITION_CAMP)
  await openCampParticipantPicker(page)
  await registerExternalCampParticipantViaUi(page, {
    firstName: 'Pola',
    lastName: 'Ledger'
  })
  await expect(
    page.getByRole('heading', { exact: true, name: COMPETITION_CAMP })
  ).toBeVisible()

  await reloadCampDetailsAfterLocalWrites(page, COMPETITION_CAMP)
  await openCampParticipantDetailsViaUi(page, LEDGER_PARTICIPANT)
  await expectCampParticipantStatus(page, 'Zapisany')

  await grantCampParticipantDiscountViaUi(page, {
    amount: '100',
    reason: 'Rabat rodzinny'
  })
  await expectMoneyVisible(page, '100,00')

  await registerCampParticipantPaymentViaUi(page, {
    amount: '200',
    note: 'Przelew rodzica'
  })
  await expectMoneyVisible(page, '200,00')

  await reloadCampParticipantDetailsAfterLocalWrites(page, LEDGER_PARTICIPANT)
  await expectCampParticipantStatus(page, 'Zapisany')
  await expectMoneyVisible(page, '100,00')
  await expectMoneyVisible(page, '200,00')
  await expectMoneyVisible(page, '950,00')
})

test('moves a paid camp participant through resignation, refund, and cancellation from details', async ({
  page
}) => {
  await openDemoCamps(page)
  await openCampDetailsViaUi(page, COMPETITION_CAMP)
  await openCampParticipantPicker(page)
  await registerExternalCampParticipantViaUi(page, {
    firstName: 'Renata',
    lastName: 'Zwrot',
    money: {
      payment: '1250'
    }
  })
  await expect(
    page.getByRole('heading', { exact: true, name: COMPETITION_CAMP })
  ).toBeVisible()

  await reloadCampDetailsAfterLocalWrites(page, COMPETITION_CAMP)
  await openCampParticipantDetailsViaUi(page, RESIGNATION_PARTICIPANT)
  await expectCampParticipantStatus(page, 'Opłacony')

  await acceptCampParticipantResignationViaUi(page)
  await expectCampParticipantStatus(page, 'Rezygnacja')
  await expectMoneyVisible(page, '1250,00')

  await reloadCampParticipantDetailsAfterLocalWrites(
    page,
    RESIGNATION_PARTICIPANT
  )
  await expectCampParticipantStatus(page, 'Rezygnacja')
  await registerCampParticipantRefundViaUi(page, '1250')
  await expectCampParticipantStatus(page, 'Zwrócono')

  await reloadCampParticipantDetailsAfterLocalWrites(
    page,
    RESIGNATION_PARTICIPANT
  )
  await expectCampParticipantStatus(page, 'Zwrócono')
  await cancelCampParticipantResignationViaUi(page)
  await expectCampParticipantStatus(page, 'Zapisany')

  await reloadCampParticipantDetailsAfterLocalWrites(
    page,
    RESIGNATION_PARTICIPANT
  )
  await expectCampParticipantStatus(page, 'Zapisany')
  await expect(
    page.getByRole('button', { name: /^przyjmij płatność$/i })
  ).toBeVisible()
})
