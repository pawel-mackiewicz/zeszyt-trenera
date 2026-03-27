import { RegisterAttendanceListUseCase } from '@/application/RegisterAttendanceListUseCase'
import { RegisterClubUseCase } from '@/application/RegisterClubUseCase'
import { RegisterMemberUseCase } from '@/application/RegisterMemberUseCase'
import { RegisterMembershipPaymentUseCase } from '@/application/RegisterMembershipPaymentUseCase'
import { RegisterTrainerUseCase } from '@/application/RegisterTrainerUseCase'
import type { UseCase } from '@/application/UseCase'
import type { RegisterAttendanceListCommand } from '@/application/requests/RegisterAttendanceListCommand'
import type { RegisterClubCommand } from '@/application/requests/RegisterClubCommand'
import type { RegisterMemberCommand } from '@/application/requests/RegisterMemberCommand'
import type { RegisterMembershipPaymentCommand } from '@/application/requests/RegisterMembershipPaymentCommand'
import type { RegisterTrainerCommand } from '@/application/requests/RegisterTrainerCommand'
import { db, type TrainerNotebookDb } from '@/infra/db'
import { DexieAttendanceListRepo } from '@/infra/db/DexieAttendanceListRepo'
import { DexieClubRepo } from '@/infra/db/DexieClubRepo'
import { DexieEventRepo } from '@/infra/db/DexieEventRepo'
import { DexieMemberRepo } from '@/infra/db/DexieMemberRepo'
import { DexieMembershipPaymentRepo } from '@/infra/db/DexieMembershipPaymentRepo'
import { DexieTrainerRepo } from '@/infra/db/DexieTrainerRepo'
import { DexieUnitOfWork } from '@/infra/db/DexieUnitOfWork'
import { IdGenerator } from '@/infra/IdGenerator'

export type AppUseCases = {
  readonly registerAttendanceList: UseCase<RegisterAttendanceListCommand>
  readonly registerClub: UseCase<RegisterClubCommand>
  readonly registerMember: UseCase<RegisterMemberCommand>
  readonly registerMembershipPayment: UseCase<RegisterMembershipPaymentCommand>
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
  const resolveMemberRepo = lazy(() => new DexieMemberRepo(database))
  const resolveMembershipPaymentRepo = lazy(
    () => new DexieMembershipPaymentRepo(database)
  )
  const resolveAttendanceListRepo = lazy(
    () => new DexieAttendanceListRepo(database)
  )
  const resolveTrainerRepo = lazy(() => new DexieTrainerRepo(database))
  const resolveEventRepo = lazy(() => new DexieEventRepo(database))
  // The composition root owns the concrete ID adapter so application and domain code depend only on the port.
  const resolveIdGenerator = lazy(() => new IdGenerator())
  const resolveRegisterAttendanceList = lazy(
    () =>
      new RegisterAttendanceListUseCase(
        resolveUnitOfWork(),
        resolveMemberRepo(),
        resolveAttendanceListRepo(),
        resolveEventRepo(),
        resolveIdGenerator()
      )
  )
  const resolveRegisterClub = lazy(
    () =>
      new RegisterClubUseCase(
        resolveUnitOfWork(),
        resolveClubRepo(),
        resolveEventRepo(),
        resolveIdGenerator()
      )
  )
  const resolveRegisterMember = lazy(
    () =>
      new RegisterMemberUseCase(
        resolveUnitOfWork(),
        resolveMemberRepo(),
        resolveEventRepo(),
        resolveIdGenerator()
      )
  )
  const resolveRegisterMembershipPayment = lazy(
    () =>
      new RegisterMembershipPaymentUseCase(
        resolveUnitOfWork(),
        resolveMemberRepo(),
        resolveMembershipPaymentRepo(),
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
    get registerAttendanceList() {
      return resolveRegisterAttendanceList()
    },
    get registerClub() {
      return resolveRegisterClub()
    },
    get registerMember() {
      return resolveRegisterMember()
    },
    get registerMembershipPayment() {
      return resolveRegisterMembershipPayment()
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
