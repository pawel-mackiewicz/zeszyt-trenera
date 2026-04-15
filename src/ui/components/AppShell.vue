<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useAppServices } from '@/ui/appServices'
import {
  normalizeResetConfirmationPhrase,
  RESET_APPLICATION_CONFIRMATION_PHRASE
} from '@/write/application/requests/ResetApplicationDataCommand'
import AppButton from '@/ui/components/AppButton.vue'
import AppIcon from '@/ui/components/AppIcon.vue'
import FloatingErrorAlert from '@/ui/components/FloatingErrorAlert.vue'
import InstallModal from '@/ui/components/InstallModal.vue'
import { useAppUpdate } from '@/ui/composables/useAppUpdate'
import { useNetworkStatus } from '@/ui/composables/useNetworkStatus'
import { usePwaInstall } from '@/ui/composables/usePwaInstall'
import { persistLocale, type AppLocale } from '@/ui/i18n'
import {
  createNavigationItems,
  type AppRouteName,
  type NavigationItem
} from '@/ui/router'
import {
  RouterLink,
  RouterView,
  useRoute,
  useRouter
} from '@/ui/router/runtime'
import { useAppStore } from '@/ui/stores/app'

type ObservableSubscription = {
  unsubscribe(): void
}

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const { queries, useCases } = useAppServices()
const { t } = useI18n({ useScope: 'local' })
const { locale } = useI18n({ useScope: 'global' })

useNetworkStatus()
const { promptInstall, manualInstallVariant } = usePwaInstall()
// Registering the worker here keeps background update checks tied to the shell lifecycle while leaving the actual activation behind an explicit menu action.
const { needRefresh, refreshApplication, updatePending } = useAppUpdate()

const {
  appReadiness,
  blockingIssue,
  demoIntroModalVisible,
  demoModeActive,
  installCoachVisible,
  installed,
  installModalVisible,
  installPending,
  installSurface,
  isOnline,
  setupStatus,
  showInstallEntry,
  shouldAutoOpenInstallModal,
  updateError
} = storeToRefs(appStore)

const appVersion = __APP_VERSION__
const localeOptions = [
  { value: 'pl', label: 'PL' },
  { value: 'en', label: 'EN' }
] as const satisfies ReadonlyArray<{ value: AppLocale; label: string }>
// The shell owns route chrome labels so document titles can react to locale changes without leaking translated strings into router metadata.
const routeTitleKeys = {
  'members-list': 'routes.membersList',
  'membership-payments': 'routes.membershipPayments',
  'add-member': 'routes.addMember',
  'attendance-history': 'routes.attendanceHistory',
  'attendance-record': 'routes.attendanceRecord',
  'attendance-edit': 'routes.attendanceEdit',
  'setup-club': 'routes.setupClub',
  'setup-trainer': 'routes.setupTrainer',
  'debug-indexeddb': 'routes.debugIndexedDb'
} as const satisfies Record<AppRouteName, string>
const navigationLabelKeys: Partial<Record<AppRouteName, string>> = {
  'debug-indexeddb': 'menu.debugIndexedDb'
}
// Keeping menu entries derived from the router avoids shipping dead links in production builds.
const navigationItems = createNavigationItems()
const isMenuOpen = ref(false)
const backupImportInput = ref<HTMLInputElement | null>(null)
const backupImportInProgress = ref(false)
const backupImportErrorVisible = ref(false)
const backupExportInProgress = ref(false)
const backupExportErrorVisible = ref(false)
const backupExportErrorMessage = ref<string | null>(null)
const resetModalVisible = ref(false)
const resetConfirmationInput = ref('')
const resetInProgress = ref(false)
const resetErrorVisible = ref(false)
const resetConfirmationPhrase = RESET_APPLICATION_CONFIRMATION_PHRASE
const demoExitInProgress = ref(false)
const demoExitErrorVisible = ref(false)
let setupStatusSubscription: ObservableSubscription | null = null

const appName = computed(() => t('app.name'))
const currentRouteName = computed(() => {
  return typeof route.name === 'string' ? (route.name as AppRouteName) : null
})
const isSetupClubRoute = computed(() => currentRouteName.value === 'setup-club')
const isSetupTrainerRoute = computed(
  () => currentRouteName.value === 'setup-trainer'
)
const isSetupRoute = computed(
  () => isSetupClubRoute.value || isSetupTrainerRoute.value
)
const isMembershipPaymentsRoute = computed(
  () => currentRouteName.value === 'membership-payments'
)
// What: keep the members tab active for the canonical members screen and its legacy alias. Why: older installed launches can still resolve through `/`, but the shell should treat both URLs as the same destination while the route family settles on `/member`.
const isMembersRoute = computed(() => currentRouteName.value === 'members-list')
const isAttendanceHistoryRoute = computed(
  () => currentRouteName.value === 'attendance-history'
)
const isAttendanceRecordRoute = computed(
  () => currentRouteName.value === 'attendance-record'
)
const isAttendanceEditRoute = computed(
  () => currentRouteName.value === 'attendance-edit'
)
// What: keep the history tab active for every attendance route. Why: the shell should read the archive, new-session flow, and edit flow as one destination instead of fragmenting the same mobile workflow across tabs.
const isAttendanceSectionActive = computed(
  () =>
    isAttendanceHistoryRoute.value ||
    isAttendanceRecordRoute.value ||
    isAttendanceEditRoute.value
)
// What: force the selected bottom-nav tab to paint its own readable foreground. Why: relying on inherited text color made the selected-state contrast too fragile for the mobile shell.
const activeBottomNavStateClasses = 'bg-primary text-white'
const inactiveBottomNavStateClasses =
  'text-on-surface hover:bg-surface-container-low'
