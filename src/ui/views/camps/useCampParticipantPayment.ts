import { computed, onScopeDispose, ref, watch, type Ref } from 'vue'

import type { CampParticipantPayment } from '@/read/ObserveCampParticipantPaymentQuery'
import { useAppServices } from '@/ui/appServices'

type ObservableSubscription = {
  unsubscribe(): void
}

type UseCampParticipantPaymentOptions = {
  campId: Ref<string>
  participantId: Ref<string>
}

export function useCampParticipantPayment({
  campId,
  participantId
}: UseCampParticipantPaymentOptions) {
  const { queries } = useAppServices()
  const payment = ref<CampParticipantPayment | null>(null)
  const isLoading = ref(true)
  const loadError = ref(false)
  let paymentSubscription: ObservableSubscription | null = null

  const notFound = computed(
    () => !isLoading.value && !loadError.value && payment.value === null
  )

  function unsubscribePayment() {
    paymentSubscription?.unsubscribe()
    paymentSubscription = null
  }

  function subscribeToPayment() {
    unsubscribePayment()
    isLoading.value = true
    loadError.value = false

    paymentSubscription = queries.observeCampParticipantPayment
      .handle({
        campId: campId.value,
        participantId: participantId.value
      })
      .subscribe({
        next(nextPayment) {
          payment.value = nextPayment
          isLoading.value = false
          loadError.value = false
        },
        error(error) {
          console.error('Failed to load camp participant payment', error)
          payment.value = null
          isLoading.value = false
          loadError.value = true
        }
      })
  }

  function retryLoading() {
    subscribeToPayment()
  }

  watch([campId, participantId], subscribeToPayment, {
    immediate: true
  })

  onScopeDispose(() => {
    unsubscribePayment()
  })

  return {
    isLoading,
    loadError,
    notFound,
    payment,
    retryLoading
  }
}
