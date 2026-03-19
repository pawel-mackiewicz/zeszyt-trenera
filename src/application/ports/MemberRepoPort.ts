import type { Member } from '@/domain/model/member'

export interface MemberRepoPort {
  save(member: Member): Promise<void>
  existsByNameAndPhone(
    firstName: string,
    lastName: string,
    phoneNumber: string
  ): Promise<boolean>
}