const activeBottomNavForegroundClasses = 'text-white'
const title = computed(() => {
  const routeName = currentRouteName.value

  return routeName ? t(routeTitleKeys[routeName]) : appName.value
})
const isSetupChecking = computed(
  () => appReadiness.value === 'ready' && setupStatus.value === 'checking'
)
const isSetupGateActive = computed(
  () =>
    appReadiness.value === 'ready' &&
    (setupStatus.value === 'requires-club' ||
      setupStatus.value === 'requires-trainer')
)
const isShellReady = computed(
  () => appReadiness.value === 'ready' && setupStatus.value === 'ready'
)
const isBlockingApplication = computed(() => appReadiness.value === 'blocked')
const installEntryLabel = computed(() =>
  installSurface.value === 'manual'
    ? t('install.entry.manual')
    : t('install.entry.native')
)
const installCoachCopy = computed(() =>
  installSurface.value === 'manual'
    ? t('install.coach.manual')
    : t('install.coach.native')
)
const updateActionLabel = computed(() =>
  updatePending.value ? t('update.action.pending') : t('update.action.ready')
)
const updateErrorMessage = computed(() => {
  if (!updateError.value) {
    return null
  }

  // What: derive the banner copy from the safe error kind only. Why: browser update errors should never be echoed back into the production UI.
  return t(`update.error.${updateError.value.kind}`)
})
const backupExportAlertMessage = computed(
  () => backupExportErrorMessage.value ?? t('menu.exportBackup.error')
)
const isResetConfirmationValid = computed(
  () =>
    normalizeResetConfirmationPhrase(resetConfirmationInput.value) ===
    resetConfirmationPhrase
)
const shellStateEyebrow = computed(() =>
  isBlockingApplication.value
    ? t('shellState.blocked.eyebrow')
    : isSetupChecking.value
      ? t('shellState.setupChecking.eyebrow')
      : t('shellState.checking.eyebrow')
)
const shellStateTitle = computed(() =>
  isBlockingApplication.value
    ? t('shellState.blocked.title')
    : isSetupChecking.value
      ? t('shellState.setupChecking.title')
      : t('shellState.checking.title')
)
const shellStateCopy = computed(() => {
  if (isSetupChecking.value) {
    return t('shellState.setupChecking.body')
  }

  if (!isBlockingApplication.value) {
    return t('shellState.checking.body')
  }

  return blockingIssue.value === 'database'
    ? t('shellState.blocked.database')
    : t('shellState.blocked.unknown')
})
const isInstallModalActive = computed(() => {
  // Bootstrap and blocking screens must stay visually dominant until the local-first shell is actually usable.
  return isShellReady.value && installModalVisible.value
})
const isDemoIntroModalActive = computed(
  () => isShellReady.value && demoIntroModalVisible.value
)
// What: keep the demo entry and exit labels sourced from one local dictionary. Why: the shorter trial-focused wording needs to stay aligned across the header CTA and modal actions in every locale.
const demoHeaderActionLabel = computed(() => t('demo.actions.open'))
const demoExitActionLabel = computed(() =>
  demoExitInProgress.value
    ? t('demo.actions.pending')
    : t('demo.actions.confirm')
)

function unsubscribeSetupStatus() {
  setupStatusSubscription?.unsubscribe()
  setupStatusSubscription = null
}

function subscribeToSetupStatus() {
  if (setupStatusSubscription) {
    return
  }

  // What: observe setup completion from one app-level read model. Why: the shell should unlock and reroute from club to trainer automatically after local writes, without setup views owning shell state.
  setupStatusSubscription = queries.observeSetupStatus.handle().subscribe({
    next(nextStatus) {
      appStore.setSetupStatus(nextStatus)

      if (nextStatus === 'ready' && shouldAutoOpenInstallModal.value) {
        appStore.openInstallModal('automatic')
      }
    },
    error(error) {
      appStore.blockApplication('bootstrap')
      console.error('Failed to observe application setup status.', error)
    }
  })
}

// The auto-open install modal is intentionally one-time so the shell nudges once without becoming repetitive on every launch.
watch(
  [shouldAutoOpenInstallModal, isShellReady, demoIntroModalVisible],
  ([value, shellReady, demoModalVisible]) => {
    if (value && shellReady && !demoModalVisible) {
      appStore.openInstallModal('automatic')
    }
  },
  { immediate: true }
)

watch(installed, (value) => {
  if (value) {
    isMenuOpen.value = false
    appStore.hideInstallCoach()
  }
})

watch(showInstallEntry, (value) => {
  if (!value) {
    appStore.hideInstallCoach()
  }
})

watch(
  appReadiness,
  (value) => {
    if (value === 'ready') {
      // What: reset the setup gate before subscribing. Why: after the database opens, the shell needs a neutral loading state while the first onboarding status arrives.
      appStore.setSetupStatus('checking')
      subscribeToSetupStatus()
      return
    }

    unsubscribeSetupStatus()
  },
  { immediate: true }
)

watch(
  [appReadiness, setupStatus, currentRouteName],
  ([readiness, nextSetupStatus, routeName]) => {
    if (readiness !== 'ready') {
      return
    }

    if (nextSetupStatus === 'requires-club' && routeName !== 'setup-club') {
      router.replace('/setup/club')
      return
    }

    if (
      nextSetupStatus === 'requires-trainer' &&
      routeName !== 'setup-trainer'
    ) {
      router.replace('/setup/trainer')
      return
    }

    if (nextSetupStatus === 'ready' && isSetupRoute.value) {
      router.replace('/member')
    }
  },
  { immediate: true, flush: 'sync' }
)

watch(
  () => route.fullPath,
  () => {
    // What: collapse transient navigation overlays after every route change. Why: the hamburger menu and install coach should never linger over the next screen after navigation completes.
    isMenuOpen.value = false
    appStore.hideInstallCoach()
  }
)

watch(
  [title, appName],
  ([nextTitle, nextAppName]) => {
    // Keeping title updates in the shell lets the visible route labels and browser title share the same local dictionary.
    document.title =
      nextTitle === nextAppName ? nextAppName : `${nextTitle} • ${nextAppName}`
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  unsubscribeSetupStatus()
})

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value

  if (!isMenuOpen.value) {
    appStore.hideInstallCoach()
  }
}

