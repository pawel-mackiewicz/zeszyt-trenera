import { computed, onMounted, ref, watch, type Ref } from 'vue'

import type { CampParticipantDetails } from '@/read/GetCampParticipantDetailsQuery'
import { useAppServices } from '@/ui/appServices'
import type { MoneySnapshot } from '@/write/shared/vo/Money'

type UseCampParticipantDetailsOptions = {
  campId: Ref<string>
  participantId: Ref<string>
}

type AcceptResignationInput = {
  nonRefundableDepositValue?: MoneySnapshot
  refundedValue?: MoneySnapshot
}

export function useCampParticipantDetails({
  campId,
  participantId
}: UseCampParticipantDetailsOptions) {
  const { queries, useCases } = useAppServices()
  const details = ref<CampParticipantDetails | null>(null)
  const isLoading = ref(true)
  const isSubmitting = ref(false)
  const loadError = ref(false)
  const submitError = ref(false)
  let loadSequence = 0

  const camp = computed(() => details.value?.camp ?? null)
  const participant = computed<CampParticipantDetails['participant'] | null>(
    () => details.value?.participant ?? null
  )
  const notFound = computed(
    () =>
      !isLoading.value &&
      !loadError.value &&
      (details.value === null || participant.value === null)
  )

  async function reload() {
    const requestedCampId = campId.value
    const requestedParticipantId = participantId.value
    const currentLoad = ++loadSequence

    isLoading.value = true
    loadError.value = false

    try {
      const loadedDetails =
        requestedCampId && requestedParticipantId
          ? await queries.getCampParticipantDetails.handle({
              campId: requestedCampId,
              participantId: requestedParticipantId
            })
          : null

      if (currentLoad === loadSequence) {
        details.value = loadedDetails
      }
    } catch (error) {
      if (currentLoad === loadSequence) {
        console.error('Failed to load camp participant details', error)
        details.value = null
        loadError.value = true
      }
    } finally {
      if (currentLoad === loadSequence) {
        isLoading.value = false
      }
    }
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
      await reload()
      return true
    } catch (error) {
      console.error('Failed to update camp participant details', error)
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

  function clearSubmitError() {
    submitError.value = false
  }

  onMounted(() => {
    void reload()
  })

  watch([campId, participantId], () => {
    void reload()
  })

  return {
    acceptResignation,
    camp,
    clearSubmitError,
    isLoading,
    isSubmitting,
    loadError,
    notFound,
    participant,
    registerDiscount,
    registerPayment,
    reload,
    submitError
  }
}
