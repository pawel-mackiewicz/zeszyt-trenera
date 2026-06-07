import type { UseCase } from '@/write/shared/UseCase'
import type { EventRepoPort } from '@/write/shared/events/EventRepoPort'
import type { MemberRepoPort } from '@/write/members/application/MemberRepoPort'
import type { UnitOfWork } from '@/write/shared/UnitOfWork'
import type { ArchiveMemberCommand } from '@/write/members/application/requests/ArchiveMemberCommand'
import { MemberNotFoundError } from '@/write/members/domain/Member'

export class ArchiveMemberUseCase implements UseCase<ArchiveMemberCommand> {
  public constructor(
    private readonly uow: UnitOfWork,
    private readonly memberRepo: MemberRepoPort,
    private readonly eventRepo: EventRepoPort
  ) {}

  public async handle(dto: ArchiveMemberCommand): Promise<void> {
    await this.uow.execute(async () => {
      const existingMember = await this.memberRepo.findById(dto.memberId)
      if (!existingMember) {
        throw new MemberNotFoundError(dto.memberId)
      }

      const [archivedMember, archivedEvent] = existingMember.archive()

      await this.eventRepo.save(archivedEvent)
      await this.memberRepo.update(archivedMember)
    })
  }
}
