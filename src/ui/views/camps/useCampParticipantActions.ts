import { computed, onScopeDispose, ref, watch, type Ref } from 'vue'

import type { CampParticipantActionsContext } from '@/read/ObserveCampParticipantActionsContextQuery'
import { useAppServices } from '@/ui/appServices'
import type { MoneySnapshot } from '@/write/shared/vo/Money'

type ObservableSubscription = {
  unsubscribe(): void
}

type UseCampParticipantActionsOptions = {
  campId: Ref<string>
  participantId: Ref<string>
}

type AcceptResignationInput = {
  nonRefundableDepositValue?: MoneySnapshot
  refundedValue?: MoneySnapshot
}

export function useCampParticipantActions({
  campId,
  participantId
}: UseCampParticipantActionsOptions) {
  const { queries, useCases } = useAppServices()
  const actionsContext = ref<CampParticipantActionsContext | null>(null)
  const isLoading = ref(true)
  const isSubmitting = ref(false)
  const loadError = ref(false)
  const submitError = ref(false)
  let actionsSubscription: ObservableSubscription | null = null

  const notFound = computed(
    () => !isLoading.value && !loadError.value && actionsContext.value === null
  )

  function unsubscribeActionsContext() {
    actionsSubscription?.unsubscribe()
    actionsSubscription = null
  }

  function subscribeToActionsContext() {
    unsubscribeActionsContext()
    isLoading.value = true
    loadError.value = false

    actionsSubscription = queries.observeCampParticipantActionsContext
      .handle({
        campId: campId.value,
        participantId: participantId.value
      })
      .subscribe({
        next(nextContext) {
          actionsContext.value = nextContext
          isLoading.value = false
          loadError.value = false
        },
        error(error) {
          console.error('Failed to load camp participant actions', error)
          actionsContext.value = null
          isLoading.value = false
          loadError.value = true
        }
      })
  }

  function retryLoading() {
    subscribeToActionsContext()
  }

  async function runCommand(command: () => Promise<void>): Promise<boolean> {
    if (!campId.value || !participantId.value) {
      submitError.value = true
      return false
    }

    isSubmitting.value = true
    submitError.value = false

    try {
      await command()
      return true
    } catch (error) {
      console.error('Failed to update camp participant', error)
      submitError.value = true
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  function registerDiscount(amount: MoneySnapshot, reason?: string) {
    return runCommand(() =>
      useCases.registerCampParticipantDiscount.handle({
        amount,
        campId: campId.value,
        participantId: participantId.value,
        reason
      })
    )
  }

  function registerPayment(amount: MoneySnapshot, note?: string) {
    return runCommand(() =>
      useCases.registerCampParticipantPayment.handle({
        amount,
        campId: campId.value,
        note,
        participantId: participantId.value
      })
    )
  }

  function registerRefund(amount: MoneySnapshot, note?: string) {
    return runCommand(() =>
      useCases.registerCampParticipantRefund.handle({
        amount,
        campId: campId.value,
        note,
        participantId: participantId.value
      })
    )
  }

  function acceptResignation(input: AcceptResignationInput) {
    return runCommand(() =>
      useCases.acceptCampParticipantResignation.handle({
        campId: campId.value,
        nonRefundableDepositValue: input.nonRefundableDepositValue,
        participantId: participantId.value,
        refundedValue: input.refundedValue
      })
    )
  }

  function cancelResignation() {
    return runCommand(() =>
      useCases.cancelCampParticipantResignation.handle({
        campId: campId.value,
        participantId: participantId.value
      })
    )
  }

  function clearSubmitError() {
    submitError.value = false
  }

  watch([campId, participantId], subscribeToActionsContext, {
    immediate: true
  })

  onScopeDispose(() => {
    unsubscribeActionsContext()
  })

  return {
    acceptResignation,
    actionsContext,
    cancelResignation,
    clearSubmitError,
    isLoading,
    isSubmitting,
    loadError,
    notFound,
    registerDiscount,
    registerPayment,
    registerRefund,
    retryLoading,
    submitError
  }
}
