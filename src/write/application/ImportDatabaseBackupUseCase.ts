import type { UseCase } from '@/write/application/UseCase'
import type { DatabaseBackupImportPort } from '@/write/application/ports/DatabaseBackupImportPort'
import type { ImportDatabaseBackupCommand } from '@/write/application/requests/ImportDatabaseBackupCommand'

export class ImportDatabaseBackupUseCase implements UseCase<ImportDatabaseBackupCommand> {
  public constructor(private readonly backupImport: DatabaseBackupImportPort) {}

  public async handle(command: ImportDatabaseBackupCommand): Promise<void> {
    // Why: backup restore remains one application-layer workflow so shell views do not mutate Dexie directly.
    await this.backupImport.importBackupFile(command.backupFile)
  }
}
