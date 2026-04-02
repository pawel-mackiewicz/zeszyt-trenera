import type { MemberRepoPort } from '@/application/ports/MemberRepoPort'
import { Member, type MemberSnapshot } from '@/domain/model/member'
import type { PhoneNumber } from '@/domain/model/vo/PhoneNumber'
import type { TrainerNotebookDb } from '@/db'
import type { PersistedMember } from '@/infra'

export class DexieMemberRepo implements MemberRepoPort {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public async save(member: Member): Promise<void> {
    await this.database.members.add(this.toPersistedMember(member))
  }

  public async update(member: Member): Promise<void> {
    await this.database.members.put(this.toPersistedMember(member))
  }

  public async findById(memberId: string): Promise<Member | null> {
    const persistedMember = await this.database.members.get(memberId)
    if (!persistedMember) return null

    return Member.rehydrate(this.toMemberSnapshot(persistedMember))
  }

  public async existsById(memberId: string): Promise<boolean> {
    // Membership payment registration only needs presence by primary key, so avoid loading a whole aggregate when checking an existing member offline.
    const persistedMember = await this.database.members.get(memberId)

    return persistedMember != null
  }

  public async existsByNameAndPhone(
    firstName: string,
    lastName: string,
    phoneNumber: PhoneNumber
  ): Promise<boolean> {
    // The local-first duplicate check needs one indexed identity lookup so offline registration stays cheap as the notebook grows.
    const persistedMember = await this.database.members
      .where('[firstName+lastName+phoneNumber]')
      .equals([firstName, lastName, phoneNumber.value])
      .first()

    return persistedMember != null
  }

  private toPersistedMember(member: Member): PersistedMember {
    return member.toSnapshot()
  }

  private toMemberSnapshot(member: PersistedMember): MemberSnapshot {
    return {
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      phoneNumber: member.phoneNumber,
      ...(member.dateOfBirth === undefined
        ? {}
        : { dateOfBirth: member.dateOfBirth }),
      ...(member.joinedAt === undefined ? {} : { joinedAt: member.joinedAt }),
      createdAt: member.createdAt
    }
  }
}
