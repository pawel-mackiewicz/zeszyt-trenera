import type { UseCase } from '@/application/UseCase'
import type { EventRepoPort } from '@/application/ports/EventRepoPort'
import type { IdGeneratorPort } from '@/application/ports/IdGeneratorPort'
import type { MemberRepoPort } from '@/application/ports/MemberRepoPort'
import type { PhoneNumberNormalizerPort } from '@/application/ports/PhoneNumberNormalizerPort'
import type { UnitOfWork } from '@/application/ports/UnitOfWork'
import type { RegisterMemberCommand } from '@/application/requests/RegisterMemberCommand'
import {
  InvalidMemberPhoneNumberError,
  Member,
  MemberAlreadyExistsError
} from '@/domain/model/member'

export class RegisterMemberUseCase implements UseCase<RegisterMemberCommand> {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly memberRepo: MemberRepoPort,
    private readonly eventRepo: EventRepoPort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly phoneNumberNormalizer: PhoneNumberNormalizerPort
  ) {}

  public async handle(dto: RegisterMemberCommand): Promise<void> {
    const normalizedPhoneNumber = this.getNormalizedPhoneNumber(dto.phoneNumber)

    await this.uow.execute(async () => {
      // The duplicate guard must share the same transaction as the write so a mobile double-submit cannot interleave two "member.created" commits offline.
      await this.ensureMemberDoesNotExist(
        dto.firstName,
        dto.lastName,
        normalizedPhoneNumber
      )

      const event = this.registerMember(dto, normalizedPhoneNumber)
      await this.memberRepo.save(event.member)
      await this.eventRepo.save(event)
    })
  }

  private getNormalizedPhoneNumber(phoneNumber: string): string {
    // The workflow normalizes user-facing formatting before the domain boundary so the aggregate only sees canonical E.164 data.
    const normalized =
      this.phoneNumberNormalizer.normalizeInternational(phoneNumber)

    if (normalized == null) {
      throw new InvalidMemberPhoneNumberError(phoneNumber)
    }

    return normalized
  }

  private async ensureMemberDoesNotExist(
    firstName: string,
    lastName: string,
    phoneNumber: string
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

  private registerMember(
    dto: RegisterMemberCommand,
    normalizedPhoneNumber: string
  ) {
    // The use case owns cross-boundary concerns like ID allocation and phone canonicalization so the aggregate stays infrastructure-agnostic.
    return Member.register(
      {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phoneNumber: normalizedPhoneNumber,
        dateOfBirth: dto.dateOfBirth,
        joinedAt: dto.joinedAt
      },
      this.idGenerator.generate()
    )
  }
}
