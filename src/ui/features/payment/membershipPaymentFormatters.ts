import type { Ref } from 'vue'

import type { MembershipPaymentStatusMemberListItem } from '@/read/ObserveMembershipPaymentStatusByMonthQuery'
import { calculateAge } from '@/ui/utils/age'

type MembershipPaymentTranslate = (
  key: string,
  named?: Record<string, number | string>
) => string

export type MembershipPaymentFormatters = ReturnType<
  typeof createMembershipPaymentFormatters
>

export function createMembershipPaymentFormatters({
  locale,
  t
}: {
  locale: Ref<string>
  t: MembershipPaymentTranslate
}) {
  function formatMonth(value: Date): string {
    return new Intl.DateTimeFormat(locale.value, {
      month: 'long',
      year: 'numeric'
    }).format(value)
  }

  function formatMemberName(
    member: MembershipPaymentStatusMemberListItem
  ): string {
    return `${member.firstName} ${member.lastName}`
  }

  function formatAge(member: MembershipPaymentStatusMemberListItem): string {
    return t('table.age', {
      age: calculateRequiredAge(member.dateOfBirth)
    })
  }

  return {
    formatAge,
    formatMemberName,
    formatMonth
  }
}

function calculateRequiredAge(dateOfBirth: Date, now = new Date()): number {
  const age = calculateAge(dateOfBirth, now)
  if (age === null) {
    // Why: when persisted data is malformed, falling back to zero keeps rendering stable while still making the issue obvious in the UI.
    return 0
  }

  return age
}