function closeMenu() {
  isMenuOpen.value = false
  appStore.hideInstallCoach()
}

function dismissBackupExportError() {
  // What: let coaches dismiss backup export failures from the shell-level alert. Why: backup retries should not be blocked by stale error copy once the issue is understood.
  backupExportErrorVisible.value = false
  backupExportErrorMessage.value = null
}

function dismissBackupImportError() {
  // What: let coaches dismiss backup import failures from the shell-level alert. Why: restore retries should not stay blocked by stale error copy once the issue is understood.
  backupImportErrorVisible.value = false
}

function openBackupImportPicker() {
  if (backupImportInProgress.value) {
    return
  }

  closeMenu()
  backupImportErrorVisible.value = false
  // What: trigger restore through a hidden native file input. Why: OS pickers keep JSON selection consistent across mobile and desktop without custom upload UI.
  backupImportInput.value?.click()
}

async function handleBackupImportSelection(event: Event) {
  if (backupImportInProgress.value) {
    return
  }

  const fileInput = event.target as HTMLInputElement | null
  const selectedBackupFile = fileInput?.files?.[0]

  if (!selectedBackupFile) {
    return
  }

  backupImportErrorVisible.value = false
  backupImportInProgress.value = true

  try {
    // What: route backup restore through one dedicated application workflow. Why: destructive clear-and-import writes must stay behind the same application boundary as every other Dexie mutation.
    await useCases.importDatabaseBackup.handle({
      backupFile: selectedBackupFile
    })
    reloadApplication()
  } catch (error) {
    backupImportErrorVisible.value = true
    console.error('Failed to import local database backup.', error)
  } finally {
    // What: clear the picker value after each attempt. Why: browsers do not emit change when the same file is selected twice unless the input value is reset.
    if (fileInput) {
      fileInput.value = ''
    }
    backupImportInProgress.value = false
  }
}

async function exportDatabaseBackup() {
  if (backupExportInProgress.value) {
    return
  }

  closeMenu()
  backupExportErrorVisible.value = false
  backupExportErrorMessage.value = null
  backupExportInProgress.value = true

  try {
    // What: route backup export through one dedicated application workflow. Why: database snapshot policy and delivery fallbacks should stay behind the same application boundary as other data workflows.
    await useCases.exportDatabaseBackup.handle({})
  } catch (error) {
    // What: attach technical browser error details to the shared export alert. Why: Android share/download failures are often browser-specific and impossible to diagnose from generic copy.
    backupExportErrorMessage.value = buildBackupExportErrorMessage(t, error)
    backupExportErrorVisible.value = true
    console.error('Failed to export local database backup.', error)
  } finally {
    backupExportInProgress.value = false
  }
}

function buildBackupExportErrorMessage(
  translate: (key: string, values?: Record<string, unknown>) => string,
  error: unknown
): string {
  const errorDetails = formatErrorDetails(error)

  if (!errorDetails) {
    return translate('menu.exportBackup.error')
  }

  return `${translate('menu.exportBackup.error')} ${translate(
    'menu.exportBackup.errorDetails',
    {
      details: errorDetails
    }
  )}`
}

function formatErrorDetails(error: unknown): string | null {
  if (error instanceof DOMException || error instanceof Error) {
    const message = error.message.trim()

    if (message.length === 0) {
      return error.name
    }

    return `${error.name}: ${message}`
  }

  if (typeof error === 'string') {
    const message = error.trim()
    return message.length > 0 ? message : null
  }

  return null
}

function openResetModal() {
  closeMenu()
  resetErrorVisible.value = false
  resetConfirmationInput.value = ''
  resetModalVisible.value = true
}

function closeResetModal() {
  resetModalVisible.value = false
  resetErrorVisible.value = false
  resetConfirmationInput.value = ''
}

function dismissResetError() {
  // What: let the destructive reset flow clear the shared floating error card. Why: coaches may need to keep the modal open while removing a stale validation warning from the top of the screen.
  resetErrorVisible.value = false
}

function openDemoIntroModal() {
  demoExitErrorVisible.value = false
  appStore.showDemoIntroModal()
}

function closeDemoIntroModal() {
  if (demoExitInProgress.value) {
    return
  }

  demoExitErrorVisible.value = false
  appStore.dismissDemoIntroModal()
}

function dismissDemoExitError() {
  // What: let the demo exit flow clear the shared floating error card while the modal stays open. Why: coaches may need to retry the transition into real setup without a stale warning blocking the shell.
  demoExitErrorVisible.value = false
}

function handleBack() {
  if (route.meta.backTo) {
    router.push(route.meta.backTo as string)
  } else {
    router.back()
  }
}

function openInstallEntry() {
  closeMenu()
  appStore.openInstallModal()
}

async function handleInstallPrimaryAction() {
  if (installSurface.value === 'manual') {
    appStore.dismissInstallModal()
    return
  }

  const wasAccepted = await promptInstall()

  if (wasAccepted || !showInstallEntry.value) {
    appStore.dismissInstallModal()
    appStore.hideInstallCoach()
  }
}

function handleInstallLater() {
  appStore.dismissInstallModal()
}

async function handleUpdateAction() {
  await refreshApplication()
}

async function confirmResetApplicationData() {
  if (!isResetConfirmationValid.value || resetInProgress.value) {
    return
  }

  resetInProgress.value = true
  resetErrorVisible.value = false

  try {
    // What: route full-reset writes through the dedicated app workflow. Why: the shell must never mutate Dexie directly, so destructive data wipes stay behind the application boundary.
    await useCases.resetApplicationData.handle({
      confirmationPhrase: resetConfirmationInput.value
    })
    closeResetModal()
    reloadApplication()
  } catch (error) {
    resetErrorVisible.value = true
    console.error('Failed to reset all local application data.', error)
  } finally {
    resetInProgress.value = false
  }
}

