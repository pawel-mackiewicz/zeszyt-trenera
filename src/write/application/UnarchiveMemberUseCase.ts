import type { UseCase } from '@/write/application/UseCase'
import type { EventRepoPort } from '@/write/application/ports/EventRepoPort'
import type { MemberRepoPort } from '@/write/application/ports/MemberRepoPort'
import type { UnitOfWork } from '@/write/application/ports/UnitOfWork'
import type { UnarchiveMemberCommand } from '@/write/application/requests/UnarchiveMemberCommand'
import { MemberNotFoundError } from '@/write/domain/model/Member'

export class UnarchiveMemberUseCase implements UseCase<UnarchiveMemberCommand> {
  public constructor(
    private readonly uow: UnitOfWork,
    private readonly memberRepo: MemberRepoPort,
    private readonly eventRepo: EventRepoPort
  ) {}

  public async handle(dto: UnarchiveMemberCommand): Promise<void> {
    await this.uow.execute(async () => {
      const existingMember = await this.memberRepo.findById(dto.memberId)
      if (!existingMember) {
        throw new MemberNotFoundError(dto.memberId)
      }

      const [unarchivedMember, unarchivedEvent] = existingMember.unarchive()

      await this.eventRepo.save(unarchivedEvent)
      await this.memberRepo.update(unarchivedMember)
    })
  }
}
