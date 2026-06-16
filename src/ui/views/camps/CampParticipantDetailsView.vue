<script setup lang="ts">
import {
  BadgePercent,
  Banknote,
  CalendarDays,
  Tent,
  UserMinus,
  UserRound
} from '@lucide/vue'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import AppButton from '@/ui/components/AppButton.vue'
import FloatingErrorAlert from '@/ui/components/FloatingErrorAlert.vue'
import { useRoute } from '@/ui/router/runtime'
import type { MoneySnapshot } from '@/write/shared/vo/Money'
import { useCampParticipantDetails } from './useCampParticipantDetails'

type ActionPanel = 'discount' | 'payment' | 'resignation'
type FormErrorKey =
  | 'invalidDiscount'
  | 'invalidPayment'
  | 'invalidResignationDeposit'
  | 'invalidResignationRefund'

const route = useRoute()
const { locale, t } = useI18n({ useScope: 'local' })
const campId = computed(() => getRouteParam(route.params.campId))
const participantId = computed(() => getRouteParam(route.params.participantId))
const {
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
} = useCampParticipantDetails({
  campId,
  participantId
})

const activePanel = ref<ActionPanel | null>(null)
const discountAmount = ref('')
const discountReason = ref('')
const paymentAmount = ref('')
const paymentNote = ref('')
const resignationDepositAmount = ref('')
const resignationRefundAmount = ref('')
const formError = ref<FormErrorKey | null>(null)

const activeParticipant = computed(() =>
  participant.value && 'amountDue' in participant.value
    ? participant.value
    : null
)
const resignedParticipant = computed(() =>
  participant.value && 'amountToRefund' in participant.value
    ? participant.value
    : null
)
const progressStyle = computed(() => ({
  width: `${Math.min(
    100,
    Math.max(0, activeParticipant.value?.paymentProgressPercent ?? 0)
  )}%`
}))
const remainingAmount = computed<MoneySnapshot | null>(() => {
  if (!activeParticipant.value) {
    return null
  }

  return {
    amountMinor: Math.max(
      0,
      activeParticipant.value.amountDue.amountMinor -
        activeParticipant.value.paidAmount.amountMinor
    ),
    currency: activeParticipant.value.amountDue.currency
  }
})
const dateRange = computed(() => {
  if (!camp.value) {
    return ''
  }

  const formatter = new Intl.DateTimeFormat(locale.value, {
    day: '2-digit',
    month: '2-digit'
  })

  return t('dates.range', {
    finish: formatter.format(camp.value.finishDate),
    start: formatter.format(camp.value.startDate)
  })
})
const statusLabel = computed(() => {
  if (!participant.value) {
    return ''
  }

  return t(`status.${participant.value.status}`)
})
const formErrorMessage = computed(() =>
  formError.value === null ? '' : t(`errors.${formError.value}`)
)
const submitErrorMessage = computed(() =>
  submitError.value ? t('errors.submit') : ''
)

watch(participantId, resetForms)

function getRouteParam(value: unknown): string {
  return Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '')
}

