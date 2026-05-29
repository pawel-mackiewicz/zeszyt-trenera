import { computed, ref, type Ref } from 'vue'

import type { PaidMembershipPaymentStatusMemberListItem } from '@/read/ObserveMembershipPaymentStatusByMonthQuery'
import { useAppServices } from '@/ui/appServices'
import { MembershipPaymentNotFoundError } from '@/write/domain/model/MembershipPayment'
import type { MembershipPaymentFormatters } from './membershipPaymentFormatters'

export type DeletionErrorKey = 'missing' | 'submit' | null

export type MembershipPaymentDeleteConfirmationMember = {
  ageLabel: string
  coveredMonthLabel: string
  memberName: string
}

type DeletePaymentTarget = PaidMembershipPaymentStatusMemberListItem & {
  coveredMonthLabel: string
}

type DeleteMembershipPaymentOptions = {
  activeMonth: Ref<Date>
  formatters: MembershipPaymentFormatters
}

export function useDeleteMembershipPayment({
  activeMonth,
  formatters
}: DeleteMembershipPaymentOptions) {
  const { useCases } = useAppServices()
  const selectedMemberForDeletion = ref<DeletePaymentTarget | null>(null)
  const deletionErrorKey = ref<DeletionErrorKey>(null)
  const isDeletingPayment = ref(false)

  const deletionMember =
    computed<MembershipPaymentDeleteConfirmationMember | null>(() => {
      const selectedMember = selectedMemberForDeletion.value

      if (selectedMember === null) {
        return null
      }

      return {
        ageLabel: formatters.formatAge(selectedMember),
        coveredMonthLabel: selectedMember.coveredMonthLabel,
        memberName: formatters.formatMemberName(selectedMember)
      }
    })

  function clearDeletionDialog() {
    selectedMemberForDeletion.value = null
    deletionErrorKey.value = null
  }

  function closeDeletionDialog() {
    if (isDeletingPayment.value) {
      return
    }

    clearDeletionDialog()
  }

  function dismissDeletionError() {
    deletionErrorKey.value = null
  }

  function openPaymentDeletion(
    member: PaidMembershipPaymentStatusMemberListItem
  ) {
    deletionErrorKey.value = null

    selectedMemberForDeletion.value = {
      ...member,
      coveredMonthLabel: formatters.formatMonth(activeMonth.value)
    }
  }

  async function deletePayment() {
    const selectedMember = selectedMemberForDeletion.value

    if (!selectedMember) {
      return
    }

    isDeletingPayment.value = true
    deletionErrorKey.value = null

    try {
      await useCases.deleteMembershipPayment.handle({
        membershipPaymentId: selectedMember.membershipPaymentId
      })

      clearDeletionDialog()
    } catch (error) {
      deletionErrorKey.value =
        error instanceof MembershipPaymentNotFoundError ? 'missing' : 'submit'
    } finally {
      isDeletingPayment.value = false
    }
  }

  return {
    deletePayment,
    deletionErrorKey,
    deletionMember,
    dismissDeletionError,
    closeDeletionDialog,
    isDeletingPayment,
    openPaymentDeletion,
    selectedMemberForDeletion
  }
}
