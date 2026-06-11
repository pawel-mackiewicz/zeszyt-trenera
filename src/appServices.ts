import type { Observable } from 'dexie'

import {
  BootstrapDemoModeUseCase,
  type BootstrapDemoModeResult
} from '@/system_management/demo/application/BootstrapDemoModeUseCase'
import { DeleteAttendanceListUseCase } from '@/write/attendance/application/DeleteAttendanceListUseCase'
import {
  DeleteMemberUseCase,
  type DeleteMemberResult
} from '@/write/members/application/DeleteMemberUseCase'
import { ArchiveMemberUseCase } from '@/write/members/application/ArchiveMemberUseCase'
import { DeleteMembershipPaymentUseCase } from '@/write/memberships/application/DeleteMembershipPaymentUseCase'
import { ExportDatabaseBackupUseCase } from '@/system_management/database_backup/application/ExportDatabaseBackupUseCase'
import { ImportDatabaseBackupUseCase } from '@/system_management/database_backup/application/ImportDatabaseBackupUseCase'
import { LeaveDemoModeUseCase } from '@/system_management/demo/application/LeaveDemoModeUseCase'
import { RegisterAttendanceListUseCase } from '@/write/attendance/application/RegisterAttendanceListUseCase'
import { RegisterCampParticipantUseCase } from '@/write/camps/application/RegisterCampParticipantUseCase'
import { RegisterCampUseCase } from '@/write/camps/application/RegisterCampUseCase'
import { RegisterClubUseCase } from '@/write/business_profile/application/RegisterClubUseCase'
import { RegisterMemberUseCase } from '@/write/members/application/RegisterMemberUseCase'
import { RegisterMembershipPaymentUseCase } from '@/write/memberships/application/RegisterMembershipPaymentUseCase'
import { RegisterTrainerUseCase } from '@/write/business_profile/application/RegisterTrainerUseCase'
import { ResetApplicationDataUseCase } from '@/system_management/app_reset/application/ResetApplicationDataUseCase'
import { SendMembershipPaymentReminderUseCase } from '@/write/memberships/application/SendMembershipPaymentReminderUseCase'
import { UpdateAttendanceListUseCase } from '@/write/attendance/application/UpdateAttendanceListUseCase'
import { UpdateMemberUseCase } from '@/write/members/application/UpdateMemberUseCase'
import type { UseCase } from '@/write/shared/UseCase'
import type { BootstrapDemoModeCommand } from '@/system_management/demo/application/requests/BootstrapDemoModeCommand'
import type { DeleteAttendanceListCommand } from '@/write/attendance/application/requests/DeleteAttendanceListCommand'
import type { DeleteMemberCommand } from '@/write/members/application/requests/DeleteMemberCommand'
import type { DeleteMembershipPaymentCommand } from '@/write/memberships/application/requests/DeleteMembershipPaymentCommand'
import type { ExportDatabaseBackupCommand } from '@/system_management/database_backup/application/requests/ExportDatabaseBackupCommand'
import type { ImportDatabaseBackupCommand } from '@/system_management/database_backup/application/requests/ImportDatabaseBackupCommand'
import type { LeaveDemoModeCommand } from '@/system_management/demo/application/requests/LeaveDemoModeCommand'
import type { ArchiveMemberCommand } from '@/write/members/application/requests/ArchiveMemberCommand'
import type { RegisterAttendanceListCommand } from '@/write/attendance/application/requests/RegisterAttendanceListCommand'
import type { RegisterCampParticipantCommand } from '@/write/camps/application/requests/RegisterCampParticipantCommand'
import type { RegisterCampCommand } from '@/write/camps/application/requests/RegisterCampCommand'
import type { RegisterClubCommand } from '@/write/business_profile/application/commands/RegisterClubCommand'
import type { RegisterMemberCommand } from '@/write/members/application/requests/RegisterMemberCommand'
import type { RegisterMembershipPaymentCommand } from '@/write/memberships/application/requests/RegisterMembershipPaymentCommand'
import type { ResetApplicationDataCommand } from '@/system_management/app_reset/application/requests/ResetApplicationDataCommand'
import type { UnarchiveMemberCommand } from '@/write/members/application/requests/UnarchiveMemberCommand'
import type { RegisterTrainerCommand } from '@/write/business_profile/application/commands/RegisterTrainerCommand'
import type { SendMembershipPaymentReminderCommand } from '@/write/memberships/application/requests/SendMembershipPaymentReminderCommand'
import type { UpdateAttendanceListCommand } from '@/write/attendance/application/requests/UpdateAttendanceListCommand'
import type { UpdateMemberCommand } from '@/write/members/application/requests/UpdateMemberCommand'
import { UnarchiveMemberUseCase } from '@/write/members/application/UnarchiveMemberUseCase'
import type { TrainerNotebookDb } from '@/db'
import { BrowserSmsComposer } from '@/write/memberships/infra/BrowserSmsComposer'
import { DemoSeedFactory } from '@/system_management/demo/infra/seed/DemoSeedFactory.ts'
import { DexieAttendanceListRepo } from '@/write/attendance/infra/db/DexieAttendanceListRepo'
import { DexieAppResetRepo } from '@/system_management/app_reset/infra/db/DexieAppResetRepo'
import { DexieCampParticipantRepo } from '@/write/camps/infra/db/DexieCampParticipantRepo'
import { DexieCampRepo } from '@/write/camps/infra/db/DexieCampRepo'
import { DexieDatabaseBackupExporter } from '@/system_management/database_backup/infra/db/DexieDatabaseBackupExporter'
import { DexieDatabaseBackupImporter } from '@/system_management/database_backup/infra/db/DexieDatabaseBackupImporter'
import { DexieClubRepo } from '@/write/business_profile/infra/db/DexieClubRepo'
import { DexieEventRepo } from '@/write/shared/infra/db/DexieEventRepo'
import { DexieMemberRepo } from '@/write/members/infra/db/DexieMemberRepo'
import { DexieMembershipPaymentRepo } from '@/write/memberships/infra/db/DexieMembershipPaymentRepo'
import { DexieNotebookBootstrapStateRepo } from '@/system_management/demo/infra/db/DexieNotebookBootstrapStateRepo'
import { DexiePaymentReminderSender } from '@/write/memberships/infra/DexiePaymentReminderSender'
import { DexieTrainerRepo } from '@/write/business_profile/infra/db/DexieTrainerRepo'
import { DexieUnitOfWork } from '@/write/shared/infra/db/DexieUnitOfWork'
import { BrowserBackupFileDelivery } from '@/system_management/database_backup/infra/BrowserBackupFileDelivery'
import { IdGenerator } from '@/write/shared/infra/IdGenerator'
import { LocalizedPaymentReminderMessageBuilder } from '@/write/memberships/infra/LocalizedPaymentReminderMessageBuilder'
import { LocalStorageAppStateResetter } from '@/system_management/app_reset/infra/LocalStorageAppStateResetter'
import { LocalStorageDemoLifecycleStore } from '@/system_management/demo/infra/LocalStorageDemoLifecycleStore'
import { SystemClock } from '@/write/shared/infra/SystemClock'
import {
  GetAttendanceSessionByIdQuery,
  type AttendanceSessionDetails,
  type GetAttendanceSessionByIdQueryInput
} from '@/read/GetAttendanceSessionByIdQuery'
import {
  GetCampDetailsQuery,
  type CampDetails,
  type GetCampDetailsQueryInput
} from '@/read/GetCampDetailsQuery'
import {
  ListAttendanceSessionsByMonthQuery,
  type AttendanceSessionListItem,
  type ListAttendanceSessionsByMonthQueryInput
} from '@/read/ListAttendanceSessionsByMonthQuery'
import { ListCampsQuery, type CampListResult } from '@/read/ListCampsQuery'
import {
  ListMembersForAttendanceEditorQuery,
  type AttendanceEditorMemberListItem
} from '@/read/ListMembersForAttendanceEditorQuery'
import {
  ObserveArchivedMembersForRosterQuery,
  type ArchivedMemberRosterListItem
} from '@/read/ObserveArchivedMembersForRosterQuery'
import {
  ObserveMembersForRosterQuery,
  type MemberRosterListItem
} from '@/read/ObserveMembersForRosterQuery'
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
  readonly deleteAttendanceList: UseCase<DeleteAttendanceListCommand>
  readonly deleteMember: UseCase<DeleteMemberCommand, DeleteMemberResult>
  readonly archiveMember: UseCase<ArchiveMemberCommand>
  readonly deleteMembershipPayment: UseCase<DeleteMembershipPaymentCommand>
  readonly registerAttendanceList: UseCase<RegisterAttendanceListCommand>
  readonly registerCamp: UseCase<RegisterCampCommand>
  readonly registerCampParticipant: UseCase<RegisterCampParticipantCommand>
  readonly registerClub: UseCase<RegisterClubCommand>
  readonly registerMember: UseCase<RegisterMemberCommand>
  readonly registerMembershipPayment: UseCase<RegisterMembershipPaymentCommand>
  readonly registerTrainer: UseCase<RegisterTrainerCommand>
  readonly sendMembershipPaymentReminder: UseCase<SendMembershipPaymentReminderCommand>
  readonly updateAttendanceList: UseCase<UpdateAttendanceListCommand>
  readonly updateMember: UseCase<UpdateMemberCommand>
  readonly unarchiveMember: UseCase<UnarchiveMemberCommand>
}

