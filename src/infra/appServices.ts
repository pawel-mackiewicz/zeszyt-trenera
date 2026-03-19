import { RegisterClubUseCase } from '@/application/RegisterClubUseCase'
import type { UseCase } from '@/application/UseCase'
import type { RegisterClubCommand } from '@/application/requests/RegisterClubCommand'
import { db, type TrainerNotebookDb } from '@/infra/db'
import { DexieClubRepo } from '@/infra/db/DexieClubRepo'
import { DexieEventRepo } from '@/infra/db/DexieEventRepo'
import { DexieUnitOfWork } from '@/infra/db/DexieUnitOfWork'
import { IdGenerator } from '@/infra/IdGenerator'

export type AppUseCases = {
  readonly registerClub: UseCase<RegisterClubCommand>
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

  const useCases: AppUseCases = {
    // Keeping workflows behind one service bag makes adding use cases a local change instead of growing a resolver API throughout the app.
    get registerClub() {
      return resolveRegisterClub()
    }
  }

  return {
    database,
    useCases
  }
}

export const appServices = createAppServices()
