<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import AppButton from '@/ui/components/AppButton.vue'
import {
  SHELL_LOCALE_OPTIONS,
  SHELL_NAVIGATION_LABEL_KEYS,
  SHELL_ROUTE_TITLE_KEYS
} from '@/ui/app-shell/AppShell.config'
import { APP_SHELL_MESSAGES } from '@/ui/app-shell/AppShell.messages'
import { useDatabaseBackup } from '@/ui/app-shell/useDatabaseBackup'
import FloatingErrorAlert from '@/ui/components/FloatingErrorAlert.vue'
import { useAppInstallStore } from '@/ui/features/app_install/app-install.store'
import { useAppResetStore } from '@/ui/features/app_reset/app-reset.store'
import { persistLocale, type AppLocale } from '@/ui/i18n'
import { createNavigationItems, type NavigationItem } from '@/ui/router'
import { RouterLink } from '@/ui/router/runtime'
import { useAppUpdateStore } from '@/ui/stores/app-update.store'
import { useShellStore } from '@/ui/stores/shell.store'

const appInstallStore = useAppInstallStore()
const appResetStore = useAppResetStore()
const appUpdateStore = useAppUpdateStore()
const shellStore = useShellStore()
const { t } = useI18n({
  useScope: 'local',
  messages: APP_SHELL_MESSAGES
})
const { locale } = useI18n({ useScope: 'global' })
const {
  backupExportAlertMessage,
  backupExportErrorVisible,
  backupExportInProgress,
  backupImportErrorVisible,
  backupImportInProgress,
  backupImportInput,
  dismissBackupExportError,
  dismissBackupImportError,
  exportDatabaseBackup,
  handleBackupImportSelection,
  openBackupImportPicker
} = useDatabaseBackup()

const { installed, installSurface, showInstallEntry } =
  storeToRefs(appInstallStore)
const { updateAvailable, updatePending } = storeToRefs(appUpdateStore)
const { sidebarOpen } = storeToRefs(shellStore)

const appVersion = __APP_VERSION__
const localeOptions = SHELL_LOCALE_OPTIONS
// Keeping menu entries derived from the router avoids shipping dead links in production builds.
const navigationItems = createNavigationItems()

const appName = computed(() => t('app.name'))
const installEntryLabel = computed(() =>
  installSurface.value === 'manual'
    ? t('install.entry.manual')
    : t('install.entry.native')
)
const updateActionLabel = computed(() =>
  updatePending.value ? t('update.action.pending') : t('update.action.ready')
)

watch(installed, (value) => {
  if (value) {
    closeSidebar()
  }
})

function closeSidebar() {
  // What: route every sidebar dismissal through one shell helper. Why: menu actions and install completion should share the same transient sidebar state transition.
  shellStore.closeSidebar()
}

function openResetModalFromMenu() {
  closeSidebar()
  appResetStore.openResetModal()
}

function openInstallEntry() {
  closeSidebar()
  appInstallStore.openInstallModal()
}

async function handleUpdateAction() {
  closeSidebar()
  await appUpdateStore.activateWaitingUpdate()
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
  <!-- What: keep the restore control as a hidden native file input. Why: browser file pickers are the most reliable cross-platform path for local JSON backup selection in a PWA shell. -->
  <input
    ref="backupImportInput"
    class="sr-only"
    type="file"
    accept=".json,application/json"
    data-testid="import-backup-input"
    @change="handleBackupImportSelection"
  />

  <!-- What: render the hamburger sidebar as dedicated shell chrome. Why: AppShell should keep lifecycle and layout ownership while this component owns menu state, copy, and actions. -->
  <div
    v-if="sidebarOpen"
    class="fixed inset-0 z-50 flex"
    data-testid="shell-sidebar"
  >
    <div
      class="absolute inset-0 bg-black/25 backdrop-blur-sm"
      data-testid="shell-sidebar-backdrop"
      @click="closeSidebar"
    ></div>
    <div
      class="relative w-72 max-w-[85vw] h-full bg-surface border-r border-on-surface/10 shadow-[0_24px_60px_rgba(17,41,39,0.2)] flex flex-col pt-16"
    >
      <div class="p-6 border-b border-on-surface/10 bg-surface-container-low">
        <h2 class="font-headline uppercase font-bold text-lg">
          {{ appName }}
        </h2>
        <p class="font-mono text-xs text-secondary mt-1">v{{ appVersion }}</p>
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
          @click="closeSidebar"
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
        <!-- What: keep menu-level install and update actions on the shared button primitive. Why: the sidebar should preserve its own stacking and width rules while inheriting the same CTA states as the rest of the app. -->
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
        <!-- What: expose local backup export from the sidebar menu. Why: coaches need a manual recovery path for their offline notebook data without opening developer-only screens. -->
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
        <!-- What: expose local backup restore from the sidebar menu. Why: coaches need a direct recovery path that can overwrite stale on-device rows with a trusted backup. -->
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
        <!-- What: keep the hard reset action available in the sidebar menu even during demo mode. Why: a coach who is only testing the seeded notebook still needs the same one-tap recovery path back to clean setup without leaving demo first. -->
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
</style>
