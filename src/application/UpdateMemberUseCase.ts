import type { UseCase } from '@/application/UseCase'
import type { EventRepoPort } from '@/application/ports/EventRepoPort'
import type { MemberRepoPort } from '@/application/ports/MemberRepoPort'
import type { UnitOfWork } from '@/application/ports/UnitOfWork'
import type { UpdateMemberCommand } from '@/application/requests/UpdateMemberCommand'
import { MemberNotFoundError, Member } from '@/domain/model/member'
import { PhoneNumber } from '@/domain/model/vo/PhoneNumber'

export class UpdateMemberUseCase implements UseCase<UpdateMemberCommand> {
  public constructor(
    private readonly uow: UnitOfWork,
    private readonly memberRepo: MemberRepoPort,
    private readonly eventRepo: EventRepoPort
  ) {}

  public async handle(dto: UpdateMemberCommand): Promise<void> {
    const phoneNumber = PhoneNumber.create(dto.phoneNumber)

    await this.uow.execute(async () => {
      const existingMember = await this.memberRepo.findById(dto.memberId)
      if (!existingMember) {
        throw new MemberNotFoundError(dto.memberId)
      }

      const [updatedMember, updatedEvent] = Member.update(existingMember, {
        memberId: dto.memberId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phoneNumber,
        dateOfBirth: dto.dateOfBirth,
        joinedAt: dto.joinedAt
      })

      await this.eventRepo.save(updatedEvent)
      await this.memberRepo.update(updatedMember)
    })
  }
}
