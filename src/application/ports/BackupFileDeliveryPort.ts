export type BackupFileDownloadReasonCode =
  | 'share-api-unavailable'
  | 'share-capability-returned-false'
  | 'share-capability-check-failed'
  | 'share-rejected-capability-error'

export type BackupFileDeliveryResult =
  | {
      method: 'share'
    }
  | {
      method: 'download'
      reasonCode: BackupFileDownloadReasonCode
      reasonDetails: string | null
    }

export interface BackupFileDeliveryPort {
  deliver(file: File): Promise<BackupFileDeliveryResult>
}
