import type { Observable } from 'dexie'

import {
  BootstrapDemoModeUseCase,
  type BootstrapDemoModeResult
} from '@/write/application/BootstrapDemoModeUseCase'
import { DeleteAttendanceListUseCase } from '@/write/application/DeleteAttendanceListUseCase'
import {
  DeleteMemberUseCase,
  type DeleteMemberResult
} from '@/write/application/DeleteMemberUseCase'
import { ArchiveMemberUseCase } from '@/write/application/ArchiveMemberUseCase'
import { DeleteMembershipPaymentUseCase } from '@/write/application/DeleteMembershipPaymentUseCase'
import { ExportDatabaseBackupUseCase } from '@/write/application/ExportDatabaseBackupUseCase'
import { ImportDatabaseBackupUseCase } from '@/write/application/ImportDatabaseBackupUseCase'
import { LeaveDemoModeUseCase } from '@/write/application/LeaveDemoModeUseCase'
import { RegisterAttendanceListUseCase } from '@/write/application/RegisterAttendanceListUseCase'
import { RegisterClubUseCase } from '@/write/application/RegisterClubUseCase'
import { RegisterMemberUseCase } from '@/write/application/RegisterMemberUseCase'
import { RegisterMembershipPaymentUseCase } from '@/write/application/RegisterMembershipPaymentUseCase'
import { RegisterTrainerUseCase } from '@/write/application/RegisterTrainerUseCase'
import { ResetApplicationDataUseCase } from '@/write/application/ResetApplicationDataUseCase'
import { SendMembershipPaymentReminderUseCase } from '@/write/application/SendMembershipPaymentReminderUseCase'
import { UpdateAttendanceListUseCase } from '@/write/application/UpdateAttendanceListUseCase'
import { UpdateMemberUseCase } from '@/write/application/UpdateMemberUseCase'
import type { UseCase } from '@/write/application/UseCase'
import type { BootstrapDemoModeCommand } from '@/write/application/requests/BootstrapDemoModeCommand'
import type { DeleteAttendanceListCommand } from '@/write/application/requests/DeleteAttendanceListCommand'
import type { DeleteMemberCommand } from '@/write/application/requests/DeleteMemberCommand'
import type { DeleteMembershipPaymentCommand } from '@/write/application/requests/DeleteMembershipPaymentCommand'
import type { ExportDatabaseBackupCommand } from '@/write/application/requests/ExportDatabaseBackupCommand'
import type { ImportDatabaseBackupCommand } from '@/write/application/requests/ImportDatabaseBackupCommand'
import type { LeaveDemoModeCommand } from '@/write/application/requests/LeaveDemoModeCommand'
import type { ArchiveMemberCommand } from '@/write/application/requests/ArchiveMemberCommand'
import type { RegisterAttendanceListCommand } from '@/write/application/requests/RegisterAttendanceListCommand'
import type { RegisterClubCommand } from '@/write/application/requests/RegisterClubCommand'
import type { RegisterMemberCommand } from '@/write/application/requests/RegisterMemberCommand'
import type { RegisterMembershipPaymentCommand } from '@/write/application/requests/RegisterMembershipPaymentCommand'
import type { ResetApplicationDataCommand } from '@/write/application/requests/ResetApplicationDataCommand'
import type { UnarchiveMemberCommand } from '@/write/application/requests/UnarchiveMemberCommand'
import type { RegisterTrainerCommand } from '@/write/application/requests/RegisterTrainerCommand'
import type { SendMembershipPaymentReminderCommand } from '@/write/application/requests/SendMembershipPaymentReminderCommand'
import type { UpdateAttendanceListCommand } from '@/write/application/requests/UpdateAttendanceListCommand'
import type { UpdateMemberCommand } from '@/write/application/requests/UpdateMemberCommand'
import { UnarchiveMemberUseCase } from '@/write/application/UnarchiveMemberUseCase'
import type { TrainerNotebookDb } from '@/db'
import { BrowserSmsComposer } from '@/write/infra/BrowserSmsComposer'
import { DemoSeedFactory } from '@/write/infra/demo/DemoSeedFactory.ts'
import { DexieAttendanceListRepo } from '@/write/infra/db/DexieAttendanceListRepo'
import { DexieAppResetRepo } from '@/write/infra/db/DexieAppResetRepo'
import { DexieDatabaseBackupExporter } from '@/write/infra/db/DexieDatabaseBackupExporter'
import { DexieDatabaseBackupImporter } from '@/write/infra/db/DexieDatabaseBackupImporter'
import { DexieClubRepo } from '@/write/infra/db/DexieClubRepo'
import { DexieEventRepo } from '@/write/infra/db/DexieEventRepo'
import { DexieMemberRepo } from '@/write/infra/db/DexieMemberRepo'
import { DexieMembershipPaymentRepo } from '@/write/infra/db/DexieMembershipPaymentRepo'
import { DexieNotebookBootstrapStateRepo } from '@/write/infra/db/DexieNotebookBootstrapStateRepo'
import { DexiePaymentReminderSender } from '@/write/infra/db/DexiePaymentReminderSender'
import { DexieTrainerRepo } from '@/write/infra/db/DexieTrainerRepo'
import { DexieUnitOfWork } from '@/write/infra/db/DexieUnitOfWork'
import { BrowserBackupFileDelivery } from '@/write/infra/BrowserBackupFileDelivery'
import { IdGenerator } from '@/write/infra/IdGenerator'
import { LocalizedPaymentReminderMessageBuilder } from '@/write/infra/LocalizedPaymentReminderMessageBuilder'
import { LocalStorageAppStateResetter } from '@/write/infra/LocalStorageAppStateResetter'
import { LocalStorageDemoLifecycleStore } from '@/write/infra/LocalStorageDemoLifecycleStore'
import { SystemClock } from '@/write/infra/SystemClock'
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
  ListMembersForAttendanceEditorQuery,
  type AttendanceEditorMemberListItem
} from '@/read/ListMembersForAttendanceEditorQuery'
import {
  ListArchivedMembersForRosterQuery,
  type ArchivedMemberRosterListItem
} from '@/read/ListArchivedMembersForRosterQuery'
import {
  ListMembersForRosterQuery,
  type MemberRosterListItem
} from '@/read/ListMembersForRosterQuery'
import {
  ObserveMembershipPaymentStatusByMonthQuery,
  type MembershipPaymentStatusByMonthResult,
  type ObserveMembershipPaymentStatusByMonthQueryInput
} from '@/read/ObserveMembershipPaymentStatusByMonthQuery'
import {
  ObserveMembershipPaymentSummaryByMonthQuery,
  type MembershipPaymentSummaryByMonthResult,
  type ObserveMembershipPaymentSummaryByMonthQueryInput
} from '@/read/ObserveMembershipPaymentSummaryByMonthQuery'
import {
  ObserveSetupStatusQuery,
  type SetupStatus
} from '@/read/ObserveSetupStatusQuery'

