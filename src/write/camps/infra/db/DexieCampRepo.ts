import type { TrainerNotebookDb } from '@/db'
import type { CampRepoPort } from '@/write/camps/application/ports/CampRepoPort'
import { Camp } from '@/write/camps/domain/Camp'
import type { PersistedCamp } from '@/write/shared/infra'

export class DexieCampRepo implements CampRepoPort {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public async save(camp: Camp): Promise<void> {
    await this.database.camps.add(this.toPersistedCamp(camp))
  }

  public async existsById(campId: string): Promise<boolean> {
    const persistedCamp = await this.database.camps.get(campId)

    return persistedCamp != null
  }

  private toPersistedCamp(camp: Camp): PersistedCamp {
    return camp.toSnapshot()
  }
}
