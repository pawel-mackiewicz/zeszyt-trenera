import { inject, type InjectionKey } from 'vue'

import type {
  MembershipPaymentStatusMemberListItem,
  PaidMembershipPaymentStatusMemberListItem
} from '@/read/ObserveMembershipPaymentStatusByMonthQuery'

export type MembershipPaymentDisplayMember = {
  dateOfBirth: Date
  firstName: string
  lastName: string
}

export type MembershipPaymentActionContext = {
  isSendingReminderForMember(memberId: string): boolean
  openPaymentConfirmation(
    member: MembershipPaymentStatusMemberListItem,
    attendanceCount?: number
  ): void
  openPaymentDeletion(member: PaidMembershipPaymentStatusMemberListItem): void
  sendReminder(member: MembershipPaymentStatusMemberListItem): Promise<void>
}

export const membershipPaymentActionContextKey: InjectionKey<MembershipPaymentActionContext> =
  Symbol('membershipPaymentActionContext')

export function useMembershipPaymentActionContext(): MembershipPaymentActionContext {
  const context = inject(membershipPaymentActionContextKey)

  if (context === undefined) {
    throw new Error('Membership payment action context is missing.')
  }

  return context
}
