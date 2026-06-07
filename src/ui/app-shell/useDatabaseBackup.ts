import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useAppServices } from '@/ui/appServices'
import { APP_SHELL_MESSAGES } from '@/ui/app-shell/AppShell.messages'
import { useShellStore } from '@/ui/stores/shell.store'

export function useDatabaseBackup() {
  const shellStore = useShellStore()
  const { system } = useAppServices()
  const { t } = useI18n({
    useScope: 'local',
    messages: APP_SHELL_MESSAGES
  })

  const backupImportInput = ref<HTMLInputElement | null>(null)
  const backupImportInProgress = ref(false)
  const backupImportErrorVisible = ref(false)
  const backupExportInProgress = ref(false)
  const backupExportErrorVisible = ref(false)
  const backupExportErrorMessage = ref<string | null>(null)

  // What: expose alert-ready export copy from the shell backup workflow. Why: SidebarMenu should render feedback without knowing how browser backup errors are normalized.
  const backupExportAlertMessage = computed(
    () => backupExportErrorMessage.value ?? t('menu.exportBackup.error')
  )

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

    shellStore.closeSidebar()
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
      await system.backup.import.handle({
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

    shellStore.closeSidebar()
    backupExportErrorVisible.value = false
    backupExportErrorMessage.value = null
    backupExportInProgress.value = true

    try {
      // What: route backup export through one dedicated application workflow. Why: database snapshot policy and delivery fallbacks should stay behind the same application boundary as other data workflows.
      await system.backup.export.handle({})
    } catch (error) {
      // What: attach technical browser error details to the shared export alert. Why: Android share/download failures are often browser-specific and impossible to diagnose from generic copy.
      backupExportErrorMessage.value = buildBackupExportErrorMessage(t, error)
      backupExportErrorVisible.value = true
      console.error('Failed to export local database backup.', error)
    } finally {
      backupExportInProgress.value = false
    }
  }

  return {
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

function reloadApplication() {
  // What: restart the whole shell after a successful full restore. Why: the current session still holds Pinia and i18n state in memory, so a cold boot is the safe way to reflect overwritten local-first data immediately.
  window.location.reload()
}
