import type { BackupFileDeliveryPort } from '@/system_management/database_backup/application/ports/BackupFileDeliveryPort'

type BackupShareNavigator = {
  canShare?: Navigator['canShare']
  share?: Navigator['share']
}

type BackupDeliveryEnvironment = {
  browserDocument: Document
  browserNavigator: BackupShareNavigator
  browserUrl: Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'>
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === 'AbortError'
  }

  if (typeof error === 'object' && error !== null && 'name' in error) {
    return (error as { name?: unknown }).name === 'AbortError'
  }

  return false
}

function readErrorName(error: unknown): string | null {
  if (error instanceof Error && error.name) {
    return error.name
  }

  if (typeof error === 'object' && error !== null && 'name' in error) {
    const name = (error as { name?: unknown }).name

    if (typeof name === 'string' && name.length > 0) {
      return name
    }
  }

  return null
}

function isShareCapabilityError(error: unknown): boolean {
  const errorName = readErrorName(error)

  return (
    errorName === 'TypeError' ||
    errorName === 'NotAllowedError' ||
    errorName === 'InvalidStateError' ||
    errorName === 'DataError'
  )
}

export class BrowserBackupFileDelivery implements BackupFileDeliveryPort {
  public constructor(
    private readonly environment: BackupDeliveryEnvironment = {
      browserDocument: document,
      browserNavigator: navigator,
      browserUrl: URL
    }
  ) {}

  public async deliver(file: File): Promise<void> {
    if (await this.tryNativeShare(file)) {
      return
    }

    this.downloadWithObjectUrl(file)
  }

  private async tryNativeShare(file: File): Promise<boolean> {
    const shareData: ShareData = {
      files: [file]
    }
    const canShareFile = this.safeCanShare(shareData)
    const canShareFn = this.environment.browserNavigator.canShare

    if (typeof this.environment.browserNavigator.share === 'function') {
      if (typeof canShareFn === 'function' && !canShareFile) {
        return false
      }

      try {
        await this.environment.browserNavigator.share(shareData)
        return true
      } catch (error) {
        // Why: closing a native share sheet is a user cancellation path, not a backup failure that should surface in the UI.
        if (isAbortError(error)) {
          return true
        }

        // Why: Android browsers can reject file-share calls after async export work drops transient user activation; falling back to object-url download keeps export usable.
        if (isShareCapabilityError(error)) {
          return false
        }

        throw error
      }
    }

    return false
  }

  private safeCanShare(shareData: ShareData): boolean {
    if (typeof this.environment.browserNavigator.canShare !== 'function') {
      return false
    }

    try {
      return this.environment.browserNavigator.canShare(shareData)
    } catch {
      // Why: some browser builds throw for the `files` payload even though the download fallback still works; this should not crash export.
      return false
    }
  }

  private downloadWithObjectUrl(file: File): void {
    const backupFileUrl = this.environment.browserUrl.createObjectURL(file)

    try {
      const link = this.environment.browserDocument.createElement('a')
      link.href = backupFileUrl
      link.download = file.name
      link.style.display = 'none'
      this.environment.browserDocument.body.append(link)
      link.click()
      link.remove()
    } finally {
      this.environment.browserUrl.revokeObjectURL(backupFileUrl)
    }
  }
}