export type AppSystemUseCases = {
  readonly backup: {
    readonly export: UseCase<ExportDatabaseBackupCommand>
    readonly import: UseCase<ImportDatabaseBackupCommand>
  }
  readonly demo: {
    readonly bootstrap: UseCase<
      BootstrapDemoModeCommand,
      BootstrapDemoModeResult
    >
    readonly leave: UseCase<LeaveDemoModeCommand>
  }
  readonly reset: {
    readonly applicationData: UseCase<ResetApplicationDataCommand>
  }
}

export type AppQueries = {
  readonly getAttendanceSessionById: {
    handle(
      input: GetAttendanceSessionByIdQueryInput
    ): Promise<AttendanceSessionDetails | null>
  }
  readonly getCampDetails: {
    handle(input: GetCampDetailsQueryInput): Promise<CampDetails | null>
  }
  readonly listAttendanceSessionsByMonth: {
    handle(
      input: ListAttendanceSessionsByMonthQueryInput
    ): Promise<AttendanceSessionListItem[]>
  }
  readonly listCamps: {
    handle(): Promise<CampListResult>
  }
  readonly listMembersForAttendanceEditor: {
    handle(): Promise<AttendanceEditorMemberListItem[]>
  }
  readonly observeArchivedMembersForRoster?: {
    handle(): Observable<ArchivedMemberRosterListItem[]>
  }
  readonly observeMembersForRoster: {
    handle(): Observable<MemberRosterListItem[]>
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
  readonly system: AppSystemUseCases
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
  const resolveCampRepo = lazy(() => new DexieCampRepo(database))
  const resolveCampParticipantRepo = lazy(
    () => new DexieCampParticipantRepo(database)
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
  const resolveRegisterCamp = lazy(
    () =>
      new RegisterCampUseCase(
        resolveUnitOfWork(),
        resolveCampRepo(),
        resolveEventRepo(),
        resolveIdGenerator()
      )
  )
  const resolveRegisterCampParticipant = lazy(
    () =>
      new RegisterCampParticipantUseCase(
        resolveUnitOfWork(),
        resolveCampRepo(),
        resolveCampParticipantRepo(),
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
  const resolveGetCampDetails = lazy(() => new GetCampDetailsQuery(database))
  const resolveListAttendanceSessionsByMonth = lazy(
    () => new ListAttendanceSessionsByMonthQuery(database)
  )
  const resolveListCamps = lazy(() => new ListCampsQuery(database))
  const resolveListMembersForAttendanceEditor = lazy(
    () => new ListMembersForAttendanceEditorQuery(database)
  )
  const resolveObserveArchivedMembersForRoster = lazy(
    () => new ObserveArchivedMembersForRosterQuery(database)
  )
  const resolveObserveMembersForRoster = lazy(
    () => new ObserveMembersForRosterQuery(database)
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
    get registerAttendanceList() {
      return resolveRegisterAttendanceList()
    },
    get registerCamp() {
      return resolveRegisterCamp()
    },
    get registerCampParticipant() {
      return resolveRegisterCampParticipant()
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

  const system: AppSystemUseCases = {
    // System workflows manage whole-app lifecycle and local-first data ownership, so they stay out of domain write use cases.
    backup: {
      get export() {
        return resolveExportDatabaseBackup()
      },
      get import() {
        return resolveImportDatabaseBackup()
      }
    },
    demo: {
      get bootstrap() {
        return resolveBootstrapDemoMode()
      },
      get leave() {
        return resolveLeaveDemoMode()
      }
    },
    reset: {
      get applicationData() {
        return resolveResetApplicationData()
      }
    }
  }

  const queries: AppQueries = {
    // Keeping reads in the shared service bag lets local-first screens stay off raw Dexie APIs while still resolving one stable query instance per app lifetime.
    get getAttendanceSessionById() {
      return resolveGetAttendanceSessionById()
    },
    get getCampDetails() {
      return resolveGetCampDetails()
    },
    get listAttendanceSessionsByMonth() {
      return resolveListAttendanceSessionsByMonth()
    },
    get listCamps() {
      return resolveListCamps()
    },
    get listMembersForAttendanceEditor() {
      return resolveListMembersForAttendanceEditor()
    },
    get observeArchivedMembersForRoster() {
      return resolveObserveArchivedMembersForRoster()
    },
    get observeMembersForRoster() {
      return resolveObserveMembersForRoster()
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
    system,
    useCases
  }
}
