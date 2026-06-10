import { computed, reactive, ref } from 'vue'

import {
  InvalidCampFinishDateError,
  InvalidCampNameError,
  InvalidCampStartDateError
} from '@/write/camps/domain/Camp'
import { InvalidMoneyAmountMinorError } from '@/write/shared/vo/Money'
import { useAppServices } from '@/ui/appServices'
import { useRouter } from '@/ui/router/runtime'

type RegisterCampForm = {
  name: string
  startDate: string
  finishDate: string
  price: string
  note: string
}

export type RegisterCampErrorKey =
  | 'required'
  | 'invalidName'
  | 'invalidStartDate'
  | 'invalidFinishDate'
  | 'invalidPrice'
  | 'submit'

const PLN_MINOR_UNITS = 100
const PRICE_PATTERN = /^\d+(?:[,.]\d{1,2})?$/

function toUtcDate(value: string): Date | null {
  if (!value) return null

  const date = new Date(`${value}T00:00:00Z`)

  return Number.isNaN(date.getTime()) ? null : date
}

function toAmountMinor(value: string): number | null {
  const normalizedValue = value.trim().replace(',', '.')

  if (!PRICE_PATTERN.test(normalizedValue)) {
    return null
  }

  const [major = '', minor = ''] = normalizedValue.split('.')
  const amountMinor =
    Number(major) * PLN_MINOR_UNITS +
    Number(minor.padEnd(2, '0').slice(0, 2) || '0')

  return amountMinor > 0 ? amountMinor : null
}

function resolveErrorKey(error: unknown): RegisterCampErrorKey {
  if (error instanceof InvalidCampNameError) {
    return 'invalidName'
  }

  if (error instanceof InvalidCampStartDateError) {
    return 'invalidStartDate'
  }

  if (error instanceof InvalidCampFinishDateError) {
    return 'invalidFinishDate'
  }

  if (error instanceof InvalidMoneyAmountMinorError) {
    return 'invalidPrice'
  }

  return 'submit'
}

export function useRegisterCamp() {
  const router = useRouter()
  const { useCases } = useAppServices()
  const form = reactive<RegisterCampForm>({
    name: '',
    startDate: '',
    finishDate: '',
    price: '',
    note: ''
  })
  const isSubmitting = ref(false)
  const submitErrorKey = ref<RegisterCampErrorKey | null>(null)
  const canSubmit = computed(() => !isSubmitting.value)

  function clearSubmitError() {
    submitErrorKey.value = null
  }

  async function submit() {
    if (isSubmitting.value) return

    submitErrorKey.value = null

    const name = form.name.trim()
    const startDate = toUtcDate(form.startDate)
    const finishDate = toUtcDate(form.finishDate)
    const amountMinor = toAmountMinor(form.price)

    if (!name || !form.startDate || !form.finishDate || !form.price.trim()) {
      submitErrorKey.value = 'required'
      return
    }

    if (!startDate || !finishDate) {
      submitErrorKey.value = 'required'
      return
    }

    if (amountMinor === null) {
      submitErrorKey.value = 'invalidPrice'
      return
    }

    if (finishDate <= startDate) {
      submitErrorKey.value = 'invalidFinishDate'
      return
    }

    isSubmitting.value = true

    try {
      await useCases.registerCamp.handle({
        name,
        note: form.note.trim() || undefined,
        startDate,
        finishDate,
        price: {
          amountMinor,
          currency: 'PLN'
        }
      })

      await router.replace('/camps')
    } catch (error: unknown) {
      submitErrorKey.value = resolveErrorKey(error)
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    canSubmit,
    clearSubmitError,
    form,
    isSubmitting,
    submit,
    submitErrorKey
  }
}
