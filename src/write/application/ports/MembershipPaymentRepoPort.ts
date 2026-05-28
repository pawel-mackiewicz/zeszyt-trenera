import type { MembershipPayment } from '@/write/domain/model/MembershipPayment'

export interface MembershipPaymentRepoPort {
  save(payment: MembershipPayment): Promise<void>
  findIdsByMemberId(memberId: string): Promise<string[]>
  existsByMemberIdAndCoveredMonth(
    memberId: string,
    coveredMonth: string
  ): Promise<boolean>
}

export class FakeMembershipPaymentRepo implements MembershipPaymentRepoPort {
  public readonly savedPayments: MembershipPayment[] = []
  public readonly existsChecks: Array<{
    memberId: string
    coveredMonth: string
  }> = []
  public existingKeys = new Set<string>()
  public readonly idsByMemberId = new Map<string, string[]>()

  async save(payment: MembershipPayment): Promise<void> {
    this.savedPayments.push(payment)
  }

  async findIdsByMemberId(memberId: string): Promise<string[]> {
    return this.idsByMemberId.get(memberId) ?? []
  }

  async existsByMemberIdAndCoveredMonth(
    memberId: string,
    coveredMonth: string
  ): Promise<boolean> {
    this.existsChecks.push({
      memberId,
      coveredMonth
    })

    const key = `${memberId}::${coveredMonth}`

    return (
      this.existingKeys.has(key) ||
      this.savedPayments.some(
        (payment) =>
          payment.memberId === memberId && payment.coveredMonth === coveredMonth
      )
    )
  }
}
