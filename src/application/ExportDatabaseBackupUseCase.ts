import type { UseCase } from '@/application/UseCase'
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

export class ExportDatabaseBackupUseCase implements UseCase<
  ExportDatabaseBackupCommand,
  File
> {
  public constructor(
    private readonly backupExport: DatabaseBackupExportPort,
    private readonly clock: ClockPort
  ) {}

  public async handle(_: ExportDatabaseBackupCommand): Promise<File> {
    const backupBlob = await this.backupExport.exportBackupBlob()
    // Why: this workflow now only prepares the file so the UI can trigger delivery from a second, fresh user gesture that mobile share APIs accept.
    return new File([backupBlob], buildBackupFileName(this.clock.now()), {
      // Why: a stable JSON media type keeps native share sheets and download targets from guessing the payload format.
      type: BACKUP_FILE_MIME_TYPE
    })
  }
}
