import type { AppResetRepoPort } from '@/write/application/ports/AppResetRepoPort'
import type { TrainerNotebookDb } from '@/db'

export class DexieAppResetRepo implements AppResetRepoPort {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public async clearAllData(): Promise<void> {
    // Reset must wipe each persisted table so the next launch starts from setup without stale local-first records.
    await Promise.all(
      this.database.tables.map(async (table) => await table.clear())
    )
  }
}
