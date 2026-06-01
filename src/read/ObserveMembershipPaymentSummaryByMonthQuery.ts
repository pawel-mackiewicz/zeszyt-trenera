import { liveQuery, type Observable } from 'dexie'

import type { TrainerNotebookDb } from '@/db'
import type { PersistedMembershipPayment } from '@/write/infra'
import { toMembershipPaymentCoveredMonth } from '@/write/domain/model/MembershipPayment'
import type { MoneySnapshot } from '@/write/domain/model/vo/Money'

type PersistedMembershipPaymentWithAmount = PersistedMembershipPayment & {
  chargedAmount?: MoneySnapshot | null
}

export type MembershipPaymentSummaryByMonthResult = {
  paidMembersCount: number
  unpaidMembersCount: number
  totalPaidAmount: MoneySnapshot | null
}

export type ObserveMembershipPaymentSummaryByMonthQueryInput = {
  month: Date
}

export class ObserveMembershipPaymentSummaryByMonthQuery {
  public constructor(private readonly database: TrainerNotebookDb) {}

  public handle({
    month
  }: ObserveMembershipPaymentSummaryByMonthQueryInput): Observable<MembershipPaymentSummaryByMonthResult> {
    const monthStart = startOfMonth(month)
    const coveredMonth = toMembershipPaymentCoveredMonth(monthStart)

    return liveQuery(async () => {
      const [members, persistedPayments] = await Promise.all([
        this.database.members.toArray(),
        this.database.membershipPayments
          .where('coveredMonth')
          .equals(coveredMonth)
          .toArray()
      ])

      const paymentByMemberId = new Map(
        (persistedPayments as PersistedMembershipPaymentWithAmount[]).map(
          (payment) => [payment.memberId, payment]
        )
      )

      let totalPaidAmount: MoneySnapshot | null = null

      for (const payment of paymentByMemberId.values()) {
        const chargedAmount = payment.chargedAmount

        if (!chargedAmount) {
          continue
        }

        totalPaidAmount = totalPaidAmount
          ? addMoneySnapshots(totalPaidAmount, chargedAmount)
          : { ...chargedAmount }
      }

      const paidMembersCount = paymentByMemberId.size

      return {
        paidMembersCount,
        unpaidMembersCount: members.length - paidMembersCount,
        totalPaidAmount
      }
    })
  }
}

function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1)
}

function addMoneySnapshots(
  left: MoneySnapshot,
  right: MoneySnapshot
): MoneySnapshot {
  if (left.currency !== right.currency) {
    throw new Error(
      `Cannot total membership payments in different currencies: ${left.currency} and ${right.currency}`
    )
  }

  return {
    amountMinor: left.amountMinor + right.amountMinor,
    currency: left.currency
  }
}
