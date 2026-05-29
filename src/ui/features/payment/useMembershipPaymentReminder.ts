import { ref, type Ref } from 'vue'

import type { MembershipPaymentStatusMemberListItem } from '@/read/ObserveMembershipPaymentStatusByMonthQuery'
import { useAppServices } from '@/ui/appServices'
import {
  MemberPhoneNumberMissingError,
  PaymentReminderSenderMissingError
} from '@/write/application/SendMembershipPaymentReminderUseCase'
import { MemberNotFoundError } from '@/write/domain/model/Member'
import { toMembershipPaymentCoveredMonth } from '@/write/domain/model/MembershipPayment'

type ReminderLocale = 'pl' | 'en'

export type ReminderErrorKey =
  | 'memberMissing'
  | 'phoneMissing'
  | 'senderMissing'
  | 'submit'
  | null

type MembershipPaymentReminderOptions = {
  activeMonth: Ref<Date>
  locale: Ref<string>
}

function resolveReminderLocale(value: string): ReminderLocale {
  return value.toLowerCase().startsWith('pl') ? 'pl' : 'en'
}

export function useMembershipPaymentReminder({
  activeMonth,
  locale
}: MembershipPaymentReminderOptions) {
  const { useCases } = useAppServices()
  const reminderErrorKey = ref<ReminderErrorKey>(null)
  const reminderInFlightMemberId = ref<string | null>(null)

  function dismissReminderError() {
    reminderErrorKey.value = null
  }

  function isSendingReminderForMember(memberId: string): boolean {
    return reminderInFlightMemberId.value === memberId
  }

  async function sendReminder(member: MembershipPaymentStatusMemberListItem) {
    if (isSendingReminderForMember(member.id)) {
      return
    }

    reminderErrorKey.value = null
    reminderInFlightMemberId.value = member.id

    try {
      // What: delegate SMS composition to the application use case. Why: the UI should not own sender identity or reminder-copy policy.
      await useCases.sendMembershipPaymentReminder.handle({
        memberId: member.id,
        coveredMonth: toMembershipPaymentCoveredMonth(activeMonth.value),
        locale: resolveReminderLocale(locale.value)
      })
    } catch (error) {
      if (error instanceof MemberNotFoundError) {
        reminderErrorKey.value = 'memberMissing'
      } else if (error instanceof MemberPhoneNumberMissingError) {
        reminderErrorKey.value = 'phoneMissing'
      } else if (error instanceof PaymentReminderSenderMissingError) {
        reminderErrorKey.value = 'senderMissing'
      } else {
        reminderErrorKey.value = 'submit'
      }
    } finally {
      reminderInFlightMemberId.value = null
    }
  }

  return {
    dismissReminderError,
    isSendingReminderForMember,
    reminderErrorKey,
    reminderInFlightMemberId,
    sendReminder
  }
}
