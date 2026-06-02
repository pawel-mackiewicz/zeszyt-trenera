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
  attendedUnpaidMembersCount: number
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
    const nextMonthStart = addMonths(monthStart, 1)
    const coveredMonth = toMembershipPaymentCoveredMonth(monthStart)

    return liveQuery(async () => {
      const [members, persistedPayments, persistedAttendanceLists] =
        await Promise.all([
          this.database.members.toArray(),
          this.database.membershipPayments
            .where('coveredMonth')
            .equals(coveredMonth)
            .toArray(),
          this.database.attendanceLists
            .where('start')
            .between(monthStart, nextMonthStart, true, false)
            .toArray()
        ])

      const activeMembers = members.filter((member) => member.archived !== true)
      const activeMemberIds = new Set(activeMembers.map((member) => member.id))
      const paymentByMemberId = new Map(
        (persistedPayments as PersistedMembershipPaymentWithAmount[])
          .filter((payment) => activeMemberIds.has(payment.memberId))
          .map((payment) => [payment.memberId, payment])
      )
      const attendanceSessionIdsByMemberId = new Map<string, string[]>()

      for (const attendanceList of persistedAttendanceLists) {
        for (const memberId of attendanceList.memberIds) {
          if (!activeMemberIds.has(memberId)) {
            continue
          }

          const attendanceSessionIds =
            attendanceSessionIdsByMemberId.get(memberId)

          if (attendanceSessionIds) {
            attendanceSessionIds.push(attendanceList.id)
            continue
          }

          attendanceSessionIdsByMemberId.set(memberId, [attendanceList.id])
        }
      }

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

      let attendedUnpaidMembersCount = 0

      for (const member of activeMembers) {
        if (paymentByMemberId.has(member.id)) {
          continue
        }

        const attendanceSessionIds = attendanceSessionIdsByMemberId.get(
          member.id
        )

        if (!attendanceSessionIds || attendanceSessionIds.length === 0) {
          continue
        }

        attendedUnpaidMembersCount += 1
      }

      return {
        paidMembersCount: paymentByMemberId.size,
        attendedUnpaidMembersCount,
        totalPaidAmount
      }
    })
  }
}

function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1)
}

function addMonths(value: Date, offset: number): Date {
  return new Date(value.getFullYear(), value.getMonth() + offset, 1)
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
