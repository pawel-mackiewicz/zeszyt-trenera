<script setup lang="ts">
import { BadgePercent, Banknote, UserMinus } from '@lucide/vue'
import { computed, ref, toRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import AppButton from '@/ui/components/AppButton.vue'
import FloatingErrorAlert from '@/ui/components/FloatingErrorAlert.vue'
import type { MoneySnapshot } from '@/write/shared/vo/Money'

import { useCampParticipantActions } from '../useCampParticipantActions'

type ActionPanel = 'discount' | 'payment' | 'resignation'
type FormErrorKey =
  | 'invalidDiscount'
  | 'invalidPayment'
  | 'invalidResignationDeposit'
  | 'invalidResignationRefund'

const props = defineProps<{
  campId: string
  participantId: string
}>()

const { t } = useI18n({ useScope: 'local' })
const {
  acceptResignation,
  actionsContext,
  clearSubmitError,
  isLoading,
  isSubmitting,
  loadError,
  notFound,
  registerDiscount,
  registerPayment,
  retryLoading,
  submitError
} = useCampParticipantActions({
  campId: toRef(props, 'campId'),
  participantId: toRef(props, 'participantId')
})

const activePanel = ref<ActionPanel | null>(null)
const discountAmount = ref('')
const discountReason = ref('')
const paymentAmount = ref('')
const paymentNote = ref('')
const resignationDepositAmount = ref('')
const resignationRefundAmount = ref('')
const formError = ref<FormErrorKey | null>(null)

const hasAvailableActions = computed(
  () =>
    Boolean(actionsContext.value?.canGrantDiscount) ||
    Boolean(actionsContext.value?.canRegisterPayment) ||
    Boolean(actionsContext.value?.canAcceptResignation)
)
const formErrorMessage = computed(() =>
  formError.value === null ? '' : t(`errors.${formError.value}`)
)
const submitErrorMessage = computed(() =>
  submitError.value ? t('errors.submit') : ''
)
const shouldRenderSection = computed(
  () =>
    isLoading.value ||
    loadError.value ||
    notFound.value ||
    hasAvailableActions.value
)

watch([() => props.campId, () => props.participantId], resetForms)

watch(actionsContext, () => {
  if (activePanel.value && !isPanelAvailable(activePanel.value)) {
    resetForms()
  }
})

function isPanelAvailable(panel: ActionPanel): boolean {
  if (panel === 'discount') {
    return Boolean(actionsContext.value?.canGrantDiscount)
  }

  if (panel === 'payment') {
    return Boolean(actionsContext.value?.canRegisterPayment)
  }

  return Boolean(actionsContext.value?.canAcceptResignation)
}

function parseMoney(value: string): MoneySnapshot | null {
  const normalizedValue = value.trim().replace(',', '.')
  const amount = Number(normalizedValue)
  const amountMinor = Math.round(amount * 100)

  if (!Number.isFinite(amount) || amountMinor <= 0) {
    return null
  }

  return {
    amountMinor,
    currency: 'PLN'
  }
}

function parseOptionalMoney(value: string): MoneySnapshot | null | undefined {
  return value.trim() === '' ? undefined : parseMoney(value)
}

function optionalText(value: string): string | undefined {
  const trimmedValue = value.trim()

  return trimmedValue.length > 0 ? trimmedValue : undefined
}

function formatMoneyInput(money: MoneySnapshot): string {
  return (money.amountMinor / 100).toFixed(2).replace('.', ',')
}

function showPanel(panel: ActionPanel) {
  if (!isPanelAvailable(panel)) {
    return
  }

  activePanel.value = activePanel.value === panel ? null : panel
  formError.value = null
  clearSubmitError()

  if (panel === 'payment' && actionsContext.value?.paymentPrefillAmount) {
    paymentAmount.value = formatMoneyInput(
      actionsContext.value.paymentPrefillAmount
    )
  }
}

function resetForms() {
  activePanel.value = null
  discountAmount.value = ''
  discountReason.value = ''
  paymentAmount.value = ''
  paymentNote.value = ''
  resignationDepositAmount.value = ''
  resignationRefundAmount.value = ''
  formError.value = null
  clearSubmitError()
}

async function submitDiscount() {
  const amount = parseMoney(discountAmount.value)

  if (!amount) {
    formError.value = 'invalidDiscount'
    return
  }

  formError.value = null

  if (await registerDiscount(amount, optionalText(discountReason.value))) {
    resetForms()
  }
}

async function submitPayment() {
  const amount = parseMoney(paymentAmount.value)

  if (!amount) {
    formError.value = 'invalidPayment'
    return
  }

  formError.value = null

  if (await registerPayment(amount, optionalText(paymentNote.value))) {
    resetForms()
  }
}

async function submitResignation() {
  const nonRefundableDepositValue = parseOptionalMoney(
    resignationDepositAmount.value
  )
  const refundedValue = parseOptionalMoney(resignationRefundAmount.value)

  if (nonRefundableDepositValue === null) {
    formError.value = 'invalidResignationDeposit'
    return
  }

  if (refundedValue === null) {
    formError.value = 'invalidResignationRefund'
    return
  }

  formError.value = null

  if (
    await acceptResignation({
      nonRefundableDepositValue,
      refundedValue
    })
  ) {
    resetForms()
  }
}
</script>

<template>
  <FloatingErrorAlert
    v-if="submitErrorMessage"
    :message="submitErrorMessage"
    top-offset="shell"
    @dismiss="clearSubmitError"
  />

  <section
    v-if="shouldRenderSection"
    class="camp-participant-actions-section"
    aria-labelledby="campParticipantActionsHeading"
  >
    <div class="app-section-label camp-participant-actions-section__label-bar">
      {{ t('sections.actions') }}
    </div>
    <div class="camp-participant-actions-section__body">
      <template v-if="isLoading || loadError || notFound || !actionsContext">
        <p class="camp-participant-actions-section__state">
          {{
            isLoading
              ? t('states.loading')
              : loadError
                ? t('states.loadError')
                : t('states.notFound')
          }}
        </p>
        <AppButton
          v-if="loadError"
          type="button"
          variant="secondary"
          @click="retryLoading"
        >
          {{ t('actions.retry') }}
        </AppButton>
      </template>

      <template v-else>
        <h3
          id="campParticipantActionsHeading"
          class="camp-participant-actions-section__headline camp-participant-actions-section__headline--sr"
        >
          {{ t('sections.actions') }}
        </h3>
        <div class="camp-participant-actions-section__actions">
          <AppButton
            v-if="actionsContext.canGrantDiscount"
            class="camp-participant-actions-section__action-button"
            type="button"
            variant="secondary"
            :disabled="isSubmitting"
            @click="showPanel('discount')"
          >
            <BadgePercent
              class="camp-participant-actions-section__button-icon"
              aria-hidden="true"
            />
            {{ t('actions.discount') }}
          </AppButton>
          <AppButton
            v-if="actionsContext.canRegisterPayment"
            class="camp-participant-actions-section__action-button"
            type="button"
            variant="secondary"
            :disabled="isSubmitting"
            @click="showPanel('payment')"
          >
            <Banknote
              class="camp-participant-actions-section__button-icon"
              aria-hidden="true"
            />
            {{ t('actions.payment') }}
          </AppButton>
          <AppButton
            v-if="actionsContext.canAcceptResignation"
            class="camp-participant-actions-section__action-button"
            type="button"
            variant="secondary"
            :disabled="isSubmitting"
            @click="showPanel('resignation')"
          >
            <UserMinus
              class="camp-participant-actions-section__button-icon"
              aria-hidden="true"
            />
            {{ t('actions.resignation') }}
          </AppButton>
        </div>

        <p
          v-if="formErrorMessage"
          class="camp-participant-actions-section__form-error"
          role="alert"
        >
          {{ formErrorMessage }}
        </p>

        <form
          v-if="activePanel === 'discount'"
          class="camp-participant-actions-section__form"
          @submit.prevent="submitDiscount"
        >
          <label
            class="app-section-label camp-participant-actions-section__field-label"
            for="campParticipantDiscountAmount"
          >
            {{ t('fields.discountAmount') }}
          </label>
          <input
            id="campParticipantDiscountAmount"
            v-model="discountAmount"
            class="camp-participant-actions-section__control"
            inputmode="decimal"
            :placeholder="t('fields.moneyPlaceholder')"
            type="text"
          />
          <label
            class="app-section-label camp-participant-actions-section__field-label"
            for="campParticipantDiscountReason"
          >
            {{ t('fields.discountReason') }}
          </label>
          <input
            id="campParticipantDiscountReason"
            v-model="discountReason"
            class="camp-participant-actions-section__control"
            type="text"
          />
          <AppButton
            class="camp-participant-actions-section__submit"
            type="submit"
            variant="primary"
            :disabled="isSubmitting"
          >
            {{ isSubmitting ? t('actions.submitting') : t('actions.save') }}
          </AppButton>
        </form>

        <form
          v-else-if="activePanel === 'payment'"
          class="camp-participant-actions-section__form"
          @submit.prevent="submitPayment"
        >
          <label
            class="app-section-label camp-participant-actions-section__field-label"
            for="campParticipantPaymentAmount"
          >
            {{ t('fields.paymentAmount') }}
          </label>
          <input
            id="campParticipantPaymentAmount"
            v-model="paymentAmount"
            class="camp-participant-actions-section__control"
            inputmode="decimal"
            :placeholder="t('fields.moneyPlaceholder')"
            type="text"
          />
          <label
            class="app-section-label camp-participant-actions-section__field-label"
            for="campParticipantPaymentNote"
          >
            {{ t('fields.paymentNote') }}
          </label>
          <input
            id="campParticipantPaymentNote"
            v-model="paymentNote"
            class="camp-participant-actions-section__control"
            type="text"
          />
          <AppButton
            class="camp-participant-actions-section__submit"
            type="submit"
            variant="primary"
            :disabled="isSubmitting"
          >
            {{ isSubmitting ? t('actions.submitting') : t('actions.save') }}
          </AppButton>
        </form>

        <form
          v-else-if="activePanel === 'resignation'"
          class="camp-participant-actions-section__form"
          @submit.prevent="submitResignation"
        >
          <label
            class="app-section-label camp-participant-actions-section__field-label"
            for="campParticipantResignationDeposit"
          >
            {{ t('fields.nonRefundableDeposit') }}
          </label>
          <input
            id="campParticipantResignationDeposit"
            v-model="resignationDepositAmount"
            class="camp-participant-actions-section__control"
            inputmode="decimal"
            :placeholder="t('fields.optionalMoneyPlaceholder')"
            type="text"
          />
          <label
            class="app-section-label camp-participant-actions-section__field-label"
            for="campParticipantResignationRefund"
          >
            {{ t('fields.refundAmount') }}
          </label>
          <input
            id="campParticipantResignationRefund"
            v-model="resignationRefundAmount"
            class="camp-participant-actions-section__control"
            inputmode="decimal"
            :placeholder="t('fields.optionalMoneyPlaceholder')"
            type="text"
          />
          <AppButton
            class="camp-participant-actions-section__submit"
            type="submit"
            variant="primary"
            :disabled="isSubmitting"
          >
            {{
              isSubmitting
                ? t('actions.submitting')
                : t('actions.confirmResignation')
            }}
          </AppButton>
        </form>
      </template>
    </div>
  </section>
</template>

<style scoped>
.camp-participant-actions-section {
  border: 1px solid var(--color-on-surface);
  background: var(--color-surface);
  box-shadow: 4px 4px 0 0 var(--color-on-surface);
}

.camp-participant-actions-section__label-bar {
  margin: 0;
  padding: 0.9rem 1rem;
  border-block-end: 1px solid var(--color-on-surface);
  background: var(--color-on-surface);
  color: var(--color-on-primary);
  font-size: 0.875rem;
}

.camp-participant-actions-section__body {
  display: grid;
  gap: 1.25rem;
  padding: 1.5rem 1rem;
}

.camp-participant-actions-section__headline {
  margin: 0;
  overflow-wrap: anywhere;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  line-height: 1.35;
  text-transform: uppercase;
  color: var(--color-on-surface);
}

.camp-participant-actions-section__headline--sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

.camp-participant-actions-section__actions {
  display: grid;
  gap: 0.75rem;
}

.camp-participant-actions-section__action-button,
.camp-participant-actions-section__submit {
  width: 100%;
  min-height: 3.5rem;
}

.camp-participant-actions-section__button-icon {
  flex: 0 0 auto;
  width: 0.95rem;
  height: 0.95rem;
  color: currentColor;
  stroke-width: 2.25;
}

.camp-participant-actions-section__state,
.camp-participant-actions-section__form-error {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  line-height: 1.5;
  text-transform: uppercase;
}

.camp-participant-actions-section__state {
  color: var(--color-secondary);
}

.camp-participant-actions-section__form-error {
  color: var(--color-danger);
}

.camp-participant-actions-section__form {
  display: grid;
  gap: 0.5rem;
  padding-block-start: 1.25rem;
  border-block-start: 1px dashed var(--color-on-surface);
}

.camp-participant-actions-section__field-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--color-on-surface);
}

