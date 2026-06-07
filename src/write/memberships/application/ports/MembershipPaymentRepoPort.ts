import type { MembershipPayment } from '@/write/memberships/domain/MembershipPayment'

export interface MembershipPaymentRepoPort {
  save(payment: MembershipPayment): Promise<void>
  findById(membershipPaymentId: string): Promise<MembershipPayment | null>
  findIdsByMemberId(memberId: string): Promise<string[]>
  delete(membershipPaymentId: string): Promise<void>
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
  public readonly deletedPaymentIds: string[] = []
  public existingKeys = new Set<string>()
  public readonly idsByMemberId = new Map<string, string[]>()

  async save(payment: MembershipPayment): Promise<void> {
    this.savedPayments.push(payment)
  }

  async findById(
    membershipPaymentId: string
  ): Promise<MembershipPayment | null> {
    return (
      this.savedPayments.find(
        (payment) => payment.id === membershipPaymentId
      ) ?? null
    )
  }

  async findIdsByMemberId(memberId: string): Promise<string[]> {
    return this.idsByMemberId.get(memberId) ?? []
  }

  async delete(membershipPaymentId: string): Promise<void> {
    this.deletedPaymentIds.push(membershipPaymentId)
    const savedPaymentIndex = this.savedPayments.findIndex(
      (payment) => payment.id === membershipPaymentId
    )

    if (savedPaymentIndex >= 0) {
      this.savedPayments.splice(savedPaymentIndex, 1)
    }
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
