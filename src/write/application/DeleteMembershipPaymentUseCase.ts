import type { UseCase } from '@/write/application/UseCase'
import type { EventRepoPort } from '@/write/application/ports/EventRepoPort'
import type { MembershipPaymentRepoPort } from '@/write/application/ports/MembershipPaymentRepoPort'
import type { UnitOfWork } from '@/write/application/ports/UnitOfWork'
import type { DeleteMembershipPaymentCommand } from '@/write/application/requests/DeleteMembershipPaymentCommand'
import {
  MembershipPayment,
  MembershipPaymentNotFoundError
} from '@/write/domain/model/MembershipPayment'

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
