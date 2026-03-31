import type { UnitOfWork } from '@/application/ports/UnitOfWork'
import type { TrainerNotebookDb } from '@/db'

export class DexieUnitOfWork implements UnitOfWork {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public async execute<T>(action: () => Promise<T>): Promise<T> {
    return await this.database.transaction('rw', this.database.tables, action)
  }
}
