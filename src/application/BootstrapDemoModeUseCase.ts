import type { UseCase } from '@/application/UseCase'
import type { AppResetRepoPort } from '@/application/ports/AppResetRepoPort'
import type { AttendanceListRepoPort } from '@/application/ports/AttendanceListRepoPort'
import type { ClockPort } from '@/application/ports/ClockPort'
import type { ClubRepoPort } from '@/application/ports/ClubRepoPort'
import type { DemoLifecycleStorePort } from '@/application/ports/DemoLifecycleStorePort'
import type { EventRepoPort } from '@/application/ports/EventRepoPort'
import type { IdGeneratorPort } from '@/application/ports/IdGeneratorPort'
import type { MemberRepoPort } from '@/application/ports/MemberRepoPort'
import type { MembershipPaymentRepoPort } from '@/application/ports/MembershipPaymentRepoPort'
import type { TrainerRepoPort } from '@/application/ports/TrainerRepoPort'
import type { UnitOfWork } from '@/application/ports/UnitOfWork'
import type { BootstrapDemoModeCommand } from '@/application/requests/BootstrapDemoModeCommand'
import { createDemoSeed } from '@/application/demo/createDemoSeed'
import { AttendanceList } from '@/domain/model/AttendanceList'
import { Club } from '@/domain/model/club'
import { MembershipPayment } from '@/domain/model/MembershipPayment'
import { Member } from '@/domain/model/member'
import { Trainer } from '@/domain/model/trainer'
import { PhoneNumber } from '@/domain/model/vo/PhoneNumber'

export type BootstrapDemoModeResult = {
  mode: 'demo' | 'standard'
  introModal: boolean
}

export class BootstrapDemoModeUseCase implements UseCase<
  BootstrapDemoModeCommand,
  BootstrapDemoModeResult
> {
  public constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly appResetRepo: AppResetRepoPort,
    private readonly clubRepo: ClubRepoPort,
    private readonly trainerRepo: TrainerRepoPort,
    private readonly memberRepo: MemberRepoPort,
    private readonly membershipPaymentRepo: MembershipPaymentRepoPort,
    private readonly attendanceListRepo: AttendanceListRepoPort,
    private readonly eventRepo: EventRepoPort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort,
    private readonly demoLifecycleStore: DemoLifecycleStorePort
  ) {}

  public async handle(
    request: BootstrapDemoModeCommand
  ): Promise<BootstrapDemoModeResult> {
    void request

    const lifecycleState = await this.demoLifecycleStore.readState()
    const demoModeActive = await this.demoLifecycleStore.readDemoModeActive()
    const clubExists = await this.clubRepo.exists()
    const trainerExists = await this.trainerRepo.exists()

    if (lifecycleState === 'dismissed') {
      return {
        mode: 'standard',
        introModal: false
      }
    }

    // Why: the persisted demo flag describes which notebook is currently mounted, so a refresh must keep demo chrome visible as long as the local data still belongs to the seeded notebook.
    if (demoModeActive && clubExists && trainerExists) {
      return {
        mode: 'demo',
        introModal: false
      }
    }

    // Why: only non-demo boots should treat existing setup rows as user-owned data; otherwise a refreshed demo notebook would be mistaken for a finished real setup.
    if (!demoModeActive && (clubExists || trainerExists)) {
      return {
        mode: 'standard',
        introModal: false
      }
    }

    const demoSeed = createDemoSeed(this.clock.now())
    const seededDemoMode = await this.unitOfWork.execute(async () => {
      if (
        !demoModeActive &&
        ((await this.clubRepo.exists()) || (await this.trainerRepo.exists()))
      ) {
        return false
      }

      // Why: demo bootstrap must recover from half-written local data too, so reseeding starts from one known clean slate instead of layering more rows onto a corrupted notebook.
      await this.appResetRepo.clearAllData()

      const memberIds: string[] = []
      const [club, clubEvent] = Club.register(
        demoSeed.club.name,
        demoSeed.club.foundingDate,
        this.idGenerator.generate()
      )
      const [trainer, trainerEvent] = Trainer.register(
        demoSeed.trainer.name,
        this.idGenerator.generate()
      )

      await this.clubRepo.save(club)
      await this.eventRepo.save(clubEvent)
      await this.trainerRepo.save(trainer)
      await this.eventRepo.save(trainerEvent)

      for (const memberSeed of demoSeed.members) {
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

      for (const paymentSeed of demoSeed.membershipPayments) {
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

      for (const attendanceSeed of demoSeed.attendanceLists) {
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

      return true
    })

    if (!seededDemoMode) {
      return {
        mode: demoModeActive ? 'demo' : 'standard',
        introModal: false
      }
    }

    await this.demoLifecycleStore.writeDemoModeActive(true)

    return {
      mode: 'demo',
      // Why: the modal should explain demo mode only on the first seeded boot; later repairs or refreshes should reopen straight into the notebook without repeating the same onboarding copy.
      introModal: lifecycleState === 'uninitialized' && !demoModeActive
    }
  }
}
