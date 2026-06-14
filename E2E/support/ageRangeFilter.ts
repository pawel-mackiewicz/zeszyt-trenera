import { expect, type Locator, type Page } from 'playwright/test'

const MIN_AGE_INPUT_SELECTOR =
  '.age-range-filter input[type="number"][aria-label="Minimalny wiek"]'
const MAX_AGE_INPUT_SELECTOR =
  '.age-range-filter input[type="number"][aria-label="Maksymalny wiek"]'

export function minimumAgeInput(page: Page): Locator {
  return page.locator(MIN_AGE_INPUT_SELECTOR)
}

export function maximumAgeInput(page: Page): Locator {
  return page.locator(MAX_AGE_INPUT_SELECTOR)
}

export async function setAgeRangeFilter(
  page: Page,
  {
    maxAge,
    minAge
  }: {
    maxAge: string
    minAge: string
  }
) {
  await minimumAgeInput(page).fill(minAge)
  await maximumAgeInput(page).fill(maxAge)
}

export async function expectAgeRangeFilterValues(
  page: Page,
  {
    maxAge,
    minAge
  }: {
    maxAge: string
    minAge: string
  }
) {
  await expect(minimumAgeInput(page)).toHaveValue(minAge)
  await expect(maximumAgeInput(page)).toHaveValue(maxAge)
}
