import { ref } from 'vue'

import { useAppServices } from '@/ui/appServices'
import type { MoneySnapshot } from '@/write/domain/model/vo/Money'
import {
  MembershipPaymentAlreadyExistsError,
  toMembershipPaymentCoveredMonth
} from '@/write/domain/model/MembershipPayment'

type CoveredMonth = ReturnType<typeof toMembershipPaymentCoveredMonth>

export type ConfirmationErrorKey = 'submit' | null

export type PaymentFeedback = {
  kind: 'alreadyRecorded'
} | null

export type RegisterMembershipPaymentCommand = {
  chargedAmount: MoneySnapshot
  coveredMonth: CoveredMonth
  memberId: string
}

export function useRegisterMembershipPayment() {
  const { useCases } = useAppServices()
  const errorKey = ref<ConfirmationErrorKey>(null)
  const isPending = ref(false)
  const paymentFeedback = ref<PaymentFeedback>(null)

  function dismissError() {
    errorKey.value = null
  }

  function dismissFeedback() {
    paymentFeedback.value = null
  }

  async function execute(
    command: RegisterMembershipPaymentCommand
  ): Promise<boolean> {
    if (isPending.value) {
      return false
    }

    isPending.value = true
    errorKey.value = null
    paymentFeedback.value = null

    try {
      await useCases.registerMembershipPayment.handle({
        memberId: command.memberId,
        coveredMonth: command.coveredMonth,
        chargedAmount: command.chargedAmount
      })

      return true
    } catch (error) {
      if (error instanceof MembershipPaymentAlreadyExistsError) {
        paymentFeedback.value = {
          kind: 'alreadyRecorded'
        }
        return true
      }

      errorKey.value = 'submit'
      return false
    } finally {
      isPending.value = false
    }
  }

  return {
    dismissError,
    dismissFeedback,
    errorKey,
    execute,
    feedback: paymentFeedback,
    isPending
  }
}