async function leaveDemoMode() {
  if (demoExitInProgress.value) {
    return
  }

  demoExitInProgress.value = true
  demoExitErrorVisible.value = false

  try {
    // What: route demo exit through one dedicated application workflow. Why: leaving seeded data behind must stay inside the application boundary so Dexie never gets cleared directly from the shell.
    await useCases.leaveDemoMode.handle({})
    appStore.setDemoModeActive(false)
    appStore.dismissDemoIntroModal()
  } catch (error) {
    demoExitErrorVisible.value = true
    console.error('Failed to leave demo mode.', error)
  } finally {
    demoExitInProgress.value = false
  }
}

function reloadApplication() {
  // What: restart the whole shell after a successful full reset. Why: the current session still holds Pinia and i18n state in memory, so a cold boot is the safe way to reflect the cleared local-first state immediately.
  window.location.reload()
}

function changeLocale(nextLocale: AppLocale) {
  if (locale.value === nextLocale) {
    return
  }

  locale.value = nextLocale
  persistLocale(nextLocale)
}

function navigationLabel(item: NavigationItem) {
  const translationKey =
    navigationLabelKeys[item.name] ?? routeTitleKeys[item.name]

  return t(translationKey)
}

function bottomNavStateClasses(isActive: boolean) {
  return isActive ? activeBottomNavStateClasses : inactiveBottomNavStateClasses
}

function bottomNavForegroundClasses(isActive: boolean) {
  return isActive ? activeBottomNavForegroundClasses : ''
}
</script>

