import type { MembershipPaymentRepoPort } from '@/write/memberships/application/ports/MembershipPaymentRepoPort'
import { MembershipPayment } from '@/write/memberships/domain/MembershipPayment'
import type { TrainerNotebookDb } from '@/db'
import type { PersistedMembershipPayment } from '@/write/shared/infra'

export class DexieMembershipPaymentRepo implements MembershipPaymentRepoPort {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public async save(payment: MembershipPayment): Promise<void> {
    await this.database.membershipPayments.add(
      this.toPersistedMembershipPayment(payment)
    )
  }

  public async findById(
    membershipPaymentId: string
  ): Promise<MembershipPayment | null> {
    const persistedPayment =
      await this.database.membershipPayments.get(membershipPaymentId)

    return persistedPayment ? MembershipPayment.restore(persistedPayment) : null
  }

  public async findIdsByMemberId(memberId: string): Promise<string[]> {
    const paymentIds = await this.database.membershipPayments
      .where('memberId')
      .equals(memberId)
      .primaryKeys()

    return paymentIds
      .map(String)
      .sort((left, right) => left.localeCompare(right))
  }

  public async existsByMemberIdAndCoveredMonth(
    memberId: string,
    coveredMonth: string
  ): Promise<boolean> {
    // The compound month key keeps duplicate-payment checks fast offline without scanning the full payment history on a phone.
    const persistedPayment = await this.database.membershipPayments
      .where('[memberId+coveredMonth]')
      .equals([memberId, coveredMonth])
      .first()

    return persistedPayment != null
  }

  public async delete(membershipPaymentId: string): Promise<void> {
    await this.database.membershipPayments.delete(membershipPaymentId)
  }

  private toPersistedMembershipPayment(
    payment: MembershipPayment
  ): PersistedMembershipPayment {
    return payment.toSnapshot()
  }
}