.camp-participant-actions-section__control {
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

.camp-participant-actions-section__control::placeholder {
  color: var(--color-secondary);
  font-style: italic;
  font-weight: 400;
  letter-spacing: 0;
  opacity: 0.62;
}

.camp-participant-actions-section__control:focus {
  border-bottom-color: var(--color-primary);
  border-bottom-width: 2px;
  outline: 0;
}

@media (min-width: 48rem) {
  .camp-participant-actions-section__body {
    gap: 1.5rem;
    padding: 2rem;
  }

  .camp-participant-actions-section__actions {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>

<i18n lang="json">
{
  "pl": {
    "sections": {
      "actions": "Akcje"
    },
    "actions": {
      "confirmResignation": "Przyjmij rezygnację",
      "discount": "Przyznaj zniżkę",
      "payment": "Przyjmij płatność",
      "resignation": "Przyjmij rezygnację",
      "retry": "Spróbuj ponownie",
      "save": "Zapisz",
      "submitting": "Zapisywanie"
    },
    "errors": {
      "invalidDiscount": "Podaj dodatnią kwotę zniżki.",
      "invalidPayment": "Podaj dodatnią kwotę wpłaty.",
      "invalidResignationDeposit": "Podaj dodatnią kwotę zatrzymanej zaliczki albo zostaw pole puste.",
      "invalidResignationRefund": "Podaj dodatnią kwotę zwrotu albo zostaw pole puste.",
      "submit": "Nie udało się zapisać zmian uczestnika."
    },
    "fields": {
      "discountAmount": "Kwota zniżki",
      "discountReason": "Powód zniżki",
      "moneyPlaceholder": "0,00",
      "nonRefundableDeposit": "Zatrzymana zaliczka",
      "optionalMoneyPlaceholder": "Opcjonalnie",
      "paymentAmount": "Kwota wpłaty",
      "paymentNote": "Notatka do wpłaty",
      "refundAmount": "Kwota zwrotu"
    },
    "states": {
      "loading": "Wczytywanie akcji uczestnika",
      "loadError": "Nie udało się wczytać akcji uczestnika.",
      "notFound": "Nie znaleziono uczestnika."
    }
  },
  "en": {
    "sections": {
      "actions": "Actions"
    },
    "actions": {
      "confirmResignation": "Accept resignation",
      "discount": "Grant discount",
      "payment": "Receive payment",
      "resignation": "Accept resignation",
      "retry": "Try again",
      "save": "Save",
      "submitting": "Saving"
    },
    "errors": {
      "invalidDiscount": "Enter a positive discount amount.",
      "invalidPayment": "Enter a positive payment amount.",
      "invalidResignationDeposit": "Enter a positive retained deposit or leave it empty.",
      "invalidResignationRefund": "Enter a positive refund amount or leave it empty.",
      "submit": "Participant changes could not be saved."
    },
    "fields": {
      "discountAmount": "Discount amount",
      "discountReason": "Discount reason",
      "moneyPlaceholder": "0.00",
      "nonRefundableDeposit": "Retained deposit",
      "optionalMoneyPlaceholder": "Optional",
      "paymentAmount": "Payment amount",
      "paymentNote": "Payment note",
      "refundAmount": "Refund amount"
    },
    "states": {
      "loading": "Loading participant actions",
      "loadError": "Participant actions could not be loaded.",
      "notFound": "Participant was not found."
    }
  }
}
</i18n>
