import type { UseCase } from '@/application/UseCase'
import type { AppResetRepoPort } from '@/application/ports/AppResetRepoPort'
import type { AttendanceListRepoPort } from '@/application/ports/AttendanceListRepoPort'
import type { ClockPort } from '@/application/ports/ClockPort'
import type {
  DemoSeed,
  DemoSeedFactoryPort
} from '@/application/ports/DemoSeedFactoryPort'
import type {
  DemoLifecycleState,
  DemoLifecycleStorePort
} from '@/application/ports/DemoLifecycleStorePort'
import type { EventRepoPort } from '@/application/ports/EventRepoPort'
import type { IdGeneratorPort } from '@/application/ports/IdGeneratorPort'
import type { MemberRepoPort } from '@/application/ports/MemberRepoPort'
import type { MembershipPaymentRepoPort } from '@/application/ports/MembershipPaymentRepoPort'
import {
  NOTEBOOK_BOOTSTRAP_STATES,
  type NotebookBootstrapState,
  type NotebookBootstrapStatePort
} from '@/application/ports/NotebookBootstrapStatePort'
import type { ClubRepoPort } from '@/application/ports/ClubRepoPort'
import type { TrainerRepoPort } from '@/application/ports/TrainerRepoPort'
import type { UnitOfWork } from '@/application/ports/UnitOfWork'
import type { BootstrapDemoModeCommand } from '@/application/requests/BootstrapDemoModeCommand'
import { AttendanceList } from '@/domain/model/AttendanceList'
import { Club } from '@/domain/model/club'
import { MembershipPayment } from '@/domain/model/MembershipPayment'
import { Member } from '@/domain/model/member'
import { Trainer } from '@/domain/model/Trainer'
import { PhoneNumber } from '@/domain/model/vo/PhoneNumber'

export type BootstrapDemoModeResult = {
  demoModeActive: boolean
  introModal: boolean
}

type DemoBootstrapContext = {
  lifecycleState: DemoLifecycleState
  demoModeActive: boolean
  notebookBootstrapState: NotebookBootstrapState
}

export class BootstrapDemoModeUseCase implements UseCase<
  BootstrapDemoModeCommand,
  BootstrapDemoModeResult
