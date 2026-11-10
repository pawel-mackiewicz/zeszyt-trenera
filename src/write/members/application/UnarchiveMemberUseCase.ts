import type { UseCase } from '@/write/shared/UseCase'
import type { MemberRepoPort } from '@/write/members/application/MemberRepoPort'
import type { UnitOfWork } from '@/write/shared/UnitOfWork'
import type { UnarchiveMemberCommand } from '@/write/members/application/requests/UnarchiveMemberCommand'
import { MemberNotFoundError } from '@/write/members/domain/Member'

export class UnarchiveMemberUseCase implements UseCase<UnarchiveMemberCommand> {
  public constructor(
    private readonly uow: UnitOfWork,
    private readonly memberRepo: MemberRepoPort
  ) {}

  public async handle(dto: UnarchiveMemberCommand): Promise<void> {
    await this.uow.execute(async () => {
      const existingMember = await this.memberRepo.findById(dto.memberId)
      if (!existingMember) {
        throw new MemberNotFoundError(dto.memberId)
      }
      const unarchivedMember = existingMember.unarchive()
      await this.memberRepo.update(unarchivedMember)
    })
  }
}
