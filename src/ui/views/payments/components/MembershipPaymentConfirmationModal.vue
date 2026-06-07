<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import ConfirmationModal, {
  type ConfirmationModalDetail
} from '@/ui/components/modals/ConfirmationModal.vue'
import { Money, type MoneySnapshot } from '@/write/shared/vo/Money'
import { MEMBERSHIP_PAYMENT_CONFIRMATION_MODAL_MESSAGES } from './MembershipPaymentConfirmationModal.messages'

export type MembershipPaymentConfirmationModalMember = {
  attendanceCount: number
  ageLabel: string
  coveredMonthLabel: string
  memberName: string
}

type MembershipPaymentAmountInput = string | number

const DEFAULT_CHARGED_AMOUNT_CURRENCY = 'PLN'
const DEFAULT_CHARGED_AMOUNT_INPUT = ''

const props = withDefaults(
  defineProps<{
    chargedAmount?: MembershipPaymentAmountInput | null
    errorMessage?: string
    errorTitle?: string
    isPending?: boolean
    member: MembershipPaymentConfirmationModalMember | null
    visible: boolean
  }>(),
  {
    chargedAmount: null,
    errorMessage: '',
    errorTitle: '',
    isPending: false
  }
)

const emit = defineEmits<{
  close: []
  confirm: [chargedAmount: MoneySnapshot]
  dismissError: []
}>()

const { t } = useI18n({
  useScope: 'local',
  messages: MEMBERSHIP_PAYMENT_CONFIRMATION_MODAL_MESSAGES
})
const isModalVisible = computed(() => props.visible && props.member !== null)
const chargedAmountInput = ref(DEFAULT_CHARGED_AMOUNT_INPUT)
const chargedAmountErrorKey = ref<
  'chargedAmountRequired' | 'chargedAmountInvalid' | null
>(null)
const chargedAmountErrorMessage = computed(() =>
  chargedAmountErrorKey.value === null
    ? ''
    : t(`confirmation.errors.${chargedAmountErrorKey.value}`)
)
const details = computed<ConfirmationModalDetail[]>(() => {
  if (props.member === null) {
    return []
  }

  const modalDetails: ConfirmationModalDetail[] = [
    {
      label: t('confirmation.memberLabel'),
      value: props.member.memberName
    },
    {
      label: t('confirmation.monthLabel'),
      value: props.member.coveredMonthLabel
    },
    {
      label: t('confirmation.ageLabel'),
      value: props.member.ageLabel
    }
  ]

  if (props.member.attendanceCount > 0) {
    modalDetails.push({
      label: t('confirmation.attendanceLabel'),
      value: t('confirmation.attendanceValue', {
        count: props.member.attendanceCount
      })
    })
  }

  return modalDetails
})

function requestConfirm() {
  const chargedAmount = toChargedAmountMoney(chargedAmountInput.value)

  if (chargedAmount === null) {
    chargedAmountErrorKey.value =
      chargedAmountInput.value.trim().length === 0
        ? 'chargedAmountRequired'
        : 'chargedAmountInvalid'
    return
  }

  emit('confirm', chargedAmount.toSnapshot())
}

function clearChargedAmountError() {
  chargedAmountErrorKey.value = null
}

function toChargedAmountMoney(value: MembershipPaymentAmountInput) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) {
      return null
    }

    return Money.create({
      amountMinor: Math.round(value * 100),
      currency: DEFAULT_CHARGED_AMOUNT_CURRENCY
    })
  }

  const normalizedValue = value.trim().replace(/\s+/g, '').replace(',', '.')

  if (normalizedValue.length === 0) {
    return null
  }

  const match = normalizedValue.match(/^(\d+)(?:\.(\d{1,2}))?$/)

  if (match === null) {
    return null
  }

  const wholeUnits = Number(match[1])
  const fractionalUnits = (match[2] ?? '').padEnd(2, '0')

  return Money.create({
    amountMinor: wholeUnits * 100 + Number(fractionalUnits),
    currency: DEFAULT_CHARGED_AMOUNT_CURRENCY
  })
}

function toChargedAmountInput(value: MembershipPaymentAmountInput | null) {
  if (value === null) {
    return DEFAULT_CHARGED_AMOUNT_INPUT
  }

  return typeof value === 'number' ? value.toFixed(2) : value
}

watch(
  () => [props.visible, props.member, props.chargedAmount] as const,
  ([visible]) => {
    if (!visible) {
      return
    }

    chargedAmountInput.value = toChargedAmountInput(props.chargedAmount)
    chargedAmountErrorKey.value = null
  },
  { immediate: true }
)
</script>

<template>
  <ConfirmationModal
    :visible="isModalVisible"
    :title="t('confirmation.title')"
    :details="details"
    :detail-columns="2"
    :confirm-label="t('confirmation.actions.confirm')"
    :pending-label="t('confirmation.actions.pending')"
    :cancel-label="t('confirmation.actions.cancel')"
    :is-pending="props.isPending"
    :error-message="props.errorMessage"
    :error-title="props.errorTitle"
    actions-class="payments-confirmation__actions"
    backdrop-test-id="payments-confirmation-backdrop"
    confirm-test-id="payment-confirmation-confirm"
    cancel-test-id="payment-confirmation-cancel"
    detail-class="payments-confirmation__detail"
    @close="emit('close')"
    @confirm="requestConfirm"
    @dismiss-error="emit('dismissError')"
  >
    <label
      class="payments-confirmation__amount-field"
      for="membership-payment-charged-amount"
    >
      <span class="payments-confirmation__amount-label">
        {{ t('confirmation.chargedAmountLabel') }}
      </span>
      <span class="payments-confirmation__amount-control">
        <input
          id="membership-payment-charged-amount"
          v-model="chargedAmountInput"
          class="payments-confirmation__amount-input"
          data-testid="payment-confirmation-charged-amount"
          inputmode="decimal"
          autocomplete="off"
          :aria-invalid="chargedAmountErrorMessage ? 'true' : 'false'"
          :disabled="props.isPending"
          :placeholder="t('confirmation.chargedAmountPlaceholder')"
          type="text"
          @input="clearChargedAmountError"
        />
        <span class="payments-confirmation__amount-suffix">
          {{ t('confirmation.chargedAmountSuffix') }}
        </span>
      </span>
      <span
        v-if="chargedAmountErrorMessage"
        class="payments-confirmation__amount-error"
      >
        {{ chargedAmountErrorMessage }}
      </span>
    </label>
  </ConfirmationModal>
</template>

<style scoped>
.payments-confirmation__amount-field {
  display: grid;
  gap: 0.45rem;
}

.payments-confirmation__amount-label {
  font-family: var(--font-label);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-secondary);
}

.payments-confirmation__amount-control {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  border: 1px solid var(--color-outline-variant);
  background: var(--color-surface-container-low);
}

.payments-confirmation__amount-input {
  min-width: 0;
  border: 0;
  background: transparent;
  padding: 0.9rem 0.875rem;
  font: 700 1.25rem/1.15 var(--font-headline);
  color: var(--color-on-surface);
  outline: none;
}

.payments-confirmation__amount-input:focus {
  box-shadow: inset 0 0 0 2px var(--color-primary);
}

.payments-confirmation__amount-suffix {
  padding: 0 0.875rem;
  font-family: var(--font-label);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--color-secondary);
}

.payments-confirmation__amount-error {
  font-size: 0.8125rem;
  color: var(--color-danger);
}
</style>
