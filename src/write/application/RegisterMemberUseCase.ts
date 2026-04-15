import type { UseCase } from '@/write/application/UseCase'
import type { EventRepoPort } from '@/write/application/ports/EventRepoPort'
import type { IdGeneratorPort } from '@/write/application/ports/IdGeneratorPort'
import type { MemberRepoPort } from '@/write/application/ports/MemberRepoPort'
import type { UnitOfWork } from '@/write/application/ports/UnitOfWork'
import type { RegisterMemberCommand } from '@/write/application/requests/RegisterMemberCommand'
import { PhoneNumber } from '@/write/domain/model/vo/PhoneNumber'
import { Member, MemberAlreadyExistsError } from '@/write/domain/model/Member'

export class RegisterMemberUseCase implements UseCase<RegisterMemberCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly memberRepo: MemberRepoPort,
    private readonly eventRepo: EventRepoPort,
    private readonly idGenerator: IdGeneratorPort
  ) {}

  public async handle(dto: RegisterMemberCommand): Promise<void> {
    // Why: the application layer owns the raw command shape, so optional phone input must be normalized here before the domain sees either a canonical value or an intentional absence.
    const phoneNumber = this.normalizeOptionalPhoneNumber(dto.phoneNumber)

    await this.uow.execute(async () => {
      const [member, event] = this.registerMember(dto, phoneNumber)
      // The duplicate guard must share the same transaction as the write so a mobile double-submit cannot interleave two "member.created" commits offline.
      await this.ensureMemberDoesNotExist(
        member.firstName,
        member.lastName,
        dto.dateOfBirth
      )

      await this.memberRepo.save(member)
      await this.eventRepo.save(event)
    })
  }

  private async ensureMemberDoesNotExist(
    firstName: string,
    lastName: string,
    dateOfBirth: Date
  ): Promise<void> {
    // Why: the registration contract now guarantees birth date, so duplicate checks can use the required identity key directly instead of carrying legacy optional-member typing through the write path.
    if (
      await this.memberRepo.existsByNameAndBirthDate(
        firstName,
        lastName,
        dateOfBirth
      )
    ) {
      throw new MemberAlreadyExistsError()
    }
  }

  private registerMember(
    dto: RegisterMemberCommand,
    phoneNumber: PhoneNumber | undefined
  ) {
    // The use case owns cross-boundary concerns like ID allocation and phone canonicalization so the aggregate stays focused on member rules while the event log receives the same immutable snapshot that persistence stores.
    return Member.register(
      {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phoneNumber,
        dateOfBirth: dto.dateOfBirth,
        joinedAt: dto.joinedAt
      },
      this.idGenerator.generate()
    )
  }

  private normalizeOptionalPhoneNumber(
    rawPhoneNumber: string | null | undefined
  ) {
    const normalizedPhoneNumber = rawPhoneNumber?.trim()
    if (!normalizedPhoneNumber) {
      return undefined
    }

    // Why: non-empty phone input still has to cross the same canonicalization boundary so duplicate checks and persisted snapshots keep one identity format.
    return PhoneNumber.create(normalizedPhoneNumber)
  }
}
