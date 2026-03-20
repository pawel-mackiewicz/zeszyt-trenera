import type { MembershipPayment } from '@/domain/model/MembershipPayment'

export interface MembershipPaymentRepoPort {
  save(payment: MembershipPayment): Promise<void>
  existsByMemberIdAndCoveredMonth(
    memberId: string,
    coveredMonth: string
  ): Promise<boolean>
}