> {
  public constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly appResetRepo: AppResetRepoPort,
    private readonly notebookBootstrapStateRepo: NotebookBootstrapStatePort,
    private readonly clubRepo: ClubRepoPort,
    private readonly trainerRepo: TrainerRepoPort,
    private readonly memberRepo: MemberRepoPort,
    private readonly membershipPaymentRepo: MembershipPaymentRepoPort,
    private readonly attendanceListRepo: AttendanceListRepoPort,
    private readonly eventRepo: EventRepoPort,
    private readonly idGenerator: IdGeneratorPort,
    // Why: demo data shape generation belongs to an injected policy so the use case stays independent from infra module locations.
    private readonly demoSeedFactory: DemoSeedFactoryPort,
    private readonly clock: ClockPort,
    private readonly demoLifecycleStore: DemoLifecycleStorePort
  ) {}

  public async handle(
    request: BootstrapDemoModeCommand
  ): Promise<BootstrapDemoModeResult> {
    void request

    const context = await this.readBootstrapContext()
    const existingResult = this.resolveExistingResult(context)

    if (existingResult) {
      return existingResult
    }

    const seededDemoMode = await this.seedDemoNotebook(context.demoModeActive)

    if (!seededDemoMode) {
      return {
        demoModeActive: context.demoModeActive,
        introModal: false
      }
    }

    await this.demoLifecycleStore.writeDemoModeActive(true)

    return {
      demoModeActive: true,
      // Why: the modal should explain demo mode only on the first seeded boot; later repairs or refreshes should reopen straight into the notebook without repeating the same onboarding copy.
      introModal:
        context.lifecycleState === 'uninitialized' && !context.demoModeActive
    }
  }

  // Why: startup needs one coherent snapshot of local demo inputs before deciding whether to seed, reuse, or avoid the notebook.
  private async readBootstrapContext(): Promise<DemoBootstrapContext> {
    const [lifecycleState, demoModeActive, notebookBootstrapState] =
      await Promise.all([
        this.demoLifecycleStore.readState(),
        this.demoLifecycleStore.readDemoModeActive(),
        this.notebookBootstrapStateRepo.readBootstrapState()
      ])

    return {
      lifecycleState,
      demoModeActive,
      notebookBootstrapState
    }
  }

  // Why: keeping the guard clauses behind one decision helper makes the startup policy readable without mixing it into the seeding writes.
  private resolveExistingResult(
    context: DemoBootstrapContext
  ): BootstrapDemoModeResult | null {
    if (context.lifecycleState === 'dismissed') {
      return {
        demoModeActive: false,
        introModal: false
      }
    }

    // Why: the persisted demo flag describes which notebook is currently mounted, so a refresh must keep demo chrome visible as long as the local data still belongs to the seeded notebook.
    if (
      context.demoModeActive &&
      context.notebookBootstrapState === NOTEBOOK_BOOTSTRAP_STATES.SETUP_READY
    ) {
      return {
        demoModeActive: true,
        introModal: false
      }
    }

    // Why: demo bootstrap must stay away from any notebook that already contains local rows, even when setup was interrupted before the club/trainer baseline was finished.
    if (
      !context.demoModeActive &&
      context.notebookBootstrapState !== NOTEBOOK_BOOTSTRAP_STATES.EMPTY
    ) {
      return {
        demoModeActive: false,
        introModal: false
      }
    }

    return null
  }

  // Why: the write path stays in one place so a future change to the demo notebook payload cannot accidentally bypass the transactional bootstrap flow.
  private async seedDemoNotebook(demoModeActive: boolean): Promise<boolean> {
    const demoSeed = this.demoSeedFactory.createSeed(this.clock.now())

    return await this.unitOfWork.execute(async () => {
      if (await this.shouldKeepExistingNotebook(demoModeActive)) {
        return false
      }

      // Why: demo bootstrap must recover from half-written local data too, so reseeding starts from one known clean slate instead of layering more rows onto a corrupted notebook.
      await this.appResetRepo.clearAllData()
      await this.persistDemoSeed(demoSeed)

      return true
    })
  }

  // Why: the notebook state must be rechecked inside the transaction so a late real setup write cannot be wiped by a stale pre-transaction read.
  private async shouldKeepExistingNotebook(
    demoModeActive: boolean
  ): Promise<boolean> {
    if (demoModeActive) {
      return false
    }

    return (
      (await this.notebookBootstrapStateRepo.readBootstrapState()) !==
      NOTEBOOK_BOOTSTRAP_STATES.EMPTY
    )
  }

  // Why: grouping the seed persistence behind one helper keeps the application service focused on the bootstrap lifecycle instead of the shape of every demo aggregate.
  private async persistDemoSeed(demoSeed: DemoSeed): Promise<void> {
    await this.persistDemoClub(demoSeed.club)
    await this.persistDemoTrainer(demoSeed.trainer)
    const memberIds = await this.persistDemoMembers(demoSeed.members)

    await this.persistDemoMembershipPayments(
      demoSeed.membershipPayments,
      memberIds
    )
    await this.persistDemoAttendanceLists(demoSeed.attendanceLists, memberIds)
  }

  private async persistDemoClub(clubSeed: DemoSeed['club']): Promise<void> {
    const [club, clubEvent] = Club.register(
      clubSeed.name,
      clubSeed.foundingDate,
      this.idGenerator.generate()
    )

    await this.clubRepo.save(club)
    await this.eventRepo.save(clubEvent)
  }

  private async persistDemoTrainer(
    trainerSeed: DemoSeed['trainer']
  ): Promise<void> {
    const [trainer, trainerEvent] = Trainer.register(
      trainerSeed.name,
      this.idGenerator.generate()
    )

    await this.trainerRepo.save(trainer)
    await this.eventRepo.save(trainerEvent)
  }

  // Why: later demo records refer to members by index, so collecting the generated IDs in one place preserves that mapping instead of leaking it across the bootstrap flow.
  private async persistDemoMembers(
    memberSeeds: DemoSeed['members']
  ): Promise<string[]> {
    const memberIds: string[] = []

    for (const memberSeed of memberSeeds) {
      const [member, memberEvent] = Member.register(
        {
          firstName: memberSeed.firstName,
          lastName: memberSeed.lastName,
          phoneNumber: PhoneNumber.create(memberSeed.phoneNumber),
          dateOfBirth: memberSeed.dateOfBirth,
          joinedAt: memberSeed.joinedAt
        },
        this.idGenerator.generate()
      )

      memberIds.push(member.id)
      await this.memberRepo.save(member)
      await this.eventRepo.save(memberEvent)
    }

    return memberIds
  }

  private async persistDemoMembershipPayments(
    paymentSeeds: DemoSeed['membershipPayments'],
    memberIds: string[]
  ): Promise<void> {
    for (const paymentSeed of paymentSeeds) {
      const [payment, paymentEvent] = MembershipPayment.record(
        {
          memberId: memberIds[paymentSeed.memberIndex] as string,
          coveredMonth: paymentSeed.coveredMonth
        },
        this.idGenerator.generate()
      )

      await this.membershipPaymentRepo.save(payment)
      await this.eventRepo.save(paymentEvent)
    }
  }

  private async persistDemoAttendanceLists(
    attendanceSeeds: DemoSeed['attendanceLists'],
    memberIds: string[]
  ): Promise<void> {
    for (const attendanceSeed of attendanceSeeds) {
      const [attendanceList, attendanceEvent] = AttendanceList.record(
        {
          memberIds: attendanceSeed.memberIndexes.map(
            (memberIndex) => memberIds[memberIndex] as string
          ),
          start: attendanceSeed.start
        },
        this.idGenerator.generate()
      )

      await this.attendanceListRepo.save(attendanceList)
      await this.eventRepo.save(attendanceEvent)
    }
  }
}
