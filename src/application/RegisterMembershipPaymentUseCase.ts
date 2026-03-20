import type { UseCase } from '@/application/UseCase'
import type { EventRepoPort } from '@/application/ports/EventRepoPort'
import type { IdGeneratorPort } from '@/application/ports/IdGeneratorPort'
import type { MemberRepoPort } from '@/application/ports/MemberRepoPort'
import type { MembershipPaymentRepoPort } from '@/application/ports/MembershipPaymentRepoPort'
import type { UnitOfWork } from '@/application/ports/UnitOfWork'
import type { RegisterMembershipPaymentCommand } from '@/application/requests/RegisterMembershipPaymentCommand'
import {
  MembershipPayment,
  MembershipPaymentAlreadyExistsError
} from '@/domain/model/MembershipPayment'
import { MemberNotFoundError } from '@/domain/model/member'

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

      const event = this.recordPayment(dto)

      await this.membershipPaymentRepo.save(event.payment)
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
    // The workflow owns ID allocation so the aggregate stays deterministic in tests and isolated from infrastructure concerns.
    return MembershipPayment.record(
      {
        memberId: dto.memberId,
        coveredMonth: dto.coveredMonth
      },
      this.idGenerator.generate()
    )
  }
}