<template>
  <div
    class="app-canvas min-h-screen text-on-surface font-body selection:bg-primary selection:text-white"
  >
    <template v-if="isShellReady">
      <!-- What: keep the restore control as a hidden native file input. Why: browser file pickers are the most reliable cross-platform path for local JSON backup selection in a PWA shell. -->
      <input
        ref="backupImportInput"
        class="sr-only"
        type="file"
        accept=".json,application/json"
        data-testid="import-backup-input"
        @change="handleBackupImportSelection"
      />

      <header
        class="fixed top-0 w-full z-40 flex justify-between items-center px-6 h-16 bg-surface/90 backdrop-blur-md border-b border-on-surface/10 transition-colors"
      >
        <div class="flex items-center gap-4">
          <button
            v-if="route.meta.showBack"
            class="active:scale-95 transition-transform duration-75 text-on-surface hover:bg-surface-container-low p-2 rounded-full flex items-center justify-center"
            @click="handleBack"
          >
            <AppIcon name="arrow_back" />
          </button>
          <button
            v-else
            class="active:scale-95 transition-transform duration-75 text-on-surface relative"
            @click="toggleMenu"
          >
            <AppIcon name="menu" />
          </button>
          <h1
            class="font-headline uppercase tracking-tight font-bold text-primary"
          >
            {{ title }}
          </h1>
        </div>
        <div class="relative flex items-center gap-2">
          <!-- What: keep the demo exit CTA inside the shell header. Why: demo mode should remain escapable from anywhere in the notebook without introducing a second navigation pattern. -->
          <button
            v-if="demoModeActive"
            class="demo-header-action"
            data-testid="open-demo-modal"
            type="button"
            @click="openDemoIntroModal"
          >
            {{ demoHeaderActionLabel }}
          </button>
          <span
            v-if="!isOnline"
            class="inline-flex items-center rounded-full border border-danger/25 bg-danger/10 px-2.5 py-1 font-mono text-[10px] text-danger font-bold uppercase"
            >{{ t('network.offline') }}</span
          >
        </div>
      </header>

      <div v-if="isMenuOpen" class="fixed inset-0 z-50 flex">
        <div
          class="absolute inset-0 bg-black/25 backdrop-blur-sm"
          @click="closeMenu"
        ></div>
        <div
          class="relative w-72 max-w-[85vw] h-full bg-surface border-r border-on-surface/10 shadow-[0_24px_60px_rgba(17,41,39,0.2)] flex flex-col pt-16"
        >
          <div
            class="p-6 border-b border-on-surface/10 bg-surface-container-low"
          >
            <h2 class="font-headline uppercase font-bold text-lg">
              {{ appName }}
            </h2>
            <p class="font-mono text-xs text-secondary mt-1">
              v{{ appVersion }}
            </p>
          </div>
          <nav
            v-if="navigationItems.length > 0"
            class="flex-1 overflow-y-auto py-4"
          >
            <RouterLink
              v-for="item in navigationItems"
              :key="item.name"
              :to="item.to"
              class="block px-6 py-4 font-mono text-sm uppercase font-bold text-on-surface hover:bg-surface-container-low transition-colors"
              @click="closeMenu"
            >
              {{ navigationLabel(item) }}
            </RouterLink>
          </nav>
          <div class="p-6 border-t border-on-surface/10 bg-surface">
            <div class="mb-4">
              <p
                class="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-secondary"
              >
                {{ t('menu.languageLabel') }}
              </p>
              <div class="locale-switcher">
                <button
                  v-for="option in localeOptions"
                  :key="option.value"
                  class="locale-switcher__button"
                  :class="{
                    'locale-switcher__button--active': locale === option.value
                  }"
                  :aria-pressed="locale === option.value"
                  :data-testid="`locale-${option.value}`"
                  type="button"
                  @click="changeLocale(option.value)"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>
            <Transition name="overlay-pop">
              <div
                v-if="installCoachVisible && showInstallEntry"
                class="install-coach-card mb-4"
              >
                <p class="install-coach-card__eyebrow">
                  {{ t('install.coach.eyebrow') }}
                </p>
                <p class="install-coach-card__copy">
                  {{ installCoachCopy }}
                </p>
                <button
                  class="install-coach-card__action"
                  type="button"
                  @click="appStore.hideInstallCoach()"
                >
                  {{ t('common.understand') }}
                </button>
              </div>
            </Transition>
            <!-- What: keep menu-level install and update actions on the shared button primitive. Why: the shell should preserve its own stacking and width rules while inheriting the same CTA states as the rest of the app. -->
            <AppButton
              v-if="showInstallEntry"
              class="w-full"
              type="button"
              @click="openInstallEntry"
            >
              {{ installEntryLabel }}
            </AppButton>
            <AppButton
              v-if="needRefresh"
              class="mt-3 w-full"
              type="button"
              variant="secondary"
              :disabled="updatePending"
              @click="handleUpdateAction"
            >
              {{ updateActionLabel }}
            </AppButton>
            <!-- What: expose local backup export from the shell menu. Why: coaches need a manual recovery path for their offline notebook data without opening developer-only screens. -->
            <AppButton
              class="mt-3 w-full"
              type="button"
              variant="secondary"
              data-testid="export-backup-button"
              :disabled="backupExportInProgress"
              @click="exportDatabaseBackup"
            >
              {{
                backupExportInProgress
                  ? t('menu.exportBackup.pending')
                  : t('menu.exportBackup.action')
              }}
            </AppButton>
            <!-- What: expose local backup restore from the shell menu. Why: coaches need a direct recovery path that can overwrite stale on-device rows with a trusted backup. -->
            <AppButton
              class="mt-3 w-full"
              type="button"
              variant="secondary"
              data-testid="import-backup-button"
              :disabled="backupImportInProgress"
              @click="openBackupImportPicker"
            >
              {{
                backupImportInProgress
                  ? t('menu.importBackup.pending')
                  : t('menu.importBackup.action')
              }}
            </AppButton>
            <!-- What: keep the hard reset action available in the shell menu even during demo mode. Why: a coach who is only testing the seeded notebook still needs the same one-tap recovery path back to clean setup without leaving demo first. -->
            <AppButton
              class="mt-3 w-full"
              type="button"
              variant="secondary"
              data-testid="open-reset-modal"
              @click="openResetModal"
            >
              {{ t('menu.resetData.action') }}
            </AppButton>
          </div>
        </div>
      </div>

      <Transition name="overlay-pop">
        <div
          v-if="isDemoIntroModalActive"
          class="fixed inset-0 z-[75] flex items-end sm:items-center justify-center p-4"
        >
          <div
            class="absolute inset-0 bg-[rgba(17,41,39,0.45)] backdrop-blur-sm"
            @click="closeDemoIntroModal"
          ></div>
          <section class="shell-modal relative w-full max-w-lg">
            <p class="shell-modal__eyebrow">{{ t('demo.eyebrow') }}</p>
            <h2 class="shell-modal__title">{{ t('demo.title') }}</h2>
            <!-- What: keep the demo welcome copy to one compact paragraph. Why: the first-run mobile modal should explain the seeded notebook without forcing coaches to read through a second block before they can explore it. -->
            <p class="shell-modal__copy">{{ t('demo.copy') }}</p>
            <div class="shell-modal__actions">
              <!-- What: make staying in demo the primary CTA. Why: the landing modal should default to exploration so coaches can inspect the seeded local notebook before committing to setup. -->
              <AppButton
                type="button"
                data-testid="continue-demo-button"
                :disabled="demoExitInProgress"
                @click="closeDemoIntroModal"
              >
                {{ t('demo.actions.stay') }}
              </AppButton>
              <AppButton
                type="button"
                variant="secondary"
                :disabled="demoExitInProgress"
                data-testid="confirm-leave-demo-button"
                @click="leaveDemoMode"
              >
                {{ demoExitActionLabel }}
              </AppButton>
            </div>
          </section>
        </div>
      </Transition>

      <!-- What: keep demo-exit failures on the shared floating surface while the modal stays mounted. Why: the coach should understand that leaving demo mode failed without losing the current explanation or CTA context. -->
      <FloatingErrorAlert
        v-if="demoExitErrorVisible"
        :message="t('demo.error')"
        stack-level="modal"
        top-offset="shell"
        @dismiss="dismissDemoExitError"
      />

      <!-- What: route backup-export failures through the shared floating alert. Why: backup issues should be visible in the same shell-level recovery surface as other recoverable errors. -->
      <FloatingErrorAlert
        v-if="backupExportErrorVisible"
        :message="backupExportAlertMessage"
        top-offset="shell"
        @dismiss="dismissBackupExportError"
      />

      <!-- What: route backup-import failures through the shared floating alert. Why: corrupted or incompatible restore files should surface in the same shell-level recovery lane as export/reset errors. -->
      <FloatingErrorAlert
        v-if="backupImportErrorVisible"
        :message="t('menu.importBackup.error')"
        top-offset="shell"
        @dismiss="dismissBackupImportError"
      />

      <div
        v-if="resetModalVisible"
        class="fixed inset-0 z-[70] flex items-center justify-center px-6"
      >
        <div
          class="absolute inset-0 bg-black/40"
          @click="closeResetModal"
        ></div>
        <section class="shell-modal relative w-full max-w-xl">
          <div class="shell-modal__content">
            <!-- What: keep the destructive modal copy limited to the action, consequence, and phrase field. Why: mobile-first confirmation flows are easier to scan when duplicate helper lines do not push the required phrase below the fold. -->
            <h2 class="shell-modal__title">{{ t('menu.resetData.title') }}</h2>
            <p class="shell-modal__copy">{{ t('menu.resetData.copy') }}</p>
            <!-- What: spell out the destructive consequence before the phrase. Why: destructive confirmations are safer when the coach reads the outcome and the required phrase in one sentence instead of seeing the token in isolation. -->
            <p class="shell-modal__copy font-bold">
              {{
                t('menu.resetData.phraseLabel', {
                  phrase: resetConfirmationPhrase
                })
              }}
            </p>
            <input
              id="reset-confirmation"
              v-model="resetConfirmationInput"
              class="w-full rounded-none border border-on-surface/20 bg-surface px-3 py-3 font-mono text-xs text-on-surface"
              type="text"
              autocomplete="off"
              :aria-label="t('menu.resetData.inputLabel')"
              data-testid="reset-confirmation-input"
            />
          </div>
          <div class="shell-modal__actions">
            <AppButton
              type="button"
              variant="secondary"
              :disabled="resetInProgress"
              @click="closeResetModal"
            >
              {{ t('common.cancel') }}
            </AppButton>
            <AppButton
              type="button"
              :disabled="!isResetConfirmationValid || resetInProgress"
              data-testid="confirm-reset-button"
              @click="confirmResetApplicationData"
            >
              {{
                resetInProgress
                  ? t('menu.resetData.pending')
                  : t('menu.resetData.confirm')
              }}
            </AppButton>
          </div>
        </section>
      </div>

      <!-- What: keep reset failures on the shared floating surface even while the confirmation dialog stays mounted. Why: destructive local-data wipes must still expose a recovery message when the application-layer reset rejects. -->
      <FloatingErrorAlert
        v-if="resetErrorVisible"
        :message="t('menu.resetData.error')"
        stack-level="modal"
        top-offset="shell"
        @dismiss="dismissResetError"
      />

      <main class="pt-24 px-6 max-w-5xl mx-auto pb-32">
        <FloatingErrorAlert
          v-if="updateErrorMessage"
          :message="updateErrorMessage"
          :title="t('update.bannerTitle')"
          top-offset="shell"
          @dismiss="appStore.clearUpdateError()"
        />

        <RouterView v-slot="{ Component }">
          <Transition name="fade" mode="out-in">
            <component :is="Component" :key="route.fullPath" />
          </Transition>
        </RouterView>
      </main>

      <!-- What: render the bottom navigation on desktop and mobile. Why: the history tab has to stay pinned in the shell on every viewport so coaches can reach saved attendance without digging into menus. -->
      <nav
        v-if="!route.meta.hideBottomNav"
        class="fixed bottom-0 left-0 w-full z-40 flex justify-around items-stretch h-20 pb-safe bg-surface/90 backdrop-blur-md border-t border-on-surface/10"
      >
        <RouterLink
          to="/member"
          class="flex flex-col items-center justify-center px-4 py-1 transition-all w-full border-x border-on-surface/10"
          :class="bottomNavStateClasses(isMembersRoute)"
        >
          <AppIcon
            name="group"
            :class="bottomNavForegroundClasses(isMembersRoute)"
          />
          <span
            class="font-mono text-[10px] tracking-tighter font-bold uppercase mt-1"
            :class="bottomNavForegroundClasses(isMembersRoute)"
            >{{ t('bottomNav.members') }}</span
          >
        </RouterLink>
        <!-- What: make the payments area a first-class shell destination. Why: once the monthly ledger exists, coaches should reach it from the persistent PWA navigation instead of a dead tab. -->
        <RouterLink
          to="/payments"
          class="flex flex-col items-center justify-center px-4 py-1 transition-all w-full border-x border-on-surface/10"
          :class="bottomNavStateClasses(isMembershipPaymentsRoute)"
        >
          <AppIcon
            name="payments"
            :class="bottomNavForegroundClasses(isMembershipPaymentsRoute)"
          />
          <span
            class="font-mono text-[10px] tracking-tighter font-bold uppercase mt-1"
            :class="bottomNavForegroundClasses(isMembershipPaymentsRoute)"
            >{{ t('bottomNav.payments') }}</span
          >
        </RouterLink>
        <!-- What: send the attendance tab straight to the history route. Why: coaches should reach saved sessions in one tap on mobile, while the live recording flow stays anchored inside the history screen instead of a popover. -->
        <RouterLink
          to="/attendance"
          class="relative w-full border-x border-on-surface/10 flex flex-col items-center justify-center px-4 py-1 transition-all"
          :class="bottomNavStateClasses(isAttendanceSectionActive)"
        >
          <AppIcon
            name="calendar_today"
            :class="bottomNavForegroundClasses(isAttendanceSectionActive)"
          />
          <span
            class="font-mono text-[10px] tracking-tighter font-bold uppercase mt-1"
            :class="bottomNavForegroundClasses(isAttendanceSectionActive)"
          >
            {{ t('bottomNav.attendance') }}
          </span>
        </RouterLink>
      </nav>
    </template>

    <section
      v-else-if="isSetupGateActive"
      class="min-h-screen px-6 py-10 sm:py-12 flex items-center justify-center"
    >
      <!-- What: keep first-run setup outside the normal shell chrome. Why: required club and trainer assignment should stay focused and unskippable until the local notebook is complete. -->
      <div class="w-full flex justify-center">
        <RouterView v-slot="{ Component }">
          <Transition name="fade" mode="out-in">
            <component :is="Component" :key="route.fullPath" />
          </Transition>
        </RouterView>
      </div>
    </section>

    <section
      v-else
      class="min-h-screen px-6 py-12 flex items-center justify-center"
    >
      <div class="shell-state-card">
        <p class="shell-state-card__eyebrow">{{ shellStateEyebrow }}</p>
        <h1 class="shell-state-card__title">{{ shellStateTitle }}</h1>
        <p class="shell-state-card__copy">{{ shellStateCopy }}</p>
        <div
          v-if="isBlockingApplication"
          class="flex flex-col sm:flex-row gap-3"
        >
          <!-- What: route shell recovery and modal actions through the shared button primitive. Why: these shell-only flows still need the same tactile CTA feedback as the main views without keeping a second copy of the recipe here. -->
          <AppButton type="button" @click="reloadApplication">
            {{ t('shellState.retry') }}
          </AppButton>
        </div>
        <div v-else class="shell-state-card__loading" aria-hidden="true">
          <span class="shell-state-card__loading-line"></span>
        </div>
      </div>
    </section>

    <!-- What: keep install actions in the shell while moving modal rendering to a dedicated component. Why: install mutations must stay in one orchestration layer that already owns store and PWA prompt side effects. -->
    <InstallModal
      :active="isInstallModalActive"
      :surface="installSurface"
      :pending="installPending"
      :manual-install-variant="manualInstallVariant"
      @primary="handleInstallPrimaryAction"
      @later="handleInstallLater"
    />
  </div>
