<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import AppButton from '@/ui/components/AppButton.vue'
import BaseModal from '@/ui/components/modals/BaseModal.vue'
import type { MoneySnapshot } from '@/write/shared/vo/Money'

import {
  formatMoney,
  formatMoneyInput,
  parseNonNegativeMoney,
  parsePositiveMoney,
  type CampParticipantActionSubject,
  type CampParticipantResignationSubmit
} from './campParticipantActionModalUtils'

type FormErrorKey =
  | 'depositExceedsRefundable'
  | 'invalidResignationDeposit'
  | 'invalidResignationRefund'
  | 'refundExceedsAvailable'

const props = defineProps<{
  isSubmitting: boolean
  refundableBalance: MoneySnapshot
  subject: CampParticipantActionSubject
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: CampParticipantResignationSubmit]
}>()

const { t } = useI18n({ useScope: 'local' })

const resignationDeductsDeposit = ref(false)
const resignationDepositAmount = ref('')
const resignationSettled = ref(false)
const resignationRefundAmount = ref('')
const formError = ref<FormErrorKey | null>(null)

const resignationDepositPreviewMinor = computed(() =>
  resignationDeductsDeposit.value
    ? parsePositiveMoneyMinorForPreview(resignationDepositAmount.value)
    : 0
)
const resignationRefundPreview = computed<MoneySnapshot>(() => ({
  amountMinor: Math.max(
    0,
    props.refundableBalance.amountMinor - resignationDepositPreviewMinor.value
  ),
  currency: props.refundableBalance.currency
}))
const formErrorMessage = computed(() =>
  formError.value === null ? '' : t(`errors.${formError.value}`)
)

watch(
  () => props.visible,
  (isVisible) => {
    if (isVisible) {
      resetForm()
    }
  }
)

watch(
  [
    () => resignationDeductsDeposit.value,
    () => resignationDepositAmount.value,
    () => resignationRefundPreview.value.amountMinor
  ],
  () => {
    if (resignationSettled.value) {
      prefillResignationRefund()
    }
  }
)

watch(resignationSettled, (isSettled) => {
  if (isSettled) {
    prefillResignationRefund()
    return
  }

  resignationRefundAmount.value = ''
})

function resetForm() {
  resignationDeductsDeposit.value = false
  resignationDepositAmount.value = ''
  resignationSettled.value = false
  resignationRefundAmount.value = ''
  formError.value = null
}

function parsePositiveMoneyMinorForPreview(value: string): number {
  const parsedValue = parsePositiveMoney(
    value,
    props.refundableBalance.currency
  )

  return parsedValue?.amountMinor ?? 0
}

function prefillResignationRefund() {
  resignationRefundAmount.value = formatMoneyInput(
    resignationRefundPreview.value
  )
}

function requestClose() {
  if (props.isSubmitting) {
    return
  }

  emit('close')
}

function submitResignation() {
  const nonRefundableDepositValue = resignationDeductsDeposit.value
    ? parsePositiveMoney(
        resignationDepositAmount.value,
        props.refundableBalance.currency
      )
    : undefined

  if (resignationDeductsDeposit.value && !nonRefundableDepositValue) {
    formError.value = 'invalidResignationDeposit'
    return
  }

  if (
    nonRefundableDepositValue &&
    nonRefundableDepositValue.amountMinor > props.refundableBalance.amountMinor
  ) {
    formError.value = 'depositExceedsRefundable'
    return
  }

  const settledRefundValue = resignationSettled.value
    ? parseNonNegativeMoney(
        resignationRefundAmount.value,
        props.refundableBalance.currency
      )
    : undefined

  if (resignationSettled.value && !settledRefundValue) {
    formError.value = 'invalidResignationRefund'
    return
  }

  if (
    settledRefundValue &&
    settledRefundValue.amountMinor > resignationRefundPreview.value.amountMinor
  ) {
    formError.value = 'refundExceedsAvailable'
    return
  }

  formError.value = null
  emit('submit', {
    nonRefundableDepositValue: nonRefundableDepositValue ?? undefined,
    refundedValue:
      settledRefundValue && settledRefundValue.amountMinor > 0
        ? settledRefundValue
        : undefined
  })
}
</script>

