import { expect, test } from 'playwright/test'

import {
  addCampViaUi,
  expectCampParticipantShownOnce,
  expectCampParticipantVisible,
  expectCampVisible,
  expectMoneyVisible,
  expectSignedCampCandidate,
  fillCampParticipantMoney,
  openCampDetailsViaUi,
  openCampParticipantPicker,
  openClubCampParticipantForm,
  openDemoCamps,
  registerExternalCampParticipantViaUi,
  reloadCampDetailsAfterLocalWrites,
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
  await page.getByRole('button', { name: /^zapisz$/i }).click()
  await expect(
    page.getByRole('heading', { exact: true, name: FUNDAMENTALS_CAMP })
  ).toBeVisible()

  await reloadCampDetailsAfterLocalWrites(page, FUNDAMENTALS_CAMP)
  await expectCampParticipantVisible(page, 'Amanda Nunes')
  await expect(page.getByText(/^zniżka$/i)).toHaveCount(2)
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
