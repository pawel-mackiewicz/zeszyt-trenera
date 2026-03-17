import { RegisterClubUseCase } from '@/application/RegisterClubUseCase'
import { db, type TrainerNotebookDb } from '@/infra/db'
import { DexieClubRepo } from '@/infra/db/DexieClubRepo'
import { DexieEventRepo } from '@/infra/db/DexieEventRepo'
import { DexieUnitOfWork } from '@/infra/db/DexieUnitOfWork'

export function createRegisterClubUseCase(
  database: TrainerNotebookDb = db
) {
  return new RegisterClubUseCase(
    new DexieUnitOfWork(database),
    new DexieClubRepo(database),
    new DexieEventRepo(database)
  )
}
//TODO switch to DI container