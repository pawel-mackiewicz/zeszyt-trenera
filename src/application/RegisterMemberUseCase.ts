import type { UseCase } from '@/application/UseCase'
import type { EventRepoPort } from '@/application/ports/EventRepoPort'
import type { IdGeneratorPort } from '@/application/ports/IdGeneratorPort'
import type { MemberRepoPort } from '@/application/ports/MemberRepoPort'
import type { UnitOfWork } from '@/application/ports/UnitOfWork'
import type { RegisterMemberCommand } from '@/application/requests/RegisterMemberCommand'
import { PhoneNumber } from '@/domain/model/vo/PhoneNumber'
import {
  Member,
  MemberAlreadyExistsError,
  normalizeMemberName
} from '@/domain/model/member'

export class RegisterMemberUseCase implements UseCase<RegisterMemberCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly memberRepo: MemberRepoPort,
    private readonly eventRepo: EventRepoPort,
    private readonly idGenerator: IdGeneratorPort
  ) {}

  public async handle(dto: RegisterMemberCommand): Promise<void> {
    // The use case resolves the value object once so the indexed duplicate check and stored snapshot both use the same canonical identity.
    const phoneNumber = PhoneNumber.create(dto.phoneNumber)

    await this.uow.execute(async () => {
      // The duplicate guard must share the same transaction as the write so a mobile double-submit cannot interleave two "member.created" commits offline.
      await this.ensureMemberDoesNotExist(
        normalizeMemberName(dto.firstName),
        normalizeMemberName(dto.lastName),
        phoneNumber
      )

      const [member, event] = this.registerMember(dto, phoneNumber)
      await this.memberRepo.save(member)
      await this.eventRepo.save(event)
    })
  }

  private async ensureMemberDoesNotExist(
    firstName: string,
    lastName: string,
    phoneNumber: PhoneNumber
  ): Promise<void> {
    // Member registration allows many records overall, but the duplicate identity rule must be checked from within the same transaction that persists the member and event.
    if (
      await this.memberRepo.existsByNameAndPhone(
        firstName,
        lastName,
        phoneNumber
      )
    ) {
      throw new MemberAlreadyExistsError()
    }
  }

  private registerMember(dto: RegisterMemberCommand, phoneNumber: PhoneNumber) {
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
}
