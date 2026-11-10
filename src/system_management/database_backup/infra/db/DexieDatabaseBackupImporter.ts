import { importInto, peakImportFile } from 'dexie-export-import'

import type { DatabaseBackupImportPort } from '@/system_management/database_backup/application/ports/DatabaseBackupImportPort'
import type { TrainerNotebookDb } from '@/db'

export class BackupDatabaseNameMismatchError extends Error {
  public constructor(
    expectedDatabaseName: string,
    importedDatabaseName: string
  ) {
    super(
      `Backup belongs to "${importedDatabaseName}" but this app uses "${expectedDatabaseName}".`
    )
  }
}

export class DexieDatabaseBackupImporter implements DatabaseBackupImportPort {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public async importBackupFile(file: File): Promise<void> {
    const backupMeta = await peakImportFile(file)

    if (backupMeta.data.databaseName !== this.database.name) {
      // Why: rejecting mismatched database names prevents silent restores into a different IndexedDB database key than the shell actually reads.
      throw new BackupDatabaseNameMismatchError(
        this.database.name,
        backupMeta.data.databaseName
      )
    }

    // Let the importer manage chunk reads and their transaction without nesting its waitFor calls.
    await importInto(this.database, file, {
      clearTablesBeforeImport: true,
      acceptVersionDiff: backupMeta.data.databaseVersion < this.database.verno,
      skipTables: ['events']
    })
  }
}
