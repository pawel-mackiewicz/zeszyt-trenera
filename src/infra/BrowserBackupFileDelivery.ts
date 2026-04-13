import type {
  BackupFileDeliveryPort,
  BackupFileDeliveryResult,
  BackupFileDownloadReasonCode
} from '@/application/ports/BackupFileDeliveryPort'

type BackupShareNavigator = {
  canShare?: Navigator['canShare']
  share?: Navigator['share']
}

type BackupDeliveryEnvironment = {
  browserDocument: Document
  browserNavigator: BackupShareNavigator
  browserUrl: Pick<typeof URL, 'createObjectURL' | 'revokeObjectURL'>
}

type ShareAttemptResult =
  | {
      type: 'handled-share'
    }
  | {
      type: 'download-fallback'
      reasonCode: BackupFileDownloadReasonCode
      reasonDetails: string | null
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

  public async deliver(file: File): Promise<BackupFileDeliveryResult> {
    const shareAttempt = await this.tryNativeShare(file)

    if (shareAttempt.type === 'handled-share') {
      return {
        method: 'share'
      }
    }

    this.downloadWithObjectUrl(file)

    return {
      method: 'download',
      reasonCode: shareAttempt.reasonCode,
      reasonDetails: shareAttempt.reasonDetails
    }
  }

  private async tryNativeShare(file: File): Promise<ShareAttemptResult> {
    const shareData: ShareData = {
      files: [file]
    }
    const canShareState = this.safeCanShare(shareData)
    const share = this.environment.browserNavigator.share

    if (typeof share !== 'function') {
      return {
        type: 'download-fallback',
        reasonCode: 'share-api-unavailable',
        reasonDetails: 'navigator.share is unavailable'
      }
    }

    if (!canShareState.supported) {
      return {
        type: 'download-fallback',
        reasonCode: canShareState.reasonCode,
        reasonDetails: canShareState.reasonDetails
      }
    }

    if (canShareState.canShareFile === false) {
      return {
        type: 'download-fallback',
        reasonCode: 'share-capability-returned-false',
        reasonDetails: 'navigator.canShare({ files }) returned false'
      }
    }

    try {
      await share(shareData)
      return {
        type: 'handled-share'
      }
    } catch (error) {
      // Why: closing a native share sheet is a user cancellation path, not a backup failure that should surface in the UI.
      if (isAbortError(error)) {
        return {
          type: 'handled-share'
        }
      }

      // Why: Android browsers can reject file-share calls after async export work drops transient user activation; falling back to object-url download keeps export usable.
      if (isShareCapabilityError(error)) {
        return {
          type: 'download-fallback',
          reasonCode: 'share-rejected-capability-error',
          reasonDetails: formatErrorDetails(error)
        }
      }

      throw error
    }
  }

  private safeCanShare(shareData: ShareData):
    | {
        supported: true
        canShareFile: boolean
      }
    | {
        supported: false
        reasonCode: BackupFileDownloadReasonCode
        reasonDetails: string | null
      } {
    if (typeof this.environment.browserNavigator.canShare !== 'function') {
      return {
        supported: true,
        // What: treat missing `canShare` as unknown support and still try `share`. Why: some browsers omit the probe but can still open a share sheet.
        canShareFile: true
      }
    }

    try {
      return {
        supported: true,
        canShareFile: this.environment.browserNavigator.canShare(shareData)
      }
    } catch (error) {
      // Why: some browser builds throw for the `files` payload even though the download fallback still works; this should not crash export.
      return {
        supported: false,
        reasonCode: 'share-capability-check-failed',
        reasonDetails: formatErrorDetails(error)
      }
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
