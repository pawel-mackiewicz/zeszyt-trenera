import type { PhoneNumber } from '@/domain/model/vo/PhoneNumber'
import type { Member } from '@/domain/model/member'

export interface MemberRepoPort {
  save(member: Member): Promise<void>
  update(member: Member): Promise<void>
  findById(memberId: string): Promise<Member | null>
  existsById(memberId: string): Promise<boolean>
  existsByNameAndPhone(
    firstName: string,
    lastName: string,
    phoneNumber: PhoneNumber
  ): Promise<boolean>
}