<template>
  <BaseModal
    :visible="props.visible"
    :title="t('modals.resignationTitle')"
    @close="requestClose"
  >
    <div class="camp-participant-action-modal__brief">
      <p class="camp-participant-action-modal__brief-label">
        {{ t('fields.subject') }}
      </p>
      <p class="camp-participant-action-modal__brief-name">
        {{ props.subject.participantDisplayName }}
      </p>
      <p class="camp-participant-action-modal__brief-camp">
        {{ props.subject.campName }}
      </p>
    </div>

    <form
      id="campParticipantResignationForm"
      class="camp-participant-action-modal__form"
      @submit.prevent="submitResignation"
    >
      <p
        v-if="formErrorMessage"
        class="camp-participant-action-modal__form-error"
        role="alert"
      >
        {{ formErrorMessage }}
      </p>

      <label class="camp-participant-action-modal__toggle">
        <input
          v-model="resignationDeductsDeposit"
          class="camp-participant-action-modal__checkbox"
          type="checkbox"
        />
        <span class="camp-participant-action-modal__toggle-label">
          {{ t('fields.deductDeposit') }}
        </span>
      </label>

      <div
        v-if="resignationDeductsDeposit"
        class="camp-participant-action-modal__conditional-field"
      >
        <label
          class="app-section-label camp-participant-action-modal__field-label"
          for="campParticipantResignationDeposit"
        >
          {{ t('fields.nonRefundableDeposit') }}
        </label>
        <input
          id="campParticipantResignationDeposit"
          v-model="resignationDepositAmount"
          class="camp-participant-action-modal__control"
          inputmode="decimal"
          :placeholder="t('fields.moneyPlaceholder')"
          type="text"
        />
      </div>

      <div
        class="camp-participant-action-modal__refund-summary"
        aria-live="polite"
      >
        <div>
          <p class="camp-participant-action-modal__refund-label">
            {{ t('fields.refundToReturn') }}
          </p>
          <p class="camp-participant-action-modal__refund-value">
            {{ formatMoney(resignationRefundPreview) }}
          </p>
        </div>
        <div class="camp-participant-action-modal__refund-meta">
          <span>{{ t('fields.paidBase') }}</span>
          <strong>{{ formatMoney(props.refundableBalance) }}</strong>
        </div>
      </div>

      <label class="camp-participant-action-modal__toggle">
        <input
          v-model="resignationSettled"
          class="camp-participant-action-modal__checkbox"
          type="checkbox"
        />
        <span class="camp-participant-action-modal__toggle-label">
          {{ t('fields.settled') }}
        </span>
      </label>

      <div
        v-if="resignationSettled"
        class="camp-participant-action-modal__conditional-field"
      >
        <label
          class="app-section-label camp-participant-action-modal__field-label"
          for="campParticipantResignationRefund"
        >
          {{ t('fields.refundAmount') }}
        </label>
        <input
          id="campParticipantResignationRefund"
          v-model="resignationRefundAmount"
          class="camp-participant-action-modal__control"
          inputmode="decimal"
          :placeholder="t('fields.moneyPlaceholder')"
          type="text"
        />
      </div>
    </form>

    <template #actions>
      <AppButton
        class="camp-participant-action-modal__action"
        type="submit"
        form="campParticipantResignationForm"
        :disabled="props.isSubmitting"
      >
        {{
          props.isSubmitting
            ? t('actions.submitting')
            : t('actions.confirmResignation')
        }}
      </AppButton>
      <AppButton
        class="camp-participant-action-modal__action"
        type="button"
        variant="secondary"
        :disabled="props.isSubmitting"
        @click="requestClose"
      >
        {{ t('actions.cancel') }}
      </AppButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.camp-participant-action-modal__brief {
  display: grid;
  gap: 0.25rem;
  padding-block: 0.15rem;
  padding-inline-start: 1rem;
  border-inline-start: 4px solid var(--color-primary);
}

.camp-participant-action-modal__brief-label,
.camp-participant-action-modal__brief-camp,
.camp-participant-action-modal__refund-label,
.camp-participant-action-modal__refund-meta,
.camp-participant-action-modal__toggle-label {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  line-height: 1.4;
  text-transform: uppercase;
}

.camp-participant-action-modal__brief-label {
  color: var(--color-secondary);
}

.camp-participant-action-modal__brief-name {
  margin: 0;
  font-family: var(--font-headline);
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1;
  text-transform: uppercase;
  color: var(--color-on-surface);
}

.camp-participant-action-modal__brief-camp {
  color: var(--color-primary);
}

.camp-participant-action-modal__form,
.camp-participant-action-modal__conditional-field {
  display: grid;
  gap: 0.75rem;
}

.camp-participant-action-modal__conditional-field {
  gap: 0.5rem;
}

