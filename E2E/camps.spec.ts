import { test } from 'playwright/test'

import {
  addCampViaUi,
  expectCampVisible,
  openDemoCamps,
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

test('adds a camp and keeps it after reload', async ({ page }) => {
  await openDemoCamps(page)
  await addCampViaUi(page, NEW_CAMP)

  await reloadCampsAfterLocalWrites(page)
  await expectCampVisible(page, NEW_CAMP.name)
})
