import { liveQuery, type Observable } from 'dexie'

import type { TrainerNotebookDb } from '@/db'
import { toMembershipPaymentCoveredMonth } from '@/domain/model/MembershipPayment'

export type MembershipPaymentStatusMemberListItem = {
  id: string
  firstName: string
  lastName: string
  dateOfBirth?: Date
}

export type UnpaidAttendedMembershipPaymentStatusMemberListItem =
  MembershipPaymentStatusMemberListItem & {
    attendanceSessionIds: string[]
  }

export type MembershipPaymentStatusByMonthResult = {
  paidMembers: MembershipPaymentStatusMemberListItem[]
  unpaidAbsentMembers: MembershipPaymentStatusMemberListItem[]
  unpaidAttendedMembers: UnpaidAttendedMembershipPaymentStatusMemberListItem[]
}

export type ObserveMembershipPaymentStatusByMonthQueryInput = {
  month: Date
}

export class ObserveMembershipPaymentStatusByMonthQuery {
  public constructor(private readonly database: TrainerNotebookDb) {}

  /**
   * Returns a live monthly membership-payment breakdown.
   *
   * Why: the payments screen needs a single observable source of truth so it can stay in sync with offline writes without coordinating separate subscriptions.
   */
  public handle({
    month
  }: ObserveMembershipPaymentStatusByMonthQueryInput): Observable<MembershipPaymentStatusByMonthResult> {
    const monthStart = startOfMonth(month)
    const nextMonthStart = addMonths(monthStart, 1)
    const coveredMonth = toMembershipPaymentCoveredMonth(monthStart)

    // What: expose the monthly payment ledger as a Dexie observable. Why: the payments screen should react to offline writes without rebuilding its own database watchers.
    return liveQuery(async () => {
      const [members, persistedPayments, persistedAttendanceLists] =
        await Promise.all([
          this.database.members.toArray(),
          // What: scope payment reads to one covered month. Why: each reactive recalculation should touch only the rows that can move a member between the three monthly buckets.
          this.database.membershipPayments
            .where('coveredMonth')
            .equals(coveredMonth)
            .toArray(),
          this.database.attendanceLists
            .where('start')
            .between(monthStart, nextMonthStart, true, false)
            .toArray()
        ])

      const paidMemberIds = new Set(
        persistedPayments.map((payment) => payment.memberId)
      )
      const attendanceSessionIdsByMemberId = new Map<string, string[]>()

      for (const attendanceList of persistedAttendanceLists) {
        for (const memberId of attendanceList.memberIds) {
          const attendanceSessionIds =
            attendanceSessionIdsByMemberId.get(memberId)

          if (attendanceSessionIds) {
            attendanceSessionIds.push(attendanceList.id)
            continue
          }

          attendanceSessionIdsByMemberId.set(memberId, [attendanceList.id])
        }
      }

      const result: MembershipPaymentStatusByMonthResult = {
        paidMembers: [],
        unpaidAbsentMembers: [],
        unpaidAttendedMembers: []
      }

      for (const member of members) {
        const listItem = {
          id: member.id,
          firstName: member.firstName,
          lastName: member.lastName,
          dateOfBirth: member.dateOfBirth
        }

        if (paidMemberIds.has(member.id)) {
          result.paidMembers.push(listItem)
          continue
        }

        const attendanceSessionIds = attendanceSessionIdsByMemberId.get(
          member.id
        )

        if (attendanceSessionIds && attendanceSessionIds.length > 0) {
          result.unpaidAttendedMembers.push({
            ...listItem,
            attendanceSessionIds: [...attendanceSessionIds]
          })
          continue
        }

        result.unpaidAbsentMembers.push(listItem)
      }

      return result
    })
  }
}

/**
 * Returns the first day of the month for a date.
 *
 * Why: month-based read models need a stable lower bound so queries can stay aligned with the same covered month across repeated recalculations.
 */
function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1)
}

/**
 * Returns the first day of the month after an offset.
 *
 * Why: the query uses an exclusive upper bound, and month arithmetic must stay normalized to day one to avoid drifting into partial-day ranges.
 */
function addMonths(value: Date, offset: number): Date {
  return new Date(value.getFullYear(), value.getMonth() + offset, 1)
}
