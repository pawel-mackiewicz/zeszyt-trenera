import type { UseCase } from '@/write/shared/UseCase'
import type { MembershipPaymentRepoPort } from '@/write/memberships/application/ports/MembershipPaymentRepoPort'
import type { UnitOfWork } from '@/write/shared/UnitOfWork'
import type { DeleteMembershipPaymentCommand } from '@/write/memberships/application/requests/DeleteMembershipPaymentCommand'
import { MembershipPaymentNotFoundError } from '@/write/memberships/domain/MembershipPayment'

export class DeleteMembershipPaymentUseCase implements UseCase<DeleteMembershipPaymentCommand> {
  public constructor(
    private readonly uow: UnitOfWork,
    private readonly membershipPaymentRepo: MembershipPaymentRepoPort
  ) {}

  public async handle(dto: DeleteMembershipPaymentCommand): Promise<void> {
    await this.uow.execute(async () => {
      const existingPayment = await this.membershipPaymentRepo.findById(
        dto.membershipPaymentId
      )

      if (!existingPayment) {
        throw new MembershipPaymentNotFoundError(dto.membershipPaymentId)
      }
      await this.membershipPaymentRepo.delete(existingPayment.id)
    })
  }
}
