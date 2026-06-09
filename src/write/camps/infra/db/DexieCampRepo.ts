import type { TrainerNotebookDb } from '@/db'
import type { CampRepoPort } from '@/write/camps/application/CampRepoPort'
import { Camp } from '@/write/camps/domain/Camp'
import type { PersistedCamp } from '@/write/shared/infra'

export class DexieCampRepo implements CampRepoPort {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public async save(camp: Camp): Promise<void> {
    await this.database.camps.add(this.toPersistedCamp(camp))
  }

  private toPersistedCamp(camp: Camp): PersistedCamp {
    return camp.toSnapshot()
  }
}
