import { computed, ref, type Ref } from 'vue'

import type { MembershipPaymentStatusMemberListItem } from '@/read/ObserveMembershipPaymentStatusByMonthQuery'
import { useAppServices } from '@/ui/appServices'
import {
  MembershipPaymentAlreadyExistsError,
  toMembershipPaymentCoveredMonth
} from '@/write/domain/model/MembershipPayment'
import type { MembershipPaymentFormatters } from './membershipPaymentFormatters'

type CoveredMonth = ReturnType<typeof toMembershipPaymentCoveredMonth>

export type ConfirmationErrorKey = 'submit' | null

export type PaymentFeedback = {
  kind: 'alreadyRecorded'
  memberName: string
  coveredMonthLabel: string
} | null

export type MembershipPaymentConfirmationMember = {
  attendanceCount: number
  ageLabel: string
  coveredMonthLabel: string
  memberName: string
}

type ConfirmPaymentTarget = MembershipPaymentStatusMemberListItem & {
  attendanceCount: number
  coveredMonth: CoveredMonth
  coveredMonthLabel: string
}

type RegisterMembershipPaymentOptions = {
  activeMonth: Ref<Date>
  formatters: MembershipPaymentFormatters
}

export function useRegisterMembershipPayment({
  activeMonth,
  formatters
}: RegisterMembershipPaymentOptions) {
  const { useCases } = useAppServices()
  const paymentFeedback = ref<PaymentFeedback>(null)
  const selectedMemberForConfirmation = ref<ConfirmPaymentTarget | null>(null)
  const confirmationErrorKey = ref<ConfirmationErrorKey>(null)
  const isConfirmingPayment = ref(false)

  const confirmationMember =
    computed<MembershipPaymentConfirmationMember | null>(() => {
      const selectedMember = selectedMemberForConfirmation.value

      if (selectedMember === null) {
        return null
      }

      return {
        attendanceCount: selectedMember.attendanceCount,
        ageLabel: formatters.formatAge(selectedMember),
        coveredMonthLabel: selectedMember.coveredMonthLabel,
        memberName: formatters.formatMemberName(selectedMember)
      }
    })

  function clearConfirmationDialog() {
    selectedMemberForConfirmation.value = null
    confirmationErrorKey.value = null
  }

  function closeConfirmationDialog() {
    if (isConfirmingPayment.value) {
      return
    }

    clearConfirmationDialog()
  }

  function dismissPaymentFeedback() {
    paymentFeedback.value = null
  }

  function dismissConfirmationError() {
    confirmationErrorKey.value = null
  }

  function openPaymentConfirmation(
    member: MembershipPaymentStatusMemberListItem,
    attendanceCount = 0
  ) {
    paymentFeedback.value = null
    confirmationErrorKey.value = null

    // What: snapshot the selected member with the visible month. Why: the dialog should confirm the exact application-layer write command even if the screen state changes afterward.
    selectedMemberForConfirmation.value = {
      ...member,
      attendanceCount,
      coveredMonth: toMembershipPaymentCoveredMonth(activeMonth.value),
      coveredMonthLabel: formatters.formatMonth(activeMonth.value)
    }
  }

  async function confirmPayment() {
    const selectedMember = selectedMemberForConfirmation.value

    if (!selectedMember) {
      return
    }

    isConfirmingPayment.value = true
    confirmationErrorKey.value = null

    try {
      await useCases.registerMembershipPayment.handle({
        memberId: selectedMember.id,
        coveredMonth: selectedMember.coveredMonth
      })

      clearConfirmationDialog()
    } catch (error) {
      if (error instanceof MembershipPaymentAlreadyExistsError) {
        paymentFeedback.value = {
          kind: 'alreadyRecorded',
          memberName: formatters.formatMemberName(selectedMember),
          coveredMonthLabel: selectedMember.coveredMonthLabel
        }
        clearConfirmationDialog()
      } else {
        confirmationErrorKey.value = 'submit'
      }
    } finally {
      isConfirmingPayment.value = false
    }
  }

  return {
    confirmationErrorKey,
    confirmationMember,
    confirmPayment,
    dismissConfirmationError,
    dismissPaymentFeedback,
    closeConfirmationDialog,
    isConfirmingPayment,
    openPaymentConfirmation,
    paymentFeedback,
    selectedMemberForConfirmation
  }
}
