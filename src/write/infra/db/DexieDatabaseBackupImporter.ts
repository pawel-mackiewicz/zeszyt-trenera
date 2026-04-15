import {
  importDB,
  peakImportFile,
  type ImportOptions
} from 'dexie-export-import'

import type { DatabaseBackupImportPort } from '@/write/application/ports/DatabaseBackupImportPort'
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

    const importOptions: ImportOptions = {
      // Why: restore must fully replace stale local-first rows so the reopened shell always reflects one coherent backup snapshot.
      clearTablesBeforeImport: true
    }
    const importedDatabase = await importDB(file, importOptions)

    // Why: importDB creates a temporary Dexie instance for restore, so close it once the transaction is done to avoid duplicate open handles.
    importedDatabase.close()
  }
}
