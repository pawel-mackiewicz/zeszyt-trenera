import { expect, type Locator, type Page } from 'playwright/test'

export function minimumAgeInput(page: Page): Locator {
  return page.getByRole('spinbutton', { name: /minimalny wiek, wartość/i })
}

export function maximumAgeInput(page: Page): Locator {
  return page.getByRole('spinbutton', { name: /maksymalny wiek, wartość/i })
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
