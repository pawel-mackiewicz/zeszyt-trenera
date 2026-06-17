<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import AppButton from '@/ui/components/AppButton.vue'
import BaseModal from '@/ui/components/modals/BaseModal.vue'
import type { MoneySnapshot } from '@/write/shared/vo/Money'

import {
  formatMoney,
  optionalText,
  parsePositiveMoney,
  type CampParticipantActionSubject,
  type CampParticipantPaymentSubmit
} from './campParticipantActionModalUtils'

type FormErrorKey = 'invalidPayment' | 'paymentExceedsRemaining'

const props = defineProps<{
  isSubmitting: boolean
  remainingAmountToPay: MoneySnapshot
  subject: CampParticipantActionSubject
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: [payload: CampParticipantPaymentSubmit]
}>()

const { t } = useI18n({ useScope: 'local' })

const paymentAmount = ref('')
const paymentNote = ref('')
const formError = ref<FormErrorKey | null>(null)

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

function resetForm() {
  paymentAmount.value = ''
  paymentNote.value = ''
  formError.value = null
}

function requestClose() {
  if (props.isSubmitting) {
    return
  }

  emit('close')
}

function submitPayment() {
  const amount = parsePositiveMoney(
    paymentAmount.value,
    props.remainingAmountToPay.currency
  )

  if (!amount) {
    formError.value = 'invalidPayment'
    return
  }

  if (amount.amountMinor > props.remainingAmountToPay.amountMinor) {
    formError.value = 'paymentExceedsRemaining'
    return
  }

  formError.value = null
  emit('submit', {
    amount,
    note: optionalText(paymentNote.value)
  })
}
</script>

<template>
  <BaseModal
    :visible="props.visible"
    :title="t('modals.paymentTitle')"
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

    <div class="camp-participant-action-modal__balance">
      <p class="camp-participant-action-modal__balance-label">
        {{ t('fields.remainingAmount') }}
      </p>
      <p class="camp-participant-action-modal__balance-value">
        {{ formatMoney(props.remainingAmountToPay) }}
      </p>
    </div>

    <form
      id="campParticipantPaymentForm"
      class="camp-participant-action-modal__form"
      @submit.prevent="submitPayment"
    >
      <p
        v-if="formErrorMessage"
        class="camp-participant-action-modal__form-error"
        role="alert"
      >
        {{ formErrorMessage }}
      </p>
      <label
        class="app-section-label camp-participant-action-modal__field-label"
        for="campParticipantPaymentAmount"
      >
        {{ t('fields.paymentAmount') }}
      </label>
      <input
        id="campParticipantPaymentAmount"
        v-model="paymentAmount"
        class="camp-participant-action-modal__control"
        inputmode="decimal"
        :placeholder="t('fields.moneyPlaceholder')"
        type="text"
      />
      <label
        class="app-section-label camp-participant-action-modal__field-label"
        for="campParticipantPaymentNote"
      >
        {{ t('fields.paymentNote') }}
      </label>
      <input
        id="campParticipantPaymentNote"
        v-model="paymentNote"
        class="camp-participant-action-modal__control"
        type="text"
      />
    </form>

    <template #actions>
      <AppButton
        class="camp-participant-action-modal__action"
        type="submit"
        form="campParticipantPaymentForm"
        :disabled="props.isSubmitting"
      >
        {{
          props.isSubmitting
            ? t('actions.submitting')
            : t('actions.confirmPayment')
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
.camp-participant-action-modal__balance-label {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  line-height: 1.4;
  text-transform: uppercase;
}

.camp-participant-action-modal__brief-label,
.camp-participant-action-modal__balance-label {
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

.camp-participant-action-modal__balance {
  display: grid;
  gap: 0.35rem;
  padding: 0.9rem 1rem;
  border: 1px solid var(--color-on-surface);
}

.camp-participant-action-modal__balance-value {
  margin: 0;
  font-family: var(--font-headline);
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1;
  color: var(--color-on-surface);
}

.camp-participant-action-modal__form {
  display: grid;
  gap: 0.75rem;
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
  font-size: 0.82rem;
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
      "confirmPayment": "Zapisz wpłatę",
      "submitting": "Zapisywanie"
    },
    "errors": {
      "invalidPayment": "Podaj dodatnią kwotę wpłaty.",
      "paymentExceedsRemaining": "Wpłata nie może być wyższa niż kwota do zapłaty."
    },
    "fields": {
      "moneyPlaceholder": "0,00",
      "paymentAmount": "Kwota wpłaty",
      "paymentNote": "Notatka do wpłaty",
      "remainingAmount": "Do zapłaty",
      "subject": "Uczestnik / wydarzenie"
    },
    "modals": {
      "paymentTitle": "Przyjmij płatność"
    }
  },
  "en": {
    "actions": {
      "cancel": "Cancel",
      "confirmPayment": "Save payment",
      "submitting": "Saving"
    },
    "errors": {
      "invalidPayment": "Enter a positive payment amount.",
      "paymentExceedsRemaining": "The payment cannot be higher than the amount to pay."
    },
    "fields": {
      "moneyPlaceholder": "0.00",
      "paymentAmount": "Payment amount",
      "paymentNote": "Payment note",
      "remainingAmount": "To pay",
      "subject": "Participant / event"
    },
    "modals": {
      "paymentTitle": "Receive payment"
    }
  }
}
</i18n>
