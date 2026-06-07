import type { UseCase } from '@/write/shared/UseCase'
import type { EventRepoPort } from '@/write/shared/events/EventRepoPort'
import type { MembershipPaymentRepoPort } from '@/write/memberships/application/ports/MembershipPaymentRepoPort'
import type { UnitOfWork } from '@/write/shared/UnitOfWork'
import type { DeleteMembershipPaymentCommand } from '@/write/memberships/application/requests/DeleteMembershipPaymentCommand'
import {
  MembershipPayment,
  MembershipPaymentNotFoundError
} from '@/write/memberships/domain/MembershipPayment'

export class DeleteMembershipPaymentUseCase implements UseCase<DeleteMembershipPaymentCommand> {
  public constructor(
    private readonly uow: UnitOfWork,
    private readonly membershipPaymentRepo: MembershipPaymentRepoPort,
    private readonly eventRepo: EventRepoPort
  ) {}

  public async handle(dto: DeleteMembershipPaymentCommand): Promise<void> {
    await this.uow.execute(async () => {
      const existingPayment = await this.membershipPaymentRepo.findById(
        dto.membershipPaymentId
      )

      if (!existingPayment) {
        throw new MembershipPaymentNotFoundError(dto.membershipPaymentId)
      }

      const deletedEvent = MembershipPayment.delete(existingPayment)

      // Why: removing a paid-month correction must commit with its event so offline history and current rows stay in lockstep.
      await this.eventRepo.save(deletedEvent)
      await this.membershipPaymentRepo.delete(existingPayment.id)
    })
  }
}