</template>

<style scoped>
.locale-switcher {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.locale-switcher__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.6rem;
  border-radius: 999px;
  border: 1px solid rgba(16, 59, 55, 0.12);
  background: rgba(255, 255, 255, 0.78);
  color: var(--ink-soft);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.locale-switcher__button--active {
  background: var(--accent-strong);
  border-color: var(--accent-strong);
  color: white;
}

.demo-header-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.25rem;
  padding: 0.55rem 0.8rem;
  border: 1px solid var(--color-on-surface);
  box-shadow: 2px 2px 0 0 rgba(23, 48, 45, 0.92);
  background: var(--color-surface);
  color: var(--color-on-surface);
  font-family: var(--font-mono);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  line-height: 1;
  text-transform: uppercase;
  transition:
    transform 75ms ease,
    box-shadow 75ms ease,
    background-color 75ms ease;
}

.demo-header-action:hover,
.demo-header-action:focus-visible {
  transform: translate(2px, 2px);
  box-shadow: none;
  background: var(--color-surface-container-low);
}

.demo-header-action:focus-visible {
  outline: 2px solid var(--color-on-surface);
  outline-offset: 3px;
}

.shell-state-card {
  width: min(100%, 34rem);
  display: grid;
  gap: 1rem;
  padding: clamp(1.5rem, 4vw, 2.25rem);
  border-radius: 1.75rem;
  border: 1px solid rgba(16, 59, 55, 0.12);
  background: rgba(249, 249, 249, 0.96);
  box-shadow: var(--shadow-strong);
}

