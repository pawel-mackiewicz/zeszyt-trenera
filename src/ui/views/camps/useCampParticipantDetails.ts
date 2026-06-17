import { computed, onScopeDispose, ref, watch, type Ref } from 'vue'

import type { CampParticipantDetails } from '@/read/ObserveCampParticipantDetailsQuery'
import { useAppServices } from '@/ui/appServices'

type ObservableSubscription = {
  unsubscribe(): void
}

type UseCampParticipantDetailsOptions = {
  campId: Ref<string>
  participantId: Ref<string>
}

export function useCampParticipantDetails({
  campId,
  participantId
}: UseCampParticipantDetailsOptions) {
  const { queries } = useAppServices()
  const details = ref<CampParticipantDetails | null>(null)
  const isLoading = ref(true)
  const loadError = ref(false)
  let detailsSubscription: ObservableSubscription | null = null

  const camp = computed(() => details.value?.camp ?? null)
  const participant = computed(() => details.value?.participant ?? null)
  const notFound = computed(
    () => !isLoading.value && !loadError.value && details.value === null
  )

  function unsubscribeDetails() {
    detailsSubscription?.unsubscribe()
    detailsSubscription = null
  }

  function subscribeToDetails() {
    unsubscribeDetails()
    isLoading.value = true
    loadError.value = false

    detailsSubscription = queries.observeCampParticipantDetails
      .handle({
        campId: campId.value,
        participantId: participantId.value
      })
      .subscribe({
        next(nextDetails) {
          details.value = nextDetails
          isLoading.value = false
          loadError.value = false
        },
        error(error) {
          console.error('Failed to load camp participant details', error)
          details.value = null
          isLoading.value = false
          loadError.value = true
        }
      })
  }

  function retryLoading() {
    subscribeToDetails()
  }

  watch([campId, participantId], subscribeToDetails, {
    immediate: true
  })

  onScopeDispose(() => {
    unsubscribeDetails()
  })

  return {
    camp,
    details,
    isLoading,
    loadError,
    notFound,
    participant,
    retryLoading
  }
}
