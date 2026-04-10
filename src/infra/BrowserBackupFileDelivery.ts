import type { BackupFileDeliveryPort } from '@/application/ports/BackupFileDeliveryPort'

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

export class BrowserBackupFileDelivery implements BackupFileDeliveryPort {
  public constructor(
    private readonly environment: BackupDeliveryEnvironment = {
      browserDocument: document,
      browserNavigator: navigator,
      browserUrl: URL
    }
  ) {}

  public async deliver(file: File): Promise<void> {
    const shareData: ShareData = {
      files: [file]
    }
    const canShareFile =
      typeof this.environment.browserNavigator.canShare === 'function' &&
      this.environment.browserNavigator.canShare(shareData)

    if (
      canShareFile &&
      typeof this.environment.browserNavigator.share === 'function'
    ) {
      try {
        await this.environment.browserNavigator.share(shareData)
        return
      } catch (error) {
        // Why: closing a native share sheet is a user cancellation path, not a backup failure that should surface in the UI.
        if (isAbortError(error)) {
          return
        }

        throw error
      }
    }

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
