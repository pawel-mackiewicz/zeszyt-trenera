import { ref } from 'vue'

import { useAppServices } from '@/ui/appServices'
import { MembershipPaymentNotFoundError } from '@/write/domain/model/MembershipPayment'

export type DeletionErrorKey = 'missing' | 'submit' | null

export type DeleteMembershipPaymentCommand = {
  membershipPaymentId: string
}

export function useDeleteMembershipPayment() {
  const { useCases } = useAppServices()
  const errorKey = ref<DeletionErrorKey>(null)
  const isPending = ref(false)

  function dismissError() {
    errorKey.value = null
  }

  async function execute(
    command: DeleteMembershipPaymentCommand
  ): Promise<boolean> {
    if (isPending.value) {
      return false
    }

    isPending.value = true
    errorKey.value = null

    try {
      await useCases.deleteMembershipPayment.handle({
        membershipPaymentId: command.membershipPaymentId
      })

      return true
    } catch (error) {
      errorKey.value =
        error instanceof MembershipPaymentNotFoundError ? 'missing' : 'submit'
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
