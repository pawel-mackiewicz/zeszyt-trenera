import type { UseCase } from '@/write/application/UseCase'
import type { EventRepoPort } from '@/write/application/ports/EventRepoPort'
import type { IdGeneratorPort } from '@/write/application/ports/IdGeneratorPort'
import type { MemberRepoPort } from '@/write/application/ports/MemberRepoPort'
import type { MembershipPaymentRepoPort } from '@/write/application/ports/MembershipPaymentRepoPort'
import type { UnitOfWork } from '@/write/application/ports/UnitOfWork'
import type { RegisterMembershipPaymentCommand } from '@/write/application/requests/RegisterMembershipPaymentCommand'
import {
  MembershipPayment,
  MembershipPaymentAlreadyExistsError
} from '@/write/domain/model/MembershipPayment'
import { MemberNotFoundError } from '@/write/domain/model/Member'
import { Money } from '@/write/domain/model/vo/Money'

export class RegisterMembershipPaymentUseCase implements UseCase<RegisterMembershipPaymentCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly memberRepo: MemberRepoPort,
    private readonly membershipPaymentRepo: MembershipPaymentRepoPort,
    private readonly eventRepo: EventRepoPort,
    private readonly idGenerator: IdGeneratorPort
  ) {}

  public async handle(dto: RegisterMembershipPaymentCommand): Promise<void> {
    await this.uow.execute(async () => {
      // The member and duplicate guards must share the same transaction as the writes so offline double-submits cannot interleave two paid-month records.
      await this.ensureMemberExists(dto.memberId)
      await this.ensurePaymentDoesNotExist(dto.memberId, dto.coveredMonth)

      const [payment, event] = this.recordPayment(dto)

      await this.membershipPaymentRepo.save(payment)
      await this.eventRepo.save(event)
    })
  }

  private async ensureMemberExists(memberId: string): Promise<void> {
    if (!(await this.memberRepo.existsById(memberId))) {
      throw new MemberNotFoundError(memberId)
    }
  }

  private async ensurePaymentDoesNotExist(
    memberId: string,
    coveredMonth: string
  ): Promise<void> {
    if (
      await this.membershipPaymentRepo.existsByMemberIdAndCoveredMonth(
        memberId,
        coveredMonth
      )
    ) {
      throw new MembershipPaymentAlreadyExistsError()
    }
  }

  private recordPayment(dto: RegisterMembershipPaymentCommand) {
    // The workflow owns ID allocation so the aggregate stays deterministic in tests and isolated from infrastructure concerns while the event log receives the same immutable snapshot the table persists.
    return MembershipPayment.record(
      {
        memberId: dto.memberId,
        coveredMonth: dto.coveredMonth,
        chargedAmount: Money.create(dto.chargedAmount)
      },
      this.idGenerator.generate()
    )
  }
}
