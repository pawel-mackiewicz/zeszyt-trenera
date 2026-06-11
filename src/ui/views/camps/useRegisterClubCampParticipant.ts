import { computed, onMounted, ref, watch, type Ref } from 'vue'

import {
  CampNotFoundForParticipantRegistrationError,
  CampParticipantAlreadyRegisteredError
} from '@/write/camps/application/RegisterCampParticipantUseCase'
import type { ClubCampParticipantRegistrationContext } from '@/read/GetClubCampParticipantRegistrationContextQuery'
import { useAppServices } from '@/ui/appServices'
import type { MoneySnapshot } from '@/write/shared/vo/Money'

export type RegisterClubCampParticipantErrorKey =
  | 'alreadySigned'
  | 'invalidDiscount'
  | 'invalidPayment'
  | 'load'
  | 'missingContext'
  | 'submit'

type UseRegisterClubCampParticipantOptions = {
  campId: Ref<string>
  memberId: Ref<string>
}

export function useRegisterClubCampParticipant({
  campId,
  memberId
}: UseRegisterClubCampParticipantOptions) {
  const { queries, useCases } = useAppServices()
  const context = ref<ClubCampParticipantRegistrationContext | null>(null)
  const isLoading = ref(true)
  const isSubmitting = ref(false)
  const loadError = ref(false)
  const submitErrorKey = ref<RegisterClubCampParticipantErrorKey | null>(null)
  const discountEnabled = ref(false)
  const discountAmount = ref('')
  const paymentEnabled = ref(false)
  const paymentAmount = ref('')
  let loadSequence = 0

  const paymentPreview = computed<{
    amountYetToPay: MoneySnapshot
    overpaymentAmount: MoneySnapshot | null
  } | null>(() => {
    if (!context.value) {
      return null
    }

    const price = context.value.camp.price
    const discountMinor = discountEnabled.value
      ? (parsePositiveMoney(discountAmount.value, price.currency)
          ?.amountMinor ?? 0)
      : 0
    const paymentMinor = paymentEnabled.value
      ? (parsePositiveMoney(paymentAmount.value, price.currency)?.amountMinor ??
        0)
      : 0
    const amountYetToPayMinor = Math.max(
      price.amountMinor - discountMinor - paymentMinor,
      0
    )
    const overpaymentMinor = Math.max(
      discountMinor + paymentMinor - price.amountMinor,
      0
    )

    return {
      amountYetToPay: {
        amountMinor: amountYetToPayMinor,
        currency: price.currency
      },
      overpaymentAmount:
        overpaymentMinor > 0
          ? {
              amountMinor: overpaymentMinor,
              currency: price.currency
            }
          : null
    }
  })
  const amountYetToPay = computed(
    () => paymentPreview.value?.amountYetToPay ?? null
  )
  const overpaymentAmount = computed(
    () => paymentPreview.value?.overpaymentAmount ?? null
  )
  const submitError = computed(() => submitErrorKey.value)

  async function reload() {
    const requestedCampId = campId.value
    const requestedMemberId = memberId.value
    const currentLoad = ++loadSequence

    isLoading.value = true
    loadError.value = false
    submitErrorKey.value = null

    try {
      const loadedContext =
        requestedCampId && requestedMemberId
          ? await queries.getClubCampParticipantRegistrationContext.handle({
              campId: requestedCampId,
              memberId: requestedMemberId
            })
          : null

      if (currentLoad === loadSequence) {
        context.value = loadedContext
        loadError.value = loadedContext === null
      }
    } catch (error) {
      if (currentLoad === loadSequence) {
        console.error(
          'Failed to load club camp participant registration context',
          error
        )
        context.value = null
        loadError.value = true
      }
    } finally {
      if (currentLoad === loadSequence) {
        isLoading.value = false
      }
    }
  }

  function dismissSubmitError() {
    submitErrorKey.value = null
  }

  async function submit(): Promise<boolean> {
    submitErrorKey.value = null

    if (!context.value) {
      submitErrorKey.value = 'missingContext'
      return false
    }

    const initialDiscount = discountEnabled.value
      ? parsePositiveMoney(
          discountAmount.value,
          context.value.camp.price.currency
        )
      : null
    const initialPayment = paymentEnabled.value
      ? parsePositiveMoney(
          paymentAmount.value,
          context.value.camp.price.currency
        )
      : null

    if (discountEnabled.value && initialDiscount === null) {
      submitErrorKey.value = 'invalidDiscount'
      return false
    }

    if (paymentEnabled.value && initialPayment === null) {
      submitErrorKey.value = 'invalidPayment'
      return false
    }

    isSubmitting.value = true

    try {
      await useCases.registerCampParticipant.handle({
        campId: context.value.camp.id,
        person: {
          type: 'club',
          memberId: context.value.member.id
        },
        totalAmountDue: context.value.camp.price,
        ...(initialDiscount
          ? { initialDiscount: { amount: initialDiscount } }
          : {}),
        ...(initialPayment
          ? { initialPayment: { amount: initialPayment } }
          : {})
      })

      return true
    } catch (error) {
      submitErrorKey.value = resolveSubmitErrorKey(error)
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  onMounted(() => {
    void reload()
  })

  watch([campId, memberId], () => {
    void reload()
  })

  return {
    amountYetToPay,
    context,
    discountAmount,
    discountEnabled,
    dismissSubmitError,
    isLoading,
    isSubmitting,
    loadError,
    overpaymentAmount,
    paymentAmount,
    paymentEnabled,
    reload,
    submit,
    submitError
  }
}

function parsePositiveMoney(
  value: string,
  currency: string
): MoneySnapshot | null {
  const normalizedValue = value.trim().replace(/\s/g, '').replace(',', '.')

  if (!/^\d+(\.\d{1,2})?$/.test(normalizedValue)) {
    return null
  }

  const [majorPart, minorPart = ''] = normalizedValue.split('.')
  const amountMinor = Number(majorPart) * 100 + Number(minorPart.padEnd(2, '0'))

  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    return null
  }

  return {
    amountMinor,
    currency
  }
}

function resolveSubmitErrorKey(
  error: unknown
): RegisterClubCampParticipantErrorKey {
  if (error instanceof CampParticipantAlreadyRegisteredError) {
    return 'alreadySigned'
  }

  if (error instanceof CampNotFoundForParticipantRegistrationError) {
    return 'missingContext'
  }

  return 'submit'
}
