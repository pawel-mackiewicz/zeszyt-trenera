import type { UseCase } from '@/application/UseCase'
import type { DatabaseBackupImportPort } from '@/application/ports/DatabaseBackupImportPort'
import type { ImportDatabaseBackupCommand } from '@/application/requests/ImportDatabaseBackupCommand'

export class ImportDatabaseBackupUseCase implements UseCase<ImportDatabaseBackupCommand> {
  public constructor(private readonly backupImport: DatabaseBackupImportPort) {}

  public async handle(command: ImportDatabaseBackupCommand): Promise<void> {
    // Why: backup restore remains one application-layer workflow so shell views do not mutate Dexie directly.
    await this.backupImport.importBackupFile(command.backupFile)
  }
}
