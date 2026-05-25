import { expect, test, type Page, type TestInfo } from 'playwright/test'

import {
  demoIntroDialog,
  leaveDemoForSetup,
  openDemoIntro
} from './support/demo'
import {
  addRosterMemberViaUi,
  expectRosterMemberHidden,
  expectRosterMemberVisible,
  type RosterMemberDraft
} from './support/roster'
import { INSTALL_MODAL_SHOWN_STORAGE_KEY } from '../src/appStorageKeys'

type FakeBeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{
    outcome: 'accepted'
    platform: string
  }>
}

const FIRST_MEMBER = {
  firstName: 'Marta',
  lastName: 'Kowalska',
  dateOfBirth: '2011-04-18',
  joinedAt: '2026-01-20',
  countryCode: '+48',
  phoneNumberRest: '600 700 800'
}

const SECOND_MEMBER = {
  firstName: 'Jan',
  lastName: 'Nowak',
  dateOfBirth: '2010-09-03',
  joinedAt: '2026-02-02',
  countryCode: '+48',
  phoneNumberRest: '500 600 700'
}

// Why: sidebar flows mix setup, persistence, backup files, and browser install shims; keeping that vocabulary local makes the spec readable without turning sidebar-only steps into global E2E API.
async function completeFirstRunSetup(page: Page) {
  await openDemoIntro(page)
  await leaveDemoForSetup(page)
  await completeSetupForms(page, {
    clubName: 'Sidebar Club',
    trainerName: 'Sidebar Trainer'
  })
}

async function completeSetupForms(
  page: Page,
  {
    clubName,
    trainerName
  }: {
    clubName: string
    trainerName: string
  }
) {
  await page.getByLabel(/^nazwa klubu$/i).fill(clubName)
  await page.getByLabel(/^data założenia$/i).fill('2024-01-01')
  await page.getByRole('button', { name: /^zapisz klub$/i }).click()

  await expect(
    page.getByRole('heading', { name: /dodaj trenera/i })
  ).toBeVisible()

  await page.getByLabel(/^imię$/i).fill(trainerName)
  await page.getByRole('button', { name: /^zapisz trenera$/i }).click()

  await expect(page.getByRole('heading', { name: /członkowie/i })).toBeVisible()

  // Why: every sidebar scenario below must start outside demo from persisted local setup, not from transient setup-form state.
  await page.reload()
  await expect(page.getByRole('heading', { name: /członkowie/i })).toBeVisible()
}

async function addRosterMemberAndReload(page: Page, member: RosterMemberDraft) {
  await addRosterMemberViaUi(page, member)

  // Why: sidebar backup assertions must read durable roster rows, not member-form state that only exists before the local-first app reloads.
  await page.reload()
  await expectRosterMemberVisible(
    page,
    `${member.firstName} ${member.lastName}`
  )
}

async function resetApplicationFromSidebar(page: Page) {
  await openSidebarFromHeader(page)
  await page.getByRole('button', { name: /^reset aplikacji$/i }).click()
  const resetDialog = page.getByRole('dialog', {
    name: /usuń wszystkie dane aplikacji/i
  })

  await expect(resetDialog).toBeVisible()
  await resetDialog
    .getByLabel(/^wpisz frazę potwierdzającą$/i)
    .fill('DELETE ALL DATA')
  await resetDialog.getByRole('button', { name: /^usuń wszystko$/i }).click()

  // Why: reset must wipe both IndexedDB and app-owned shell flags, so the next boot should recreate the demo intro before any follow-up restore flow starts.
  await expect(demoIntroDialog(page)).toBeVisible()
  await expect(page.getByRole('heading', { name: /członkowie/i })).toBeVisible()
}

async function expectOutsideDemoSidebarActions(page: Page) {
  await expect(
    page.getByRole('button', { name: /^zainstaluj aplikację$/i })
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: /^eksportuj kopię danych$/i })
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: /^przywróć z kopii danych$/i })
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: /^reset aplikacji$/i })
  ).toBeVisible()
  await expect(page.getByText(/^język$/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /^pl$/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /^en$/i })).toBeVisible()
}

async function switchSidebarLanguageToEnglish(page: Page) {
  await page.getByRole('button', { name: /^en$/i }).click()
  await expect(page.getByText(/^language$/i)).toBeVisible()
  await expect(page.getByRole('heading', { name: /^members$/i })).toBeVisible()
}

async function expectEnglishLocaleAfterReload(page: Page) {
  // Why: locale is stored outside IndexedDB so the language switch must survive a cold shell reload before it can be trusted on mobile.
  await page.reload()
  await expect(page.getByRole('button', { name: /^open menu$/i })).toBeVisible()
  await expect(page.getByRole('heading', { name: /^members$/i })).toBeVisible()
}

async function exportBackupFromSidebar(
  page: Page,
  testInfo: TestInfo
): Promise<string> {
  await openSidebarFromHeader(page)
  const downloadPromise = page.waitForEvent('download')

  await page.getByRole('button', { name: /^eksportuj kopię danych$/i }).click()

  const download = await downloadPromise
  const backupPath = testInfo.outputPath('sidebar-backup.json')

  await download.saveAs(backupPath)
  expect(download.suggestedFilename()).toMatch(
    /^zeszyt-trenera-backup-\d{4}-\d{2}-\d{2}\.json$/
  )

  return backupPath
}

