import type { UseCase } from '@/write/shared/UseCase'
import type { AppResetRepoPort } from '@/system_management/app_reset/application/ports/AppResetRepoPort'
import type { AttendanceListRepoPort } from '@/write/attendance/application/ports/AttendanceListRepoPort'
import type { CampParticipantRepoPort } from '@/write/camps/application/ports/CampParticipantRepoPort'
import type { CampRepoPort } from '@/write/camps/application/ports/CampRepoPort'
import type { ClockPort } from '@/write/shared/ClockPort'
import type {
  DemoSeed,
  DemoSeedFactoryPort
} from '@/system_management/demo/application/ports/DemoSeedFactoryPort'
import type {
  DemoLifecycleState,
  DemoLifecycleStorePort
} from '@/system_management/demo/application/ports/DemoLifecycleStorePort'
import type { EventRepoPort } from '@/write/shared/events/EventRepoPort'
import type { IdGeneratorPort } from '@/write/shared/IdGeneratorPort'
import type { MemberRepoPort } from '@/write/members/application/MemberRepoPort'
import type { MembershipPaymentRepoPort } from '@/write/memberships/application/ports/MembershipPaymentRepoPort'
import {
  NOTEBOOK_BOOTSTRAP_STATES,
  type NotebookBootstrapState,
  type NotebookBootstrapStatePort
} from '@/system_management/demo/application/ports/NotebookBootstrapStatePort'
import type { ClubRepoPort } from '@/write/business_profile/application/ports/ClubRepoPort'
import type { TrainerRepoPort } from '@/write/business_profile/application/ports/TrainerRepoPort'
import type { UnitOfWork } from '@/write/shared/UnitOfWork'
import type { BootstrapDemoModeCommand } from '@/system_management/demo/application/requests/BootstrapDemoModeCommand'
import { AttendanceList } from '@/write/attendance/domain/AttendanceList'
import { Club } from '@/write/business_profile/domain/Club'
import { Camp } from '@/write/camps/domain/Camp'
import {
  CampParticipant,
  type CampParticipantPerson
} from '@/write/camps/domain/CampParticipant'
import { MembershipPayment } from '@/write/memberships/domain/MembershipPayment'
import { Member } from '@/write/members/domain/Member'
import { Trainer } from '@/write/business_profile/domain/Trainer'
import type { DomainEvent } from '@/write/shared/events/DomainEvent'
import { Money } from '@/write/shared/vo/Money'
import { PhoneNumber } from '@/write/shared/vo/PhoneNumber'

const DEMO_MEMBERSHIP_PAYMENT_AMOUNT = Money.create({
  amountMinor: 160_00,
  currency: 'PLN'
})

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
    private readonly campRepo: CampRepoPort,
    private readonly campParticipantRepo: CampParticipantRepoPort,
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
    const campIds = await this.persistDemoCamps(demoSeed.camps)

    await this.persistDemoCampParticipants(
      demoSeed.campParticipants,
      campIds,
      memberIds
    )
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
          coveredMonth: paymentSeed.coveredMonth,
          chargedAmount: DEMO_MEMBERSHIP_PAYMENT_AMOUNT
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

  private async persistDemoCamps(
    campSeeds: DemoSeed['camps']
  ): Promise<string[]> {
    const campIds: string[] = []

    for (const campSeed of campSeeds) {
      const [camp, campEvent] = Camp.register(
        {
          name: campSeed.name,
          note: campSeed.note,
          startDate: campSeed.startDate,
          finishDate: campSeed.finishDate,
          price: Money.create(campSeed.price)
        },
        this.idGenerator.generate()
      )

      campIds.push(camp.id)
      await this.campRepo.save(camp)
      await this.eventRepo.save(campEvent)
    }

    return campIds
  }

  private async persistDemoCampParticipants(
    participantSeeds: DemoSeed['campParticipants'],
    campIds: string[],
    memberIds: string[]
  ): Promise<void> {
    for (const participantSeed of participantSeeds) {
      // eslint-disable-next-line prefer-const
      let [participant, registeredEvent] = CampParticipant.register(
        {
          campId: campIds[participantSeed.campIndex] as string,
          person: this.resolveCampParticipantPerson(
            participantSeed.person,
            memberIds
          ),
          totalAmountDue: Money.create(participantSeed.totalAmountDue)
        },
        this.idGenerator.generate()
      )
      const events: DomainEvent[] = [registeredEvent]

      if (participantSeed.initialDiscount) {
        const [discountedParticipant, discountEvent] =
          participant.applyDiscount({
            id: this.idGenerator.generate(),
            amount: Money.create(participantSeed.initialDiscount.amount),
            reason: participantSeed.initialDiscount.reason
          })

        participant = discountedParticipant
        events.push(discountEvent)
      }

      if (participantSeed.initialPayment) {
        const [paidParticipant, paymentEvent] = participant.registerPayment({
          id: this.idGenerator.generate(),
          amount: Money.create(participantSeed.initialPayment.amount),
          note: participantSeed.initialPayment.note
        })

        participant = paidParticipant
        events.push(paymentEvent)
      }

      if (participantSeed.resignation) {
        const nonRefundableDeposit =
          participantSeed.resignation.nonRefundableDeposit
        const [resignedParticipant, resignationEvent] = participant.resign(
          nonRefundableDeposit
            ? {
                id: this.idGenerator.generate(),
                amount: Money.create(nonRefundableDeposit.amount),
                note: nonRefundableDeposit.note
              }
            : undefined
        )

        participant = resignedParticipant
        events.push(resignationEvent)
      }

      await this.campParticipantRepo.save(participant)

      for (const event of events) {
        await this.eventRepo.save(event)
      }
    }
  }

  private resolveCampParticipantPerson(
    personSeed: DemoSeed['campParticipants'][number]['person'],
    memberIds: string[]
  ): CampParticipantPerson {
    if (personSeed.type === 'member') {
      return {
        type: 'club',
        memberId: memberIds[personSeed.memberIndex] as string
      }
    }

    return {
      type: 'external',
      firstName: personSeed.firstName,
      lastName: personSeed.lastName
    }
  }
}
