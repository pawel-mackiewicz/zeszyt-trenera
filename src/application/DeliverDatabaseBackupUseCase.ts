import type { UseCase } from '@/application/UseCase'
import type {
  BackupFileDeliveryPort,
  BackupFileDeliveryResult
} from '@/application/ports/BackupFileDeliveryPort'
import type { DeliverDatabaseBackupCommand } from '@/application/requests/DeliverDatabaseBackupCommand'

export class DeliverDatabaseBackupUseCase implements UseCase<
  DeliverDatabaseBackupCommand,
  BackupFileDeliveryResult
> {
  public constructor(private readonly backupDelivery: BackupFileDeliveryPort) {}

  public async handle(
    command: DeliverDatabaseBackupCommand
  ): Promise<BackupFileDeliveryResult> {
    // Why: separating delivery from backup generation lets the UI trigger `navigator.share` from a fresh tap after async export work completes.
    return await this.backupDelivery.deliver(command.backupFile)
  }
}
