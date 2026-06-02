import type { MemberRepoPort } from '@/write/application/ports/MemberRepoPort'
import { Member, type MemberSnapshot } from '@/write/domain/model/Member'
import type { TrainerNotebookDb } from '@/db'
import type { PersistedMember } from '@/write/infra'

export class DexieMemberRepo implements MemberRepoPort {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public async save(member: Member): Promise<void> {
    await this.database.members.add(this.toPersistedMember(member))
  }

  public async update(member: Member): Promise<void> {
    await this.database.members.put(this.toPersistedMember(member))
  }

  public async delete(memberId: string): Promise<void> {
    await this.database.members.delete(memberId)
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

  public async existsByNameAndBirthDate(
    firstName: string,
    lastName: string,
    dateOfBirth: Date
  ): Promise<boolean> {
    // Why: birth date now defines member identity at registration time, so offline duplicate checks need one indexed lookup that does not depend on optional phone data.
    const persistedMember = await this.database.members
      .where('[firstName+lastName+dateOfBirth]')
      .equals([firstName, lastName, dateOfBirth])
      .first()

    return persistedMember != null
  }

  private toPersistedMember(member: Member): PersistedMember {
    // Why: the persistence contract now matches the domain snapshot, so storage can preserve a real missing phone value instead of carrying an empty-string sentinel across offline reads.
    return member.toSnapshot()
  }

  private toMemberSnapshot(member: PersistedMember): MemberSnapshot {
    return {
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      ...(member.phoneNumber ? { phoneNumber: member.phoneNumber } : {}),
      dateOfBirth: member.dateOfBirth,
      ...(member.joinedAt === undefined ? {} : { joinedAt: member.joinedAt }),
      archived: member.archived ?? false,
      ...(member.archivedAt === undefined
        ? {}
        : { archivedAt: member.archivedAt }),
      createdAt: member.createdAt
    }
  }
}
