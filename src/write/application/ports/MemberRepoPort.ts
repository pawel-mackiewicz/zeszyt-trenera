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