async function restoreBackupFromSidebar(page: Page, backupPath: string) {
  await openSidebarFromHeader(page)
  const fileChooserPromise = page.waitForEvent('filechooser')

  await page.getByRole('button', { name: /^przywróć z kopii danych$/i }).click()

  const fileChooser = await fileChooserPromise

  await fileChooser.setFiles(backupPath)

  // Why: restore triggers a full shell reload after the application-layer import so the final assertion must read the reopened local-first database.
  await expect(page.getByRole('heading', { name: /członkowie/i })).toBeVisible()
}

async function openSidebarWithNativeInstallEntry(page: Page) {
  // Why: install entry checks need a ready non-demo shell and a synthetic native prompt before the sidebar is opened.
  await suppressAutomaticInstallPrompt(page)
  await completeFirstRunSetup(page)
  await exposeNativeInstallPrompt(page)
  await openSidebarFromHeader(page)
}

async function runNativePwaInstallFromSidebar(page: Page) {
  await page.getByRole('button', { name: /^zainstaluj aplikację$/i }).click()

  const installDialog = page.getByRole('dialog', {
    name: /zainstaluj zeszyt trenera/i
  })

  await expect(installDialog).toBeVisible()
  await installDialog
    .getByRole('button', { name: /^zainstaluj zeszyt trenera$/i })
    .click()
  await expect(installDialog).not.toBeVisible()
}

async function expectNativeInstallPromptUsedOnce(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { __sidebarInstallPromptCalls?: number })
            .__sidebarInstallPromptCalls ?? 0
      )
    )
    .toBe(1)
}

async function expectInstallEntryHiddenAfterInstall(page: Page) {
  await openSidebarFromHeader(page)
  await expect(
    page.getByRole('button', { name: /^zainstaluj aplikację$/i })
  ).not.toBeVisible()
}

async function openSidebarFromHeader(page: Page) {
  await page.getByRole('button', { name: /^menu$/i }).click()

  // Why: the export action lives only inside the hamburger sidebar, so its visibility proves the header control opened the menu.
  await expect(
    page.getByRole('button', { name: /^eksportuj kopię danych$/i })
  ).toBeVisible()
}

async function exposeNativeInstallPrompt(page: Page) {
  await page.evaluate(() => {
    const installState = window as unknown as {
      __sidebarInstallPromptCalls?: number
    }
    const event = new Event('beforeinstallprompt', {
      cancelable: true
    }) as FakeBeforeInstallPromptEvent

    installState.__sidebarInstallPromptCalls = 0
    event.prompt = async () => {
      installState.__sidebarInstallPromptCalls =
        (installState.__sidebarInstallPromptCalls ?? 0) + 1
      window.dispatchEvent(new Event('appinstalled'))
    }
    event.userChoice = Promise.resolve({
      outcome: 'accepted',
      platform: 'playwright'
    })

    // Why: Chromium does not expose the real install prompt to automated e2e runs, so the spec supplies the browser event that the PWA install feature already consumes in production.
    window.dispatchEvent(event)
  })
}

async function suppressAutomaticInstallPrompt(page: Page) {
  await page.addInitScript((storageKey) => {
    // Why: these specs verify the sidebar install entry, so the one-time automatic nudge is marked as already shown before the shell reads install state.
    window.localStorage.setItem(storageKey, '1')
  }, INSTALL_MODAL_SHOWN_STORAGE_KEY)
}

test('opens from the header and shows outside-demo sidebar actions', async ({
  page
}) => {
  await openSidebarWithNativeInstallEntry(page)
  await expectOutsideDemoSidebarActions(page)
})

test('switches language from the sidebar and keeps it after reload', async ({
  page
}) => {
  await completeFirstRunSetup(page)
  await openSidebarFromHeader(page)

  await switchSidebarLanguageToEnglish(page)
  await expectEnglishLocaleAfterReload(page)
})

test('exports a backup and imports it back', async ({ page }, testInfo) => {
  await completeFirstRunSetup(page)
  await addRosterMemberAndReload(page, FIRST_MEMBER)

  const backupPath = await exportBackupFromSidebar(page, testInfo)

  // Why: the restore check needs a real newer local write to overwrite, otherwise import could pass without replacing app data.
  await addRosterMemberAndReload(page, SECOND_MEMBER)
  await expectRosterMemberVisible(page, 'Marta Kowalska')

  await restoreBackupFromSidebar(page, backupPath)
  await expectRosterMemberVisible(page, 'Marta Kowalska')
  await expectRosterMemberHidden(page, 'Jan Nowak')
})

test('resets the app and boots demo mode again', async ({ page }) => {
  await completeFirstRunSetup(page)

  // Why: reset clears demo lifecycle flags as well as IndexedDB, so the next boot should recreate demo mode and show the first-run demo intro again.
  await resetApplicationFromSidebar(page)
})

test('runs the PWA install action from the sidebar entry', async ({ page }) => {
  await openSidebarWithNativeInstallEntry(page)
  await runNativePwaInstallFromSidebar(page)
  await expectNativeInstallPromptUsedOnce(page)
  await expectInstallEntryHiddenAfterInstall(page)
})
