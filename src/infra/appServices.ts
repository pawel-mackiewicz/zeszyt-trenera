import { RegisterClubUseCase } from '@/application/RegisterClubUseCase'
import { RegisterTrainerUseCase } from '@/application/RegisterTrainerUseCase'
import type { UseCase } from '@/application/UseCase'
import type { RegisterClubCommand } from '@/application/requests/RegisterClubCommand'
import type { RegisterTrainerCommand } from '@/application/requests/RegisterTrainerCommand'
import { db, type TrainerNotebookDb } from '@/infra/db'
import { DexieClubRepo } from '@/infra/db/DexieClubRepo'
import { DexieEventRepo } from '@/infra/db/DexieEventRepo'
import { DexieTrainerRepo } from '@/infra/db/DexieTrainerRepo'
import { DexieUnitOfWork } from '@/infra/db/DexieUnitOfWork'
import { IdGenerator } from '@/infra/IdGenerator'

export type AppUseCases = {
  readonly registerClub: UseCase<RegisterClubCommand>
  readonly registerTrainer: UseCase<RegisterTrainerCommand>
}

export type AppServices = {
  readonly database: TrainerNotebookDb
  readonly useCases: AppUseCases
}

// One lazy helper keeps the composition root readable as more workflows are added without splitting the graph across several files.
function lazy<T>(factory: () => T): () => T {
  let value: T | undefined

  return () => (value ??= factory())
}

export function createAppServices(
  database: TrainerNotebookDb = db
): AppServices {
  const resolveUnitOfWork = lazy(() => new DexieUnitOfWork(database))
  const resolveClubRepo = lazy(() => new DexieClubRepo(database))
  const resolveTrainerRepo = lazy(() => new DexieTrainerRepo(database))
  const resolveEventRepo = lazy(() => new DexieEventRepo(database))
  // The composition root owns the concrete ID adapter so application and domain code depend only on the port.
  const resolveIdGenerator = lazy(() => new IdGenerator())
  const resolveRegisterClub = lazy(
    () =>
      new RegisterClubUseCase(
        resolveUnitOfWork(),
        resolveClubRepo(),
        resolveEventRepo(),
        resolveIdGenerator()
      )
  )
  const resolveRegisterTrainer = lazy(
    () =>
      new RegisterTrainerUseCase(
        resolveUnitOfWork(),
        resolveTrainerRepo(),
        resolveEventRepo(),
        resolveIdGenerator()
      )
  )

  const useCases: AppUseCases = {
    // Keeping workflows behind one service bag makes adding use cases a local change instead of growing a resolver API throughout the app.
    get registerClub() {
      return resolveRegisterClub()
    },
    get registerTrainer() {
      return resolveRegisterTrainer()
    }
  }

  return {
    database,
    useCases
  }
}

export const appServices = createAppServices()
