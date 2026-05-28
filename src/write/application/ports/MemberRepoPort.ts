import type { Member } from '@/write/domain/model/Member'

export interface MemberRepoPort {
  save(member: Member): Promise<void>
  update(member: Member): Promise<void>
  delete(memberId: string): Promise<void>
  findById(memberId: string): Promise<Member | null>
  existsById(memberId: string): Promise<boolean>
  existsByNameAndBirthDate(
    firstName: string,
    lastName: string,
    dateOfBirth: Date
  ): Promise<boolean>
}

export class FakeMemberRepo implements MemberRepoPort {
  public readonly savedMembers: Member[] = []
  public readonly updates: Member[] = []
  public readonly deletedMemberIds: string[] = []
  public readonly existsChecks: Array<{
    firstName: string
    lastName: string
    dateOfBirth: Date
  }> = []
  public readonly existsByIdChecks: string[] = []
  public existingIdentity:
    | {
        firstName: string
        lastName: string
        dateOfBirth: Date
      }
    | undefined
  public existingMemberIds = new Set<string>()
  public membersById = new Map<string, Member>()

  public seed(member: Member): void {
    this.membersById.set(member.id, member)
  }

  async save(member: Member): Promise<void> {
    this.savedMembers.push(member)
    this.membersById.set(member.id, member)
  }

  async update(member: Member): Promise<void> {
    this.updates.push(member)
    this.membersById.set(member.id, member)
  }

  async delete(memberId: string): Promise<void> {
    this.deletedMemberIds.push(memberId)
    this.membersById.delete(memberId)
  }

  async findById(memberId: string): Promise<Member | null> {
    return this.membersById.get(memberId) ?? null
  }

  async existsById(memberId: string): Promise<boolean> {
    this.existsByIdChecks.push(memberId)

    return (
      this.existingMemberIds.has(memberId) ||
      this.membersById.has(memberId) ||
      this.savedMembers.some((member) => member.id === memberId)
    )
  }

  async existsByNameAndBirthDate(
    firstName: string,
    lastName: string,
    dateOfBirth: Date
  ): Promise<boolean> {
    this.existsChecks.push({
      firstName,
      lastName,
      dateOfBirth: new Date(dateOfBirth.getTime())
    })

    return (
      (this.existingIdentity?.firstName === firstName &&
        this.existingIdentity?.lastName === lastName &&
        this.existingIdentity?.dateOfBirth.getTime() ===
          dateOfBirth.getTime()) ||
      this.savedMembers.some(
        (member) =>
          member.firstName === firstName &&
          member.lastName === lastName &&
          member.dateOfBirth.getTime() === dateOfBirth.getTime()
      )
    )
  }
}
