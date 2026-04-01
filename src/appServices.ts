import type { Observable } from 'dexie'

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
import type { TrainerNotebookDb } from '@/db'
import { DexieAttendanceListRepo } from '@/infra/db/DexieAttendanceListRepo'
import { DexieClubRepo } from '@/infra/db/DexieClubRepo'
import { DexieEventRepo } from '@/infra/db/DexieEventRepo'
import { DexieMemberRepo } from '@/infra/db/DexieMemberRepo'
import { DexieMembershipPaymentRepo } from '@/infra/db/DexieMembershipPaymentRepo'
import { DexieTrainerRepo } from '@/infra/db/DexieTrainerRepo'
import { DexieUnitOfWork } from '@/infra/db/DexieUnitOfWork'
import { IdGenerator } from '@/infra/IdGenerator'
import {
  ListAttendanceSessionsByMonthQuery,
  type AttendanceSessionListItem,
  type ListAttendanceSessionsByMonthQueryInput
} from '@/read/ListAttendanceSessionsByMonthQuery'
import {
  ObserveMembershipPaymentStatusByMonthQuery,
  type MembershipPaymentStatusByMonthResult,
  type ObserveMembershipPaymentStatusByMonthQueryInput
} from '@/read/ObserveMembershipPaymentStatusByMonthQuery'

export type AppUseCases = {
  readonly registerAttendanceList: UseCase<RegisterAttendanceListCommand>
  readonly registerClub: UseCase<RegisterClubCommand>
  readonly registerMember: UseCase<RegisterMemberCommand>
  readonly registerMembershipPayment: UseCase<RegisterMembershipPaymentCommand>
  readonly registerTrainer: UseCase<RegisterTrainerCommand>
}

export type AppQueries = {
  readonly listAttendanceSessionsByMonth: {
    handle(
      input: ListAttendanceSessionsByMonthQueryInput
    ): Promise<AttendanceSessionListItem[]>
  }
  // What: keep the new reactive payments read optional on the shared type for now. Why: this backend task should expose the query without forcing unrelated UI-only test doubles to mock a screen that does not exist yet.
  readonly observeMembershipPaymentStatusByMonth?: {
    handle(
      input: ObserveMembershipPaymentStatusByMonthQueryInput
    ): Observable<MembershipPaymentStatusByMonthResult>
  }
}

export type AppServices = {
  readonly database: TrainerNotebookDb
  readonly queries: AppQueries
  readonly useCases: AppUseCases
}

// One lazy helper keeps the composition root readable as more workflows are added without splitting the graph across several files.
function lazy<T>(factory: () => T): () => T {
  let value: T | undefined

  return () => (value ??= factory())
}

export function createAppServices(database: TrainerNotebookDb): AppServices {
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
  const resolveListAttendanceSessionsByMonth = lazy(
    () => new ListAttendanceSessionsByMonthQuery(database)
  )
  const resolveObserveMembershipPaymentStatusByMonth = lazy(
    () => new ObserveMembershipPaymentStatusByMonthQuery(database)
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

  const queries: AppQueries = {
    // Keeping reads in the shared service bag lets local-first screens stay off raw Dexie APIs while still resolving one stable query instance per app lifetime.
    get listAttendanceSessionsByMonth() {
      return resolveListAttendanceSessionsByMonth()
    },
    // Keeping the reactive payments read on the shared service bag prepares the upcoming screen to subscribe through the application boundary instead of opening its own Dexie watcher.
    get observeMembershipPaymentStatusByMonth() {
      return resolveObserveMembershipPaymentStatusByMonth()
    }
  }

  return {
    database,
    queries,
    useCases
  }
}
