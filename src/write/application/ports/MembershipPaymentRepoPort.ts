import type { MembershipPayment } from '@/write/domain/model/MembershipPayment'

export interface MembershipPaymentRepoPort {
  save(payment: MembershipPayment): Promise<void>
  existsByMemberIdAndCoveredMonth(
    memberId: string,
    coveredMonth: string
  ): Promise<boolean>
}
