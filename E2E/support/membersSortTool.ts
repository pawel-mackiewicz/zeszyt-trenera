import { type Locator, type Page } from 'playwright/test'

type MembersSortField = 'dateOfBirth' | 'firstName' | 'joinedAt' | 'lastName'

export function membersSortFieldSelect(page: Page): Locator {
  return page.getByRole('combobox', { name: /sortuj według/i })
}

export function membersSortDirectionToggle(page: Page): Locator {
  return page.getByRole('button', { name: /kierunek:/i })
}

export async function setMembersSortField(page: Page, field: MembersSortField) {
  await membersSortFieldSelect(page).selectOption(field)
}

export async function toggleMembersSortDirection(page: Page) {
  await membersSortDirectionToggle(page).click()
}