function formatMoney(money: MoneySnapshot): string {
  try {
    return new Intl.NumberFormat(locale.value, {
      currency: money.currency,
      style: 'currency'
    }).format(money.amountMinor / 100)
  } catch {
    return `${(money.amountMinor / 100).toFixed(2)} ${money.currency}`
  }
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

function showPanel(panel: ActionPanel) {
  activePanel.value = activePanel.value === panel ? null : panel
  formError.value = null
  clearSubmitError()

  if (panel === 'payment' && remainingAmount.value?.amountMinor) {
    paymentAmount.value = (remainingAmount.value.amountMinor / 100)
      .toFixed(2)
      .replace('.', ',')
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
  <main class="camp-participant-details-view">
    <FloatingErrorAlert
      v-if="submitErrorMessage"
      :message="submitErrorMessage"
      top-offset="shell"
      @dismiss="clearSubmitError"
    />

    <section
      v-if="isLoading || loadError || notFound || !camp || !participant"
      class="camp-participant-details-view__panel"
    >
      <div class="app-section-label camp-participant-details-view__label-bar">
        {{ t('sections.participant') }}
      </div>
      <div class="camp-participant-details-view__body">
        <p class="camp-participant-details-view__state">
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
          @click="reload"
        >
          {{ t('actions.retry') }}
        </AppButton>
      </div>
    </section>

    <template v-else>
      <section
        class="camp-participant-details-view__panel"
        aria-labelledby="campParticipantDetailsHeading"
      >
        <div class="app-section-label camp-participant-details-view__label-bar">
          {{ t('sections.participant') }}
        </div>
        <div class="camp-participant-details-view__body">
          <div class="camp-participant-details-view__summary">
            <div class="camp-participant-details-view__summary-item">
              <span
                class="app-section-label camp-participant-details-view__summary-label"
              >
                <UserRound
                  class="camp-participant-details-view__label-icon"
                  aria-hidden="true"
                />
                {{ t('fields.participant') }}
              </span>
              <h2
                id="campParticipantDetailsHeading"
                class="camp-participant-details-view__title"
              >
                {{ participant.displayName }}
              </h2>
            </div>
            <div class="camp-participant-details-view__summary-item">
              <span
                class="app-section-label camp-participant-details-view__summary-label"
              >
                <Tent
                  class="camp-participant-details-view__label-icon"
                  aria-hidden="true"
                />
                {{ t('fields.camp') }}
              </span>
              <span class="camp-participant-details-view__summary-value">
                {{ camp.name }}
              </span>
            </div>
            <div class="camp-participant-details-view__summary-item">
              <span
                class="app-section-label camp-participant-details-view__summary-label"
              >
                <CalendarDays
                  class="camp-participant-details-view__label-icon"
                  aria-hidden="true"
                />
                {{ t('fields.dates') }}
              </span>
              <span class="camp-participant-details-view__summary-value">
                {{ dateRange }}
              </span>
            </div>
            <div class="camp-participant-details-view__summary-item">
              <span
                class="app-section-label camp-participant-details-view__summary-label"
              >
                {{ t('fields.status') }}
              </span>
              <span class="camp-participant-details-view__status">
                {{ statusLabel }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section
        v-if="activeParticipant"
        class="camp-participant-details-view__panel"
        aria-labelledby="campParticipantPaymentHeading"
      >
        <div class="app-section-label camp-participant-details-view__label-bar">
          {{ t('sections.payment') }}
        </div>
        <div class="camp-participant-details-view__body">
          <div class="camp-participant-details-view__payment-heading">
            <h3
              id="campParticipantPaymentHeading"
              class="camp-participant-details-view__headline"
            >
              {{ t('payment.status') }}
            </h3>
            <p class="camp-participant-details-view__money">
              <strong>
                {{ formatMoney(activeParticipant.paidAmount) }}
              </strong>
              <span>/ {{ formatMoney(activeParticipant.amountDue) }}</span>
            </p>
          </div>

          <div
            class="camp-participant-details-view__progress"
            role="progressbar"
            :aria-label="t('payment.progressLabel')"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="activeParticipant.paymentProgressPercent"
          >
            <span
              class="camp-participant-details-view__progress-value"
              :style="progressStyle"
            />
          </div>

          <p
            v-if="remainingAmount"
            class="camp-participant-details-view__remaining"
            aria-live="polite"
          >
            {{
              t('payment.remaining', {
                amount: formatMoney(remainingAmount)
              })
            }}
          </p>
        </div>
      </section>

      <section
        v-else-if="resignedParticipant"
        class="camp-participant-details-view__panel"
        aria-labelledby="campParticipantRefundHeading"
      >
        <div class="app-section-label camp-participant-details-view__label-bar">
          {{ t('sections.payment') }}
        </div>
        <div class="camp-participant-details-view__body">
          <h3
            id="campParticipantRefundHeading"
            class="camp-participant-details-view__headline"
          >
            {{ t('payment.refund') }}
          </h3>
          <p class="camp-participant-details-view__money">
            <strong>{{
              formatMoney(resignedParticipant.amountToRefund)
            }}</strong>
          </p>
        </div>
      </section>

      <section
        v-if="activeParticipant"
        class="camp-participant-details-view__panel"
        aria-labelledby="campParticipantActionsHeading"
      >
        <div class="app-section-label camp-participant-details-view__label-bar">
          {{ t('sections.actions') }}
        </div>
        <div class="camp-participant-details-view__body">
          <h3
            id="campParticipantActionsHeading"
            class="camp-participant-details-view__headline camp-participant-details-view__headline--sr"
          >
            {{ t('sections.actions') }}
          </h3>
          <div class="camp-participant-details-view__actions">
            <AppButton
              class="camp-participant-details-view__action-button"
              type="button"
              variant="secondary"
              :disabled="isSubmitting"
              @click="showPanel('discount')"
            >
              <BadgePercent
                class="camp-participant-details-view__button-icon"
                aria-hidden="true"
              />
              {{ t('actions.discount') }}
            </AppButton>
            <AppButton
              class="camp-participant-details-view__action-button"
              type="button"
              variant="secondary"
              :disabled="isSubmitting"
              @click="showPanel('payment')"
            >
              <Banknote
                class="camp-participant-details-view__button-icon"
                aria-hidden="true"
              />
              {{ t('actions.payment') }}
            </AppButton>
            <AppButton
              class="camp-participant-details-view__action-button"
              type="button"
              variant="secondary"
              :disabled="isSubmitting"
              @click="showPanel('resignation')"
            >
              <UserMinus
                class="camp-participant-details-view__button-icon"
                aria-hidden="true"
              />
              {{ t('actions.resignation') }}
            </AppButton>
          </div>

          <p
            v-if="formErrorMessage"
            class="camp-participant-details-view__form-error"
            role="alert"
          >
            {{ formErrorMessage }}
          </p>

          <form
            v-if="activePanel === 'discount'"
            class="camp-participant-details-view__form"
            @submit.prevent="submitDiscount"
          >
            <label
              class="app-section-label camp-participant-details-view__field-label"
              for="campParticipantDiscountAmount"
            >
              {{ t('fields.discountAmount') }}
            </label>
            <input
              id="campParticipantDiscountAmount"
              v-model="discountAmount"
              class="camp-participant-details-view__control"
              inputmode="decimal"
              :placeholder="t('fields.moneyPlaceholder')"
              type="text"
            />
            <label
              class="app-section-label camp-participant-details-view__field-label"
              for="campParticipantDiscountReason"
            >
              {{ t('fields.discountReason') }}
            </label>
            <input
              id="campParticipantDiscountReason"
              v-model="discountReason"
              class="camp-participant-details-view__control"
              type="text"
            />
            <AppButton
              class="camp-participant-details-view__submit"
              type="submit"
              variant="primary"
              :disabled="isSubmitting"
            >
              {{ isSubmitting ? t('actions.submitting') : t('actions.save') }}
            </AppButton>
          </form>

          <form
            v-else-if="activePanel === 'payment'"
            class="camp-participant-details-view__form"
            @submit.prevent="submitPayment"
          >
            <label
              class="app-section-label camp-participant-details-view__field-label"
              for="campParticipantPaymentAmount"
            >
              {{ t('fields.paymentAmount') }}
            </label>
            <input
              id="campParticipantPaymentAmount"
              v-model="paymentAmount"
              class="camp-participant-details-view__control"
              inputmode="decimal"
              :placeholder="t('fields.moneyPlaceholder')"
              type="text"
            />
            <label
              class="app-section-label camp-participant-details-view__field-label"
              for="campParticipantPaymentNote"
            >
              {{ t('fields.paymentNote') }}
            </label>
            <input
              id="campParticipantPaymentNote"
              v-model="paymentNote"
              class="camp-participant-details-view__control"
              type="text"
            />
            <AppButton
              class="camp-participant-details-view__submit"
              type="submit"
              variant="primary"
              :disabled="isSubmitting"
            >
              {{ isSubmitting ? t('actions.submitting') : t('actions.save') }}
            </AppButton>
          </form>

          <form
            v-else-if="activePanel === 'resignation'"
            class="camp-participant-details-view__form"
            @submit.prevent="submitResignation"
          >
            <label
              class="app-section-label camp-participant-details-view__field-label"
              for="campParticipantResignationDeposit"
            >
              {{ t('fields.nonRefundableDeposit') }}
            </label>
            <input
              id="campParticipantResignationDeposit"
              v-model="resignationDepositAmount"
              class="camp-participant-details-view__control"
              inputmode="decimal"
              :placeholder="t('fields.optionalMoneyPlaceholder')"
              type="text"
            />
            <label
              class="app-section-label camp-participant-details-view__field-label"
              for="campParticipantResignationRefund"
            >
              {{ t('fields.refundAmount') }}
            </label>
            <input
              id="campParticipantResignationRefund"
              v-model="resignationRefundAmount"
              class="camp-participant-details-view__control"
              inputmode="decimal"
              :placeholder="t('fields.optionalMoneyPlaceholder')"
              type="text"
            />
            <AppButton
              class="camp-participant-details-view__submit"
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
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.camp-participant-details-view {
  display: grid;
  gap: 1.5rem;
  max-width: 42rem;
  margin: 0 auto;
  padding: 2rem 1rem calc(6rem + env(safe-area-inset-bottom));
}

.camp-participant-details-view__panel {
  border: 1px solid var(--color-on-surface);
  background: var(--color-surface);
  box-shadow: 4px 4px 0 0 var(--color-on-surface);
}

.camp-participant-details-view__label-bar {
  margin: 0;
  padding: 0.9rem 1rem;
  border-block-end: 1px solid var(--color-on-surface);
  background: var(--color-on-surface);
  color: var(--color-on-primary);
  font-size: 0.875rem;
}

.camp-participant-details-view__body {
  display: grid;
  gap: 1.25rem;
  padding: 1.5rem 1rem;
}

.camp-participant-details-view__summary {
  display: grid;
  gap: 1rem;
}

.camp-participant-details-view__summary-item,
.camp-participant-details-view__form {
  display: grid;
  gap: 0.5rem;
}

.camp-participant-details-view__summary-label,
.camp-participant-details-view__field-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--color-on-surface);
}

.camp-participant-details-view__label-icon,
.camp-participant-details-view__button-icon {
  flex: 0 0 auto;
  width: 0.95rem;
  height: 0.95rem;
  stroke-width: 2.25;
}

.camp-participant-details-view__label-icon {
  color: var(--color-secondary);
}

.camp-participant-details-view__button-icon {
  color: currentColor;
}

.camp-participant-details-view__title,
.camp-participant-details-view__summary-value,
.camp-participant-details-view__status,
.camp-participant-details-view__headline,
.camp-participant-details-view__money {
  margin: 0;
  overflow-wrap: anywhere;
}

.camp-participant-details-view__title {
  font-family: var(--font-headline);
  font-size: 1.45rem;
  font-weight: 800;
  line-height: 1.1;
  text-transform: uppercase;
  color: var(--color-on-surface);
}

.camp-participant-details-view__summary-value,
.camp-participant-details-view__status,
.camp-participant-details-view__money {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1.4;
  text-transform: uppercase;
  color: var(--color-on-surface);
}

.camp-participant-details-view__status {
  color: var(--color-primary);
}

.camp-participant-details-view__payment-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  justify-content: space-between;
  gap: 0.75rem 1rem;
}

.camp-participant-details-view__headline {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  line-height: 1.35;
  text-transform: uppercase;
  color: var(--color-on-surface);
}

.camp-participant-details-view__headline--sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

.camp-participant-details-view__money strong {
  color: var(--color-primary);
}

.camp-participant-details-view__money span {
  color: var(--color-secondary);
}

.camp-participant-details-view__progress {
  height: 1rem;
  border: 1px solid var(--color-on-surface);
  background: var(--color-surface-container-low);
}

.camp-participant-details-view__progress-value {
  display: block;
  height: 100%;
  border-inline-end: 1px solid var(--color-on-surface);
  background: var(--color-primary);
}

.camp-participant-details-view__remaining,
.camp-participant-details-view__state,
.camp-participant-details-view__form-error {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  line-height: 1.5;
  text-transform: uppercase;
}

.camp-participant-details-view__remaining,
.camp-participant-details-view__state {
  color: var(--color-secondary);
}

.camp-participant-details-view__form-error {
  color: var(--color-danger);
}

.camp-participant-details-view__actions {
  display: grid;
  gap: 0.75rem;
}

.camp-participant-details-view__action-button,
.camp-participant-details-view__submit {
  width: 100%;
  min-height: 3.5rem;
}

.camp-participant-details-view__form {
  padding-block-start: 1.25rem;
  border-block-start: 1px dashed var(--color-on-surface);
}

.camp-participant-details-view__control {
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

.camp-participant-details-view__control::placeholder {
  color: var(--color-secondary);
  font-style: italic;
  font-weight: 400;
  letter-spacing: 0;
  opacity: 0.62;
}

.camp-participant-details-view__control:focus {
  border-bottom-color: var(--color-primary);
  border-bottom-width: 2px;
  outline: 0;
}

@media (min-width: 48rem) {
  .camp-participant-details-view {
    padding-inline: 2rem;
  }

  .camp-participant-details-view__body {
    gap: 1.5rem;
    padding: 2rem;
  }

  .camp-participant-details-view__summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .camp-participant-details-view__actions {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>

<i18n lang="json">
{
  "pl": {
    "sections": {
      "participant": "Uczestnik obozu",
      "payment": "Status płatności",
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
    "dates": {
      "range": "{start} - {finish}"
    },
    "errors": {
      "invalidDiscount": "Podaj dodatnią kwotę zniżki.",
      "invalidPayment": "Podaj dodatnią kwotę wpłaty.",
      "invalidResignationDeposit": "Podaj dodatnią kwotę zatrzymanej zaliczki albo zostaw pole puste.",
      "invalidResignationRefund": "Podaj dodatnią kwotę zwrotu albo zostaw pole puste.",
      "submit": "Nie udało się zapisać zmian uczestnika."
    },
    "fields": {
      "camp": "Obóz",
      "dates": "Termin",
      "discountAmount": "Kwota zniżki",
      "discountReason": "Powód zniżki",
      "moneyPlaceholder": "0,00",
      "nonRefundableDeposit": "Zatrzymana zaliczka",
      "optionalMoneyPlaceholder": "Opcjonalnie",
      "participant": "Uczestnik",
      "paymentAmount": "Kwota wpłaty",
      "paymentNote": "Notatka do wpłaty",
      "refundAmount": "Kwota zwrotu",
      "status": "Status"
    },
    "payment": {
      "progressLabel": "Postęp płatności uczestnika",
      "refund": "Do zwrotu",
      "remaining": "Pozostało: {amount}",
      "status": "Status płatności"
    },
    "states": {
      "loading": "Wczytywanie uczestnika",
      "loadError": "Nie udało się wczytać uczestnika.",
      "notFound": "Nie znaleziono uczestnika."
    },
    "status": {
      "fullyPaid": "Opłacony",
      "registered": "Zapisany",
      "resigned": "Rezygnacja"
    }
  },
  "en": {
    "sections": {
      "participant": "Camp participant",
      "payment": "Payment status",
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
    "dates": {
      "range": "{start} - {finish}"
    },
    "errors": {
      "invalidDiscount": "Enter a positive discount amount.",
      "invalidPayment": "Enter a positive payment amount.",
      "invalidResignationDeposit": "Enter a positive retained deposit or leave it empty.",
      "invalidResignationRefund": "Enter a positive refund amount or leave it empty.",
      "submit": "Participant changes could not be saved."
    },
    "fields": {
      "camp": "Camp",
      "dates": "Dates",
      "discountAmount": "Discount amount",
      "discountReason": "Discount reason",
      "moneyPlaceholder": "0.00",
      "nonRefundableDeposit": "Retained deposit",
      "optionalMoneyPlaceholder": "Optional",
      "participant": "Participant",
      "paymentAmount": "Payment amount",
      "paymentNote": "Payment note",
      "refundAmount": "Refund amount",
      "status": "Status"
    },
    "payment": {
      "progressLabel": "Participant payment progress",
      "refund": "To refund",
      "remaining": "Remaining: {amount}",
      "status": "Payment status"
    },
    "states": {
      "loading": "Loading participant",
      "loadError": "Participant could not be loaded.",
      "notFound": "Participant was not found."
    },
    "status": {
      "fullyPaid": "Paid",
      "registered": "Registered",
      "resigned": "Resigned"
    }
  }
}
</i18n>
