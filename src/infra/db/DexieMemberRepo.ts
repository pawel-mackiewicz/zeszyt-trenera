import type { MemberRepoPort } from '@/application/ports/MemberRepoPort'
import type { Member } from '@/domain/model/member'
import type { PersistedMember, TrainerNotebookDb } from '@/infra/db'

export class DexieMemberRepo implements MemberRepoPort {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public async save(member: Member): Promise<void> {
    await this.database.members.add(this.toPersistedMember(member))
  }

  public async existsByNameAndPhone(
    firstName: string,
    lastName: string,
    phoneNumber: string
  ): Promise<boolean> {
    // The local-first duplicate check needs one indexed identity lookup so offline registration stays cheap as the notebook grows.
    const persistedMember = await this.database.members
      .where('[firstName+lastName+phoneNumber]')
      .equals([firstName, lastName, phoneNumber])
      .first()

    return persistedMember != null
  }

  private toPersistedMember(member: Member): PersistedMember {
    return member.toSnapshot()
  }
}
