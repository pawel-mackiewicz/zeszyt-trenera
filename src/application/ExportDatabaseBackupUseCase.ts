import type { UseCase } from '@/application/UseCase'
import type { BackupFileDeliveryPort } from '@/application/ports/BackupFileDeliveryPort'
import type { ClockPort } from '@/application/ports/ClockPort'
import type { DatabaseBackupExportPort } from '@/application/ports/DatabaseBackupExportPort'
import type { ExportDatabaseBackupCommand } from '@/application/requests/ExportDatabaseBackupCommand'

const BACKUP_FILE_NAME_PREFIX = 'zeszyt-trenera'
const BACKUP_FILE_EXTENSION = '.json'
const BACKUP_FILE_MIME_TYPE = 'application/json'

function formatDatePart(value: number): string {
  return String(value).padStart(2, '0')
}

function backupDateToken(now: Date): string {
  const year = now.getFullYear()
  const month = formatDatePart(now.getMonth() + 1)
  const day = formatDatePart(now.getDate())

  return `${year}-${month}-${day}`
}

function buildBackupFileName(now: Date): string {
  return `${BACKUP_FILE_NAME_PREFIX}-backup-${backupDateToken(now)}${BACKUP_FILE_EXTENSION}`
}

export class ExportDatabaseBackupUseCase implements UseCase<ExportDatabaseBackupCommand> {
  public constructor(
    private readonly backupExport: DatabaseBackupExportPort,
    private readonly backupDelivery: BackupFileDeliveryPort,
    private readonly clock: ClockPort
  ) {}

  public async handle(_: ExportDatabaseBackupCommand): Promise<void> {
    const backupBlob = await this.backupExport.exportBackupBlob()
    const backupFile = new File(
      [backupBlob],
      buildBackupFileName(this.clock.now()),
      {
        // Why: a stable JSON media type keeps native share sheets and download targets from guessing the payload format.
        type: BACKUP_FILE_MIME_TYPE
      }
    )

    // Why: dispatching through a delivery port keeps browser API quirks (share support and download fallback) outside application orchestration.
    await this.backupDelivery.deliver(backupFile)
  }
}