export type AppUseCases = {
  readonly bootstrapDemoMode: UseCase<
    BootstrapDemoModeCommand,
    BootstrapDemoModeResult
  >
  readonly deleteAttendanceList: UseCase<DeleteAttendanceListCommand>
  readonly deleteMember: UseCase<DeleteMemberCommand, DeleteMemberResult>
  readonly archiveMember: UseCase<ArchiveMemberCommand>
  readonly deleteMembershipPayment: UseCase<DeleteMembershipPaymentCommand>
  readonly exportDatabaseBackup: UseCase<ExportDatabaseBackupCommand>
  readonly importDatabaseBackup: UseCase<ImportDatabaseBackupCommand>
  readonly leaveDemoMode: UseCase<LeaveDemoModeCommand>
  readonly registerAttendanceList: UseCase<RegisterAttendanceListCommand>
  readonly registerClub: UseCase<RegisterClubCommand>
  readonly registerMember: UseCase<RegisterMemberCommand>
  readonly registerMembershipPayment: UseCase<RegisterMembershipPaymentCommand>
  readonly registerTrainer: UseCase<RegisterTrainerCommand>
  readonly resetApplicationData: UseCase<ResetApplicationDataCommand>
  readonly sendMembershipPaymentReminder: UseCase<SendMembershipPaymentReminderCommand>
  readonly updateAttendanceList: UseCase<UpdateAttendanceListCommand>
  readonly updateMember: UseCase<UpdateMemberCommand>
  readonly unarchiveMember: UseCase<UnarchiveMemberCommand>
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
  readonly listMembersForAttendanceEditor: {
    handle(): Promise<AttendanceEditorMemberListItem[]>
  }
  readonly listArchivedMembersForRoster?: {
    handle(): Promise<ArchivedMemberRosterListItem[]>
  }
  readonly listMembersForRoster: {
    handle(): Promise<MemberRosterListItem[]>
  }
  readonly observeMembershipPaymentStatusByMonth: {
    handle(
      input: ObserveMembershipPaymentStatusByMonthQueryInput
    ): Observable<MembershipPaymentStatusByMonthResult>
  }
  readonly observeMembershipPaymentSummaryByMonth: {
    handle(
      input: ObserveMembershipPaymentSummaryByMonthQueryInput
    ): Observable<MembershipPaymentSummaryByMonthResult>
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
  const resolveNotebookBootstrapStateRepo = lazy(
    () => new DexieNotebookBootstrapStateRepo(database)
  )
  const resolveAttendanceListRepo = lazy(
    () => new DexieAttendanceListRepo(database)
  )
  const resolveAppResetRepo = lazy(() => new DexieAppResetRepo(database))
  const resolveAppStateReset = lazy(() => new LocalStorageAppStateResetter())
  const resolveTrainerRepo = lazy(() => new DexieTrainerRepo(database))
  const resolveEventRepo = lazy(() => new DexieEventRepo(database))
  // The composition root owns the concrete ID adapter so application and domain code depend only on the port.
  const resolveIdGenerator = lazy(() => new IdGenerator())
  const resolveDemoSeedFactory = lazy(() => new DemoSeedFactory())
  const resolveClock = lazy(() => new SystemClock())
  // Backup export keeps snapshot generation and browser delivery as swappable adapters so the application workflow can stay policy-focused and testable.
  const resolveDatabaseBackupExport = lazy(
    () => new DexieDatabaseBackupExporter(database)
  )
  // Backup import keeps restore semantics in one adapter so shell flows never call Dexie import APIs directly.
  const resolveDatabaseBackupImport = lazy(
    () => new DexieDatabaseBackupImporter(database)
  )
  const resolveBackupFileDelivery = lazy(() => new BrowserBackupFileDelivery())
  const resolveDemoLifecycleStore = lazy(
    () => new LocalStorageDemoLifecycleStore()
  )
  const resolvePaymentReminderSender = lazy(
    () => new DexiePaymentReminderSender(database)
  )
  const resolvePaymentReminderMessageBuilder = lazy(
    () => new LocalizedPaymentReminderMessageBuilder()
  )
  const resolveSmsComposer = lazy(() => new BrowserSmsComposer())
  const resolveBootstrapDemoMode = lazy(
    () =>
      new BootstrapDemoModeUseCase(
        resolveUnitOfWork(),
        resolveAppResetRepo(),
        resolveNotebookBootstrapStateRepo(),
        resolveClubRepo(),
        resolveTrainerRepo(),
        resolveMemberRepo(),
        resolveMembershipPaymentRepo(),
        resolveAttendanceListRepo(),
        resolveEventRepo(),
        resolveIdGenerator(),
        resolveDemoSeedFactory(),
        resolveClock(),
        resolveDemoLifecycleStore()
      )
  )
  const resolveLeaveDemoMode = lazy(
    () =>
      new LeaveDemoModeUseCase(
        resolveUnitOfWork(),
        resolveAppResetRepo(),
        resolveDemoLifecycleStore()
      )
  )
  const resolveExportDatabaseBackup = lazy(
    () =>
      new ExportDatabaseBackupUseCase(
        resolveDatabaseBackupExport(),
        resolveBackupFileDelivery(),
        resolveClock()
      )
  )
  const resolveImportDatabaseBackup = lazy(
    () => new ImportDatabaseBackupUseCase(resolveDatabaseBackupImport())
  )
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
  const resolveDeleteAttendanceList = lazy(
    () =>
      new DeleteAttendanceListUseCase(
        resolveUnitOfWork(),
        resolveAttendanceListRepo(),
        resolveEventRepo()
      )
  )
  const resolveDeleteMember = lazy(
    () =>
      new DeleteMemberUseCase(
        resolveUnitOfWork(),
        resolveMemberRepo(),
        resolveMembershipPaymentRepo(),
        resolveAttendanceListRepo(),
        resolveEventRepo()
      )
  )
  const resolveArchiveMember = lazy(
    () =>
      new ArchiveMemberUseCase(
        resolveUnitOfWork(),
        resolveMemberRepo(),
        resolveEventRepo()
      )
  )
  const resolveDeleteMembershipPayment = lazy(
    () =>
      new DeleteMembershipPaymentUseCase(
        resolveUnitOfWork(),
        resolveMembershipPaymentRepo(),
        resolveEventRepo()
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
  const resolveListMembersForAttendanceEditor = lazy(
    () => new ListMembersForAttendanceEditorQuery(database)
  )
  const resolveListArchivedMembersForRoster = lazy(
    () => new ListArchivedMembersForRosterQuery(database)
  )
  const resolveListMembersForRoster = lazy(
    () => new ListMembersForRosterQuery(database)
  )
  const resolveObserveMembershipPaymentStatusByMonth = lazy(
    () => new ObserveMembershipPaymentStatusByMonthQuery(database)
  )
  const resolveObserveMembershipPaymentSummaryByMonth = lazy(
    () => new ObserveMembershipPaymentSummaryByMonthQuery(database)
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
  const resolveUnarchiveMember = lazy(
    () =>
      new UnarchiveMemberUseCase(
        resolveUnitOfWork(),
        resolveMemberRepo(),
        resolveEventRepo()
      )
  )
  const resolveResetApplicationData = lazy(
    () =>
      new ResetApplicationDataUseCase(
        resolveUnitOfWork(),
        resolveAppResetRepo(),
        resolveAppStateReset()
      )
  )
  const resolveSendMembershipPaymentReminder = lazy(
    () =>
      new SendMembershipPaymentReminderUseCase(
        resolveMemberRepo(),
        resolvePaymentReminderSender(),
        resolvePaymentReminderMessageBuilder(),
        resolveSmsComposer()
      )
  )

  const useCases: AppUseCases = {
    // Keeping workflows behind one service bag makes adding use cases a local change instead of growing a resolver API throughout the app.
    get bootstrapDemoMode() {
      return resolveBootstrapDemoMode()
    },
    get deleteAttendanceList() {
      return resolveDeleteAttendanceList()
    },
    get deleteMember() {
      return resolveDeleteMember()
    },
    get archiveMember() {
      return resolveArchiveMember()
    },
    get deleteMembershipPayment() {
      return resolveDeleteMembershipPayment()
    },
    get exportDatabaseBackup() {
      return resolveExportDatabaseBackup()
    },
    get importDatabaseBackup() {
      return resolveImportDatabaseBackup()
    },
    get leaveDemoMode() {
      return resolveLeaveDemoMode()
    },
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
    get resetApplicationData() {
      return resolveResetApplicationData()
    },
    get sendMembershipPaymentReminder() {
      return resolveSendMembershipPaymentReminder()
    },
    get updateAttendanceList() {
      return resolveUpdateAttendanceList()
    },
    get updateMember() {
      return resolveUpdateMember()
    },
    get unarchiveMember() {
      return resolveUnarchiveMember()
    }
  }

  const queries: AppQueries = {
    // Keeping reads in the shared service bag lets local-first screens stay off raw Dexie APIs while still resolving one stable query instance per app lifetime.
    get getAttendanceSessionById() {
      return resolveGetAttendanceSessionById()
    },
    get listAttendanceSessionsByMonth() {
      return resolveListAttendanceSessionsByMonth()
    },
    get listMembersForAttendanceEditor() {
      return resolveListMembersForAttendanceEditor()
    },
    get listArchivedMembersForRoster() {
      return resolveListArchivedMembersForRoster()
    },
    get listMembersForRoster() {
      return resolveListMembersForRoster()
    },
    get observeMembershipPaymentStatusByMonth() {
      return resolveObserveMembershipPaymentStatusByMonth()
    },
    get observeMembershipPaymentSummaryByMonth() {
      return resolveObserveMembershipPaymentSummaryByMonth()
    },
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