.camp-participant-action-modal__form-error {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  line-height: 1.5;
  text-transform: uppercase;
  color: var(--color-danger);
}

.camp-participant-action-modal__field-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--color-on-surface);
}

.camp-participant-action-modal__control {
  width: 100%;
  min-height: 2.75rem;
  border: 0;
  border-bottom: 1px solid var(--color-on-surface);
  border-radius: 0;
  background: transparent;
  padding: 0.5rem 0;
  font-family: var(--font-mono);
  font-size: var(--app-form-control-font-size);
  font-variant-numeric: tabular-nums;
  font-style: normal;
  font-weight: 400;
  letter-spacing: 0;
  line-height: 1.4;
  color: var(--color-on-surface);
}

.camp-participant-action-modal__control::placeholder {
  color: var(--color-secondary);
  font-style: italic;
  font-weight: 400;
  letter-spacing: 0;
  opacity: 0.62;
}

.camp-participant-action-modal__control:focus {
  border-bottom-color: var(--color-primary);
  border-bottom-width: 2px;
  outline: 0;
}

.camp-participant-action-modal__toggle {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 2.5rem;
}

.camp-participant-action-modal__checkbox {
  flex: 0 0 auto;
  width: 1.35rem;
  height: 1.35rem;
  margin: 0;
  accent-color: var(--color-primary);
}

.camp-participant-action-modal__toggle-label {
  color: var(--color-on-surface);
}

.camp-participant-action-modal__refund-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--color-on-surface);
  background: var(--color-on-surface);
  color: var(--color-on-primary);
}

.camp-participant-action-modal__refund-label {
  color: var(--color-surface-container);
}

.camp-participant-action-modal__refund-value {
  margin: 0.15rem 0 0;
  font-family: var(--font-headline);
  font-size: clamp(1.75rem, 9vw, 2.5rem);
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1;
  text-transform: uppercase;
  color: var(--color-on-primary);
}

.camp-participant-action-modal__refund-meta {
  display: grid;
  gap: 0.25rem;
  flex: 0 0 auto;
  color: var(--color-surface-container);
  text-align: end;
}

.camp-participant-action-modal__refund-meta strong {
  color: var(--color-on-primary);
}

.camp-participant-action-modal__action {
  width: 100%;
}

@media (min-width: 48rem) {
  .camp-participant-action-modal__action {
    width: auto;
  }
}
</style>

<i18n lang="json">
{
  "pl": {
    "actions": {
      "cancel": "Anuluj",
      "confirmResignation": "Potwierdź rezygnację",
      "submitting": "Zapisywanie"
    },
    "errors": {
      "depositExceedsRefundable": "Zatrzymana zaliczka nie może być wyższa niż wpłacona kwota.",
      "invalidResignationDeposit": "Podaj dodatnią kwotę zatrzymanej zaliczki.",
      "invalidResignationRefund": "Podaj poprawną kwotę zwrotu.",
      "refundExceedsAvailable": "Zwrot nie może być wyższy niż kwota do zwrotu."
    },
    "fields": {
      "deductDeposit": "Odliczamy zadatek?",
      "moneyPlaceholder": "0,00",
      "nonRefundableDeposit": "Kwota zadatku",
      "paidBase": "Wpłacono",
      "refundAmount": "Zwrócono",
      "refundToReturn": "Kwota do zwrotu",
      "settled": "Zwrócono wpłatę?",
      "subject": "Uczestnik / wydarzenie"
    },
    "modals": {
      "resignationTitle": "Przyjmij rezygnację"
    }
  },
  "en": {
    "actions": {
      "cancel": "Cancel",
      "confirmResignation": "Confirm resignation",
      "submitting": "Saving"
    },
    "errors": {
      "depositExceedsRefundable": "The retained deposit cannot be higher than the paid amount.",
      "invalidResignationDeposit": "Enter a positive retained deposit.",
      "invalidResignationRefund": "Enter a valid refund amount.",
      "refundExceedsAvailable": "The refund cannot be higher than the amount to return."
    },
    "fields": {
      "deductDeposit": "Deduct deposit?",
      "moneyPlaceholder": "0.00",
      "nonRefundableDeposit": "Deposit amount",
      "paidBase": "Paid",
      "refundAmount": "Refunded",
      "refundToReturn": "Amount to return",
      "settled": "Payment refunded?",
      "subject": "Participant / event"
    },
    "modals": {
      "resignationTitle": "Accept resignation"
    }
  }
}
</i18n>
