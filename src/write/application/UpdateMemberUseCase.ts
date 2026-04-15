import type { UseCase } from '@/write/application/UseCase'
import type { EventRepoPort } from '@/write/application/ports/EventRepoPort'
import type { MemberRepoPort } from '@/write/application/ports/MemberRepoPort'
import type { UnitOfWork } from '@/write/application/ports/UnitOfWork'
import type { UpdateMemberCommand } from '@/write/application/requests/UpdateMemberCommand'
import { MemberNotFoundError, Member } from '@/write/domain/model/Member'
import { PhoneNumber } from '@/write/domain/model/vo/PhoneNumber'

export class UpdateMemberUseCase implements UseCase<UpdateMemberCommand> {
  public constructor(
    private readonly uow: UnitOfWork,
    private readonly memberRepo: MemberRepoPort,
    private readonly eventRepo: EventRepoPort
  ) {}

  public async handle(dto: UpdateMemberCommand): Promise<void> {
    // Why: update commands can now clear optional fields, so the application layer must distinguish a blank phone from an invalid non-empty phone before the aggregate applies the change.
    const phoneNumber = this.normalizeOptionalPhoneNumber(dto.phoneNumber)

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

  private normalizeOptionalPhoneNumber(rawPhoneNumber: string | undefined) {
    const normalizedPhoneNumber = rawPhoneNumber?.trim()
    if (!normalizedPhoneNumber) {
      return undefined
    }

    // Why: updates should still reject malformed phone data whenever the user actually provides a number instead of intentionally clearing the field.
    return PhoneNumber.create(normalizedPhoneNumber)
  }
}
