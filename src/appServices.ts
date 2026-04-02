import type { Observable } from 'dexie'

import { RegisterAttendanceListUseCase } from '@/application/RegisterAttendanceListUseCase'
import { RegisterClubUseCase } from '@/application/RegisterClubUseCase'
import { RegisterMemberUseCase } from '@/application/RegisterMemberUseCase'
import { RegisterMembershipPaymentUseCase } from '@/application/RegisterMembershipPaymentUseCase'
import { RegisterTrainerUseCase } from '@/application/RegisterTrainerUseCase'
import { UpdateAttendanceListUseCase } from '@/application/UpdateAttendanceListUseCase'
import { UpdateMemberUseCase } from '@/application/UpdateMemberUseCase'
import type { UseCase } from '@/application/UseCase'
import type { RegisterAttendanceListCommand } from '@/application/requests/RegisterAttendanceListCommand'
import type { RegisterClubCommand } from '@/application/requests/RegisterClubCommand'
import type { RegisterMemberCommand } from '@/application/requests/RegisterMemberCommand'
import type { RegisterMembershipPaymentCommand } from '@/application/requests/RegisterMembershipPaymentCommand'
import type { RegisterTrainerCommand } from '@/application/requests/RegisterTrainerCommand'
import type { UpdateAttendanceListCommand } from '@/application/requests/UpdateAttendanceListCommand'
import type { UpdateMemberCommand } from '@/application/requests/UpdateMemberCommand'
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
  GetAttendanceSessionByIdQuery,
  type AttendanceSessionDetails,
  type GetAttendanceSessionByIdQueryInput
} from '@/read/GetAttendanceSessionByIdQuery'
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
import {
  ObserveSetupStatusQuery,
  type SetupStatus
} from '@/read/ObserveSetupStatusQuery'

export type AppUseCases = {
  readonly registerAttendanceList: UseCase<RegisterAttendanceListCommand>
  readonly registerClub: UseCase<RegisterClubCommand>
  readonly registerMember: UseCase<RegisterMemberCommand>
  readonly registerMembershipPayment: UseCase<RegisterMembershipPaymentCommand>
  readonly registerTrainer: UseCase<RegisterTrainerCommand>
  readonly updateAttendanceList: UseCase<UpdateAttendanceListCommand>
  readonly updateMember: UseCase<UpdateMemberCommand>
}

export type AppQueries = {
  readonly getAttendanceSessionById: {
    handle(
      input: GetAttendanceSessionByIdQueryInput
    ): Promise<AttendanceSessionDetails | null>
  }
  readonly listAttendanceSessionsByMonth: {
    handle(
      input: ListAttendanceSessionsByMonthQueryInput
    ): Promise<AttendanceSessionListItem[]>
  }
  readonly observeMembershipPaymentStatusByMonth: {
    handle(
      input: ObserveMembershipPaymentStatusByMonthQueryInput
    ): Observable<MembershipPaymentStatusByMonthResult>
  }
  readonly observeSetupStatus: {
    handle(): Observable<SetupStatus>
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
  const resolveUpdateAttendanceList = lazy(
    () =>
      new UpdateAttendanceListUseCase(
        resolveUnitOfWork(),
        resolveMemberRepo(),
        resolveAttendanceListRepo(),
        resolveEventRepo()
      )
  )
  const resolveGetAttendanceSessionById = lazy(
    () => new GetAttendanceSessionByIdQuery(database)
  )
  const resolveListAttendanceSessionsByMonth = lazy(
    () => new ListAttendanceSessionsByMonthQuery(database)
  )
  const resolveObserveMembershipPaymentStatusByMonth = lazy(
    () => new ObserveMembershipPaymentStatusByMonthQuery(database)
  )
  const resolveObserveSetupStatus = lazy(
    () => new ObserveSetupStatusQuery(database)
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
  const resolveUpdateMember = lazy(
    () =>
      new UpdateMemberUseCase(
        resolveUnitOfWork(),
        resolveMemberRepo(),
        resolveEventRepo()
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
    },
    get updateAttendanceList() {
      return resolveUpdateAttendanceList()
    },
    get updateMember() {
      return resolveUpdateMember()
    }
  }

  const queries: AppQueries = {
    // Keeping session hydration behind the shared query bag lets attendance edit stay off raw Dexie APIs while still reading one persisted session through the application boundary.
    get getAttendanceSessionById() {
      return resolveGetAttendanceSessionById()
    },
    // Keeping reads in the shared service bag lets local-first screens stay off raw Dexie APIs while still resolving one stable query instance per app lifetime.
    get listAttendanceSessionsByMonth() {
      return resolveListAttendanceSessionsByMonth()
    },
    // Keeping the reactive payments read on the shared service bag prepares the upcoming screen to subscribe through the application boundary instead of opening its own Dexie watcher.
    get observeMembershipPaymentStatusByMonth() {
      return resolveObserveMembershipPaymentStatusByMonth()
    },
    // Keeping startup setup state in the shared query bag lets the shell react to local club/trainer writes without reading Dexie directly.
    get observeSetupStatus() {
      return resolveObserveSetupStatus()
    }
  }

  return {
    database,
    queries,
    useCases
  }
}
