import { ref } from 'vue'

import { useAppServices } from '@/ui/appServices'
import {
  MemberPhoneNumberMissingError,
  PaymentReminderSenderMissingError
} from '@/write/application/SendMembershipPaymentReminderUseCase'
import { MemberNotFoundError } from '@/write/domain/model/Member'
import { toMembershipPaymentCoveredMonth } from '@/write/domain/model/MembershipPayment'

type ReminderLocale = 'pl' | 'en'
type CoveredMonth = ReturnType<typeof toMembershipPaymentCoveredMonth>

export type ReminderErrorKey =
  | 'memberMissing'
  | 'phoneMissing'
  | 'senderMissing'
  | 'submit'
  | null

export type SendMembershipPaymentReminderCommand = {
  coveredMonth: CoveredMonth
  locale: string
  memberId: string
}

function resolveReminderLocale(value: string): ReminderLocale {
  return value.toLowerCase().startsWith('pl') ? 'pl' : 'en'
}

export function useMembershipPaymentReminder() {
  const { useCases } = useAppServices()
  const errorKey = ref<ReminderErrorKey>(null)
  const isPending = ref(false)

  function dismissError() {
    errorKey.value = null
  }

  async function execute(
    command: SendMembershipPaymentReminderCommand
  ): Promise<boolean> {
    if (isPending.value) {
      return false
    }

    errorKey.value = null
    isPending.value = true

    try {
      // What: delegate SMS composition to the application use case. Why: the UI should not own sender identity or reminder-copy policy.
      await useCases.sendMembershipPaymentReminder.handle({
        memberId: command.memberId,
        coveredMonth: command.coveredMonth,
        locale: resolveReminderLocale(command.locale)
      })

      return true
    } catch (error) {
      if (error instanceof MemberNotFoundError) {
        errorKey.value = 'memberMissing'
      } else if (error instanceof MemberPhoneNumberMissingError) {
        errorKey.value = 'phoneMissing'
      } else if (error instanceof PaymentReminderSenderMissingError) {
        errorKey.value = 'senderMissing'
      } else {
        errorKey.value = 'submit'
      }

      return false
    } finally {
      isPending.value = false
    }
  }

  return {
    dismissError,
    errorKey,
    execute,
    isPending
  }
}
