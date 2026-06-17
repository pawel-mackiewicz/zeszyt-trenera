import {
  computed,
  onMounted,
  ref,
  shallowRef,
  watch,
  type ComputedRef,
  type Ref,
  type WatchSource
} from 'vue'

import type { RegisterCampParticipantCommand } from '@/write/camps/application/requests/RegisterCampParticipantCommand'
import {
  CampNotFoundForParticipantRegistrationError,
  CampParticipantAlreadyRegisteredError
} from '@/write/camps/application/RegisterCampParticipantUseCase'
import {
  CampParticipantDiscountExceedsAmountDueError,
  CampParticipantPaymentExceedsRemainingAmountError,
  type CampParticipantPerson
} from '@/write/camps/domain/CampParticipant'
import { useAppServices } from '@/ui/appServices'
import type { MoneySnapshot } from '@/write/shared/vo/Money'

export type CampParticipantRegistrationBaseErrorKey =
  | 'alreadySigned'
  | 'invalidDiscount'
  | 'invalidPayment'
  | 'load'
  | 'missingContext'
  | 'overpayment'
  | 'submit'

type CampParticipantRegistrationContext = {
  camp: {
    id: string
    price: MoneySnapshot
  }
}

type CreateCampParticipantResult<ErrorKey extends string> =
  | {
      person: CampParticipantPerson
    }
  | {
      errorKey: ErrorKey
    }

type UseCampParticipantRegistrationOptions<
  Context extends CampParticipantRegistrationContext,
  ErrorKey extends string
> = {
  createPerson: (context: Context) => CreateCampParticipantResult<ErrorKey>
  loadContext: () => Promise<Context | null>
  loadErrorMessage: string
  watchSources: WatchSource | WatchSource[]
}

export type UseCampParticipantRegistrationResult<
  Context extends CampParticipantRegistrationContext,
  ErrorKey extends string
> = {
  amountYetToPay: ComputedRef<MoneySnapshot | null>
  context: Ref<Context | null>
  discountAmount: Ref<string>
  discountEnabled: Ref<boolean>
  dismissSubmitError: () => void
  isLoading: Ref<boolean>
  isSubmitting: Ref<boolean>
  loadError: Ref<boolean>
  overpaymentAmount: ComputedRef<MoneySnapshot | null>
  paymentAmount: Ref<string>
  paymentEnabled: Ref<boolean>
  reload: () => Promise<void>
  submit: () => Promise<boolean>
  submitError: ComputedRef<ErrorKey | null>
}

export function useCampParticipantRegistration<
  Context extends CampParticipantRegistrationContext,
  ErrorKey extends string
>({
  createPerson,
  loadContext,
  loadErrorMessage,
  watchSources
}: UseCampParticipantRegistrationOptions<
  Context,
  ErrorKey
>): UseCampParticipantRegistrationResult<Context, ErrorKey> {
  const { useCases } = useAppServices()
  const context = shallowRef<Context | null>(null) as Ref<Context | null>
  const isLoading = ref(true)
  const isSubmitting = ref(false)
  const loadError = ref(false)
  const submitErrorKey = ref<ErrorKey | null>(null)
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
    const currentLoad = ++loadSequence

    isLoading.value = true
    loadError.value = false
    submitErrorKey.value = null

    try {
      const loadedContext = await loadContext()

      if (currentLoad === loadSequence) {
        context.value = loadedContext
        loadError.value = loadedContext === null
      }
    } catch (error) {
      if (currentLoad === loadSequence) {
        console.error(loadErrorMessage, error)
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
      submitErrorKey.value = 'missingContext' as ErrorKey
      return false
    }

    const personResult = createPerson(context.value)

    if ('errorKey' in personResult) {
      submitErrorKey.value = personResult.errorKey
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
      submitErrorKey.value = 'invalidDiscount' as ErrorKey
      return false
    }

    if (paymentEnabled.value && initialPayment === null) {
      submitErrorKey.value = 'invalidPayment' as ErrorKey
      return false
    }

    if (overpaymentAmount.value) {
      submitErrorKey.value = 'overpayment' as ErrorKey
      return false
    }

    isSubmitting.value = true

    try {
      await useCases.registerCampParticipant.handle(
        createRegisterCampParticipantCommand({
          context: context.value,
          initialDiscount,
          initialPayment,
          person: personResult.person
        })
      )

      return true
    } catch (error) {
      submitErrorKey.value = resolveSubmitErrorKey(error) as ErrorKey
      return false
    } finally {
      isSubmitting.value = false
    }
  }

  onMounted(() => {
    void reload()
  })

  watch(watchSources, () => {
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

function createRegisterCampParticipantCommand({
  context,
  initialDiscount,
  initialPayment,
  person
}: {
  context: CampParticipantRegistrationContext
  initialDiscount: MoneySnapshot | null
  initialPayment: MoneySnapshot | null
  person: CampParticipantPerson
}): RegisterCampParticipantCommand {
  return {
    campId: context.camp.id,
    person,
    totalAmountDue: context.camp.price,
    ...(initialDiscount
      ? { initialDiscount: { amount: initialDiscount } }
      : {}),
    ...(initialPayment ? { initialPayment: { amount: initialPayment } } : {})
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
): CampParticipantRegistrationBaseErrorKey {
  if (error instanceof CampParticipantAlreadyRegisteredError) {
    return 'alreadySigned'
  }

  if (error instanceof CampNotFoundForParticipantRegistrationError) {
    return 'missingContext'
  }

  if (
    error instanceof CampParticipantDiscountExceedsAmountDueError ||
    error instanceof CampParticipantPaymentExceedsRemainingAmountError
  ) {
    return 'overpayment'
  }

  return 'submit'
}
