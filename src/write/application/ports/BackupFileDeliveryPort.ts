export interface BackupFileDeliveryPort {
  deliver(file: File): Promise<void>
}
