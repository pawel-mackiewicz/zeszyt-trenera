import { expect, type Page } from 'playwright/test'

export async function expectActiveRosterHeading(
  page: Page,
  locale: 'pl' | 'en' = 'pl'
) {
  const headingName =
    locale === 'pl' ? /^aktywni członkowie$/i : /^active members$/i

  await expect(page.getByRole('heading', { name: headingName })).toBeVisible()
}

export async function expectRosterTotalCount(page: Page, count: number) {
  await expect(page.getByTestId('member-counter-total')).toHaveText(
    String(count)
  )
}

export async function expectRosterTotalCounterHidden(page: Page) {
  await expect(page.getByTestId('member-counter-total')).not.toBeVisible()
}
