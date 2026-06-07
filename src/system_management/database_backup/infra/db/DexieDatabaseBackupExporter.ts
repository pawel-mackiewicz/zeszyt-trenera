import { exportDB } from 'dexie-export-import'

import type { DatabaseBackupExportPort } from '@/system_management/database_backup/application/ports/DatabaseBackupExportPort'
import type { TrainerNotebookDb } from '@/db'

const BACKUP_EXPORT_ROWS_PER_CHUNK = 2000

export class DexieDatabaseBackupExporter implements DatabaseBackupExportPort {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public async exportBackupBlob(): Promise<Blob> {
    if (!this.database.isOpen()) {
      await this.database.open()
    }

    // Why: explicit chunked export keeps large local-first backups from loading all rows into memory at once on mobile devices.
    return await exportDB(this.database, {
      numRowsPerChunk: BACKUP_EXPORT_ROWS_PER_CHUNK
    })
  }
}
