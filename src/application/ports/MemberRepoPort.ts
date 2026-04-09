import type { Member } from '@/domain/model/member'

export interface MemberRepoPort {
  save(member: Member): Promise<void>
  update(member: Member): Promise<void>
  findById(memberId: string): Promise<Member | null>
  existsById(memberId: string): Promise<boolean>
  existsByNameAndBirthDate(
    firstName: string,
    lastName: string,
    dateOfBirth: Date
  ): Promise<boolean>
}