.shell-state-card__eyebrow {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent-hot);
}

.shell-state-card__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(2rem, 7vw, 3rem);
  line-height: 0.98;
  text-transform: uppercase;
  color: var(--accent-strong);
}

.shell-state-card__copy {
  margin: 0;
  color: var(--ink-soft);
  line-height: 1.6;
}

.shell-state-card__loading {
  width: 100%;
  height: 0.35rem;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(16, 59, 55, 0.08);
}

.shell-state-card__loading-line {
  display: block;
  width: 35%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent-cool), var(--accent));
  animation: shell-loading 1.4s ease-in-out infinite;
}

.shell-modal {
  display: grid;
  gap: 1rem;
  padding: clamp(1.25rem, 4vw, 1.75rem);
  border: 1px solid var(--color-on-surface);
  background: var(--color-surface);
  box-shadow: 2px 2px 0 0 rgba(23, 48, 45, 0.92);
}

.shell-modal__eyebrow {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-secondary);
}

.shell-modal__title {
  margin: 0;
  font-family: var(--font-headline);
  font-size: clamp(1.6rem, 6vw, 2.3rem);
  line-height: 0.96;
  text-transform: uppercase;
  color: var(--color-primary);
}

.shell-modal__copy {
  margin: 0;
  color: var(--color-on-surface);
  line-height: 1.5;
}

.shell-modal__actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.install-coach-card {
  display: grid;
  gap: 0.55rem;
  padding: 0.95rem 1rem;
  border-radius: 1.15rem;
  border: 1px solid rgba(16, 59, 55, 0.1);
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 14px 28px rgba(17, 41, 39, 0.08);
}

.install-coach-card__eyebrow {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent-hot);
}

.install-coach-card__copy {
  margin: 0;
  color: var(--ink-soft);
  line-height: 1.5;
}

.install-coach-card__action {
  justify-self: flex-start;
  background: transparent;
  color: var(--accent-strong);
  font-weight: 700;
  padding: 0;
}

.fade-enter-active,
.fade-leave-active,
.overlay-pop-enter-active,
.overlay-pop-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.fade-enter-from,
.fade-leave-to {
  /* What: keep route transitions on opacity only. Why: applying transform to the routed view root turns it into the containing block for nested fixed-position FABs, which makes mobile actions render inline for a frame on reload before snapping back to the viewport. */
  opacity: 0;
}

.overlay-pop-enter-from,
.overlay-pop-leave-to {
  opacity: 0;
  transform: translateY(0.5rem);
}

@keyframes shell-loading {
  0%,
  100% {
    transform: translateX(-10%);
  }

  50% {
    transform: translateX(190%);
  }
}

@media (min-width: 640px) {
  .shell-modal__actions {
    flex-direction: row;
    justify-content: flex-end;
  }
}
</style>

