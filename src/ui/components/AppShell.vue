<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useAppServices } from '@/ui/appServices'
import AppButton from '@/ui/components/AppButton.vue'
import {
  resolveShellRouteTitle,
  SHELL_LOCALE_OPTIONS,
  SHELL_NAVIGATION_LABEL_KEYS,
  SHELL_ROUTE_TITLE_KEYS
} from '@/ui/components/app-shell/AppShell.config'
import BottomNavigation from '@/ui/components/app-shell/BottomNavigation.vue'
import Header from '@/ui/components/app-shell/Header.vue'
import { APP_SHELL_MESSAGES } from '@/ui/components/app-shell/AppShell.messages'
import ResetDataModal from '@/ui/features/app_reset/ResetDataModal.vue'
import FloatingErrorAlert from '@/ui/components/FloatingErrorAlert.vue'
import InstallModal from '@/ui/features/app_install/InstallModal.vue'
import { useNetworkStatus } from '@/ui/composables/useNetworkStatus'
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
import DemoIntroModal from '@/ui/features/demo/DemoIntroModal.vue'
import { useAppStore } from '@/ui/stores/app'
import { useAppInstallStore } from '@/ui/features/app_install/app-install.store'
import { useAppResetStore } from '@/ui/features/app_reset/app-reset.store'
import { useAppUpdateStore } from '@/ui/stores/app-update.store'
import { useShellStore } from '@/ui/stores/shell.store'

type ObservableSubscription = {
  unsubscribe(): void
}

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const appInstallStore = useAppInstallStore()
const appResetStore = useAppResetStore()
const appUpdateStore = useAppUpdateStore()
const shellStore = useShellStore()
const { queries, useCases } = useAppServices()
const { t } = useI18n({
  useScope: 'local',
  messages: APP_SHELL_MESSAGES
})
const { locale } = useI18n({ useScope: 'global' })

useNetworkStatus()
// What: start PWA checks from the shell lifecycle. Why: the update store lets menu actions and banners share one registration without prop drilling or duplicate service-worker setup.
appUpdateStore.registerUpdateChecks()

const { appReadiness, blockingIssue, setupStatus } = storeToRefs(appStore)
const { installCoachVisible, installed, installSurface, showInstallEntry } =
  storeToRefs(appInstallStore)
const { updateAvailable, updateError, updatePending } =
  storeToRefs(appUpdateStore)
const { drawerOpen } = storeToRefs(shellStore)

const appVersion = __APP_VERSION__
const localeOptions = SHELL_LOCALE_OPTIONS
// Keeping menu entries derived from the router avoids shipping dead links in production builds.
const navigationItems = createNavigationItems()
const backupImportInput = ref<HTMLInputElement | null>(null)
const backupImportInProgress = ref(false)
const backupImportErrorVisible = ref(false)
const backupExportInProgress = ref(false)
const backupExportErrorVisible = ref(false)
const backupExportErrorMessage = ref<string | null>(null)
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
// What: resolve the browser title with the shared shell title helper. Why: AppShell owns document metadata, while the header composable should stay scoped to visible chrome only.
const title = computed(() =>
  resolveShellRouteTitle({
    routeName: currentRouteName.value,
    fallbackTitle: appName.value,
    translate: t
  })
)
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
    },
    error(error) {
      appStore.blockApplication('bootstrap')
      console.error('Failed to observe application setup status.', error)
    }
  })
}

watch(installed, (value) => {
  if (value) {
    closeDrawer()
  }
})

watch(drawerOpen, (value) => {
  if (!value) {
    // What: collapse drawer-only helper copy whenever the shared drawer store closes. Why: Header can now close the drawer through its composable, so AppShell still owns cleaning up install-coach UI that lives inside the drawer.
    appInstallStore.hideInstallCoach()
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
    closeDrawer()
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

function closeDrawer() {
  // What: route every drawer dismissal through one shell helper. Why: Header now toggles Pinia state directly, so the shell needs one place to pair drawer closing with its related coach cleanup.
  shellStore.closeDrawer()
  appInstallStore.hideInstallCoach()
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

  closeDrawer()
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

  closeDrawer()
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

function openResetModalFromMenu() {
  closeDrawer()
  appResetStore.openResetModal()
}

function openInstallEntry() {
  closeDrawer()
  appInstallStore.openInstallModal()
}

async function handleUpdateAction() {
  closeDrawer()
  await appUpdateStore.activateWaitingUpdate()
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
    SHELL_NAVIGATION_LABEL_KEYS[item.name] ?? SHELL_ROUTE_TITLE_KEYS[item.name]

  return t(translationKey)
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

      <!-- What: mount the merged shell header above the drawer. Why: the shell keeps layout ownership while Header owns the visible route chrome and its composable-owned controls. -->
      <Header />

      <div v-if="drawerOpen" class="fixed inset-0 z-50 flex">
        <div
          class="absolute inset-0 bg-black/25 backdrop-blur-sm"
          @click="closeDrawer"
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
              @click="closeDrawer"
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
                  @click="appInstallStore.hideInstallCoach()"
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
              v-if="updateAvailable"
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
              @click="openResetModalFromMenu"
            >
              {{ t('menu.resetData.action') }}
            </AppButton>
          </div>
        </div>
      </div>

      <!-- What: mount the smart demo overlay from the feature folder. Why: AppShell should provide shell placement while demo exit state and application workflow wiring stay inside the demo feature. -->
      <DemoIntroModal />

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

      <!-- What: mount the smart reset overlay from the feature folder. Why: AppShell should own menu placement while reset confirmation, errors, and application-layer workflow stay behind the reset feature boundary. -->
      <ResetDataModal />

      <main class="pt-24 px-6 max-w-5xl mx-auto pb-32">
        <FloatingErrorAlert
          v-if="updateErrorMessage"
          :message="updateErrorMessage"
          :title="t('update.bannerTitle')"
          top-offset="shell"
          @dismiss="appUpdateStore.clearUpdateError()"
        />

        <RouterView v-slot="{ Component }">
          <Transition name="fade" mode="out-in">
            <component :is="Component" :key="route.fullPath" />
          </Transition>
        </RouterView>
      </main>

      <!-- What: mount the smart bottom navigation as shell chrome. Why: AppShell should place persistent navigation without owning route-specific tab state. -->
      <BottomNavigation />
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

    <!-- What: mount the smart install overlay from the feature folder. Why: PWA prompt state, demo-mode suppression, and one-time install nudging now belong to the app-install feature boundary. -->
    <InstallModal />
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
</style>
