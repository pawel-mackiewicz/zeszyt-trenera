import type { MembershipPayment } from '@/write/domain/model/MembershipPayment'

export interface MembershipPaymentRepoPort {
  save(payment: MembershipPayment): Promise<void>
  findIdsByMemberId(memberId: string): Promise<string[]>
  existsByMemberIdAndCoveredMonth(
    memberId: string,
    coveredMonth: string
  ): Promise<boolean>
}