<i18n lang="json">
{
  "pl": {
    "app": {
      "name": "Zeszyt Trenera"
    },
    "common": {
      "cancel": "Anuluj",
      "hide": "Ukryj",
      "understand": "Rozumiem"
    },
    "network": {
      "offline": "Offline"
    },
    "menu": {
      "debugIndexedDb": "Debug IndexedDB",
      "languageLabel": "Język",
      "exportBackup": {
        "action": "Eksportuj kopię danych",
        "pending": "Eksportowanie kopii...",
        "error": "Nie udało się wyeksportować kopii danych. Spróbuj ponownie.",
        "errorDetails": "Szczegóły techniczne: {details}"
      },
      "importBackup": {
        "action": "Przywróć z kopii danych",
        "pending": "Przywracanie kopii...",
        "error": "Nie udało się przywrócić kopii danych. Sprawdź plik i spróbuj ponownie."
      },
      "resetData": {
        "action": "Reset aplikacji",
        "confirm": "Usuń wszystko",
        "copy": "To usunie wszystkich członków, treningi, płatności, konfigurację klubu i trenera oraz lokalne ustawienia aplikacji zapisane na tym urządzeniu.",
        "error": "Nie udało się wyczyścić danych. Spróbuj ponownie.",
        "inputLabel": "Wpisz frazę potwierdzającą",
        "pending": "Usuwanie...",
        "phraseLabel": "Aby usunąć wszystkie dane, wpisz: {phrase}",
        "title": "Usuń wszystkie dane aplikacji"
      }
    },
    "demo": {
      "eyebrow": "Tryb demo",
      "title": "Sprawdź apkę",
      "copy": "Sprawdź zeszyt-trenera na testowych danych :)",
      "error": "Nie udało się wyjść z trybu demo. Spróbuj ponownie.",
      "actions": {
        "open": "Wyjdź z demo",
        "confirm": "Już testowałem :)",
        "pending": "Przechodzę do konfiguracji...",
        "stay": "Sprawdzam!"
      }
    },
    "routes": {
      "membersList": "Członkowie",
      "membershipPayments": "Płatności",
      "addMember": "Dodaj członka",
      "attendanceHistory": "Historia treningów",
      "attendanceRecord": "Nowy trening",
      "attendanceEdit": "Edycja treningu",
      "setupClub": "Konfiguracja klubu",
      "setupTrainer": "Konfiguracja trenera",
      "debugIndexedDb": "Podgląd IndexedDB"
    },
    "bottomNav": {
      "members": "Członkowie",
      "payments": "Płatności",
      "attendance": "Obecności"
    },
    "install": {
      "entry": {
        "manual": "Jak zainstalować",
        "native": "Zainstaluj aplikację"
      },
      "coach": {
        "eyebrow": "Na później",
        "manual": "Tutaj wrócisz do krótkiej instrukcji dodania aplikacji do ekranu głównego.",
        "native": "Tutaj wrócisz do instalacji, kiedy będziesz chciał zrobić to później."
      }
    },
    "update": {
      "action": {
        "ready": "Aktualizuj aplikację",
        "pending": "Odświeżanie..."
      },
      "bannerTitle": "Tryb offline wymaga uwagi",
      "error": {
        "registration": "Nie udało się przygotować trybu offline.",
        "activation": "Nie udało się włączyć najnowszej wersji aplikacji. Zamknij ją i otwórz ponownie."
      }
    },
    "shellState": {
      "retry": "Spróbuj ponownie",
      "checking": {
        "eyebrow": "Uruchamianie",
        "title": "Przygotowuję lokalny zeszyt",
        "body": "Przygotowuję Twoje dane, żeby zeszyt mógł otworzyć się bezpiecznie i działać offline."
      },
      "setupChecking": {
        "eyebrow": "Konfiguracja startowa",
        "title": "Sprawdzam dane startowe",
        "body": "Sprawdzam, czy ten zeszyt ma już przypisany klub i trenera."
      },
      "blocked": {
        "eyebrow": "Stan aplikacji",
        "title": "Nie udało się uruchomić Zeszytu Trenera",
        "database": "Nie udało się otworzyć zeszytu na tym urządzeniu.",
        "unknown": "Aplikacja nie może się teraz uruchomić. Spróbuj ponownie."
      }
    }
  },
  "en": {
    "app": {
      "name": "Coach Notebook"
    },
    "common": {
      "cancel": "Cancel",
      "hide": "Hide",
      "understand": "Understood"
    },
    "network": {
      "offline": "Offline"
    },
    "menu": {
      "debugIndexedDb": "Debug IndexedDB",
      "languageLabel": "Language",
      "exportBackup": {
        "action": "Export backup",
        "pending": "Exporting backup...",
        "error": "Backup export failed. Try again.",
        "errorDetails": "Technical details: {details}"
      },
      "importBackup": {
        "action": "Restore from backup",
        "pending": "Restoring backup...",
        "error": "Backup restore failed. Check the file and try again."
      },
      "resetData": {
        "action": "Reset app data",
        "confirm": "Delete everything",
        "copy": "This removes all members, trainings, payments, club/trainer setup, and app-owned local state stored on this device.",
        "error": "Data reset failed. Try again.",
        "inputLabel": "Type the confirmation phrase",
        "pending": "Deleting...",
        "phraseLabel": "To delete all data, type: {phrase}",
        "title": "Delete all app data"
      }
    },
    "demo": {
      "eyebrow": "Demo mode",
      "title": "Check out the app",
      "copy": "Check out Coach Notebook on sample data :)",
      "error": "Demo mode could not be cleared. Try again.",
      "actions": {
        "open": "Leave demo",
        "confirm": "I've tested it :)",
        "pending": "Opening setup...",
        "stay": "Checking it out!"
      }
    },
    "routes": {
      "membersList": "Members",
      "membershipPayments": "Payments",
      "addMember": "Add member",
      "attendanceHistory": "Training history",
      "attendanceRecord": "New training",
      "attendanceEdit": "Edit training",
      "setupClub": "Club setup",
      "setupTrainer": "Trainer setup",
      "debugIndexedDb": "IndexedDB Inspector"
    },
    "bottomNav": {
      "members": "Members",
      "payments": "Payments",
      "attendance": "Attendance"
    },
    "install": {
      "entry": {
        "manual": "How to install",
        "native": "Install app"
      },
      "coach": {
        "eyebrow": "Later",
        "manual": "Return here when you need the short guide for adding the app to the home screen.",
        "native": "Return here when you want to install the app later."
      }
    },
    "update": {
      "action": {
        "ready": "Update app",
        "pending": "Refreshing..."
      },
      "bannerTitle": "Offline mode needs attention",
      "error": {
        "registration": "Offline mode could not be prepared.",
        "activation": "The latest app version could not be applied. Close and reopen the app."
      }
    },
    "shellState": {
      "retry": "Try again",
      "checking": {
        "eyebrow": "Starting",
        "title": "Preparing the local notebook",
        "body": "Preparing your data so the notebook can open safely and stay available offline."
      },
      "setupChecking": {
        "eyebrow": "Startup setup",
        "title": "Checking required setup data",
        "body": "Checking whether this notebook already has a club and trainer assigned."
      },
      "blocked": {
        "eyebrow": "App state",
        "title": "Coach Notebook could not start",
        "database": "The notebook could not be opened on this device.",
        "unknown": "The app cannot start right now. Try again."
      }
    }
  }
}
</i18n>
