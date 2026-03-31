import type { MembershipPaymentRepoPort } from '@/application/ports/MembershipPaymentRepoPort'
import type { MembershipPayment } from '@/domain/model/MembershipPayment'
import type { TrainerNotebookDb } from '@/db'
import type { PersistedMembershipPayment } from '@/infra'

export class DexieMembershipPaymentRepo implements MembershipPaymentRepoPort {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public async save(payment: MembershipPayment): Promise<void> {
    await this.database.membershipPayments.add(
      this.toPersistedMembershipPayment(payment)
    )
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

  private toPersistedMembershipPayment(
    payment: MembershipPayment
  ): PersistedMembershipPayment {
    return payment.toSnapshot()
  }
}
