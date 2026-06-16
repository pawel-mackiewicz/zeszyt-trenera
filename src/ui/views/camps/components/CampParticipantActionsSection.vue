<script setup lang="ts">
import { BadgePercent, Banknote, UserMinus } from '@lucide/vue'
import { computed, ref, toRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import AppButton from '@/ui/components/AppButton.vue'
import FloatingErrorAlert from '@/ui/components/FloatingErrorAlert.vue'
import BaseModal from '@/ui/components/modals/BaseModal.vue'
import type { MoneySnapshot } from '@/write/shared/vo/Money'

import { useCampParticipantActions } from '../useCampParticipantActions'

type ActionModal = 'discount' | 'payment' | 'resignation'
type FormErrorKey =
  | 'depositExceedsRefundable'
  | 'invalidDiscount'
  | 'invalidPayment'
  | 'invalidResignationDeposit'
  | 'invalidResignationRefund'
  | 'refundExceedsAvailable'

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

const activeActionModal = ref<ActionModal | null>(null)
const discountAmount = ref('')
const discountReason = ref('')
const paymentAmount = ref('')
const paymentNote = ref('')
const resignationDeductsDeposit = ref(false)
const resignationDepositAmount = ref('')
const resignationSettled = ref(false)
const resignationRefundAmount = ref('')
const formError = ref<FormErrorKey | null>(null)

const hasOpenActionModal = computed(() => activeActionModal.value !== null)
const hasAvailableActions = computed(
  () =>
    Boolean(actionsContext.value?.canGrantDiscount) ||
    Boolean(actionsContext.value?.canRegisterPayment) ||
    Boolean(actionsContext.value?.canAcceptResignation)
)
const actionCurrency = computed(
  () =>
    actionsContext.value?.paymentPrefillAmount?.currency ??
    actionsContext.value?.refundableBalance.currency ??
    'PLN'
)
const refundableBalance = computed<MoneySnapshot>(() =>
  actionsContext.value?.refundableBalance
    ? actionsContext.value.refundableBalance
    : {
        amountMinor: 0,
        currency: actionCurrency.value
      }
)
const resignationDepositPreviewMinor = computed(() =>
  resignationDeductsDeposit.value
    ? parsePositiveMoneyMinorForPreview(resignationDepositAmount.value)
    : 0
)
const resignationRefundPreview = computed<MoneySnapshot>(() => ({
  amountMinor: Math.max(
    0,
    refundableBalance.value.amountMinor - resignationDepositPreviewMinor.value
  ),
  currency: refundableBalance.value.currency
}))
const formErrorMessage = computed(() =>
  formError.value === null ? '' : t(`errors.${formError.value}`)
)
const submitErrorMessage = computed(() =>
  submitError.value ? t('errors.submit') : ''
)
const submitErrorStackLevel = computed<'base' | 'modal'>(() =>
  hasOpenActionModal.value ? 'modal' : 'base'
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
  if (activeActionModal.value && !isModalAvailable(activeActionModal.value)) {
    resetForms()
  }
})

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

function isModalAvailable(modal: ActionModal): boolean {
  if (modal === 'discount') {
    return Boolean(actionsContext.value?.canGrantDiscount)
  }

  if (modal === 'payment') {
    return Boolean(actionsContext.value?.canRegisterPayment)
  }

  return Boolean(actionsContext.value?.canAcceptResignation)
}

function parseMoney(
  value: string,
  currency = actionCurrency.value
): MoneySnapshot | null {
  const normalizedValue = value.trim().replace(',', '.')
  const amount = Number(normalizedValue)
  const amountMinor = Math.round(amount * 100)

  if (!Number.isFinite(amount) || amountMinor <= 0) {
    return null
  }

  return {
    amountMinor,
    currency
  }
}

function parseNonNegativeMoney(
  value: string,
  currency = actionCurrency.value
): MoneySnapshot | null {
  const normalizedValue = value.trim().replace(',', '.')

  if (normalizedValue.length === 0) {
    return null
  }

  const amount = Number(normalizedValue)
  const amountMinor = Math.round(amount * 100)

  if (!Number.isFinite(amount) || amountMinor < 0) {
    return null
  }

  return {
    amountMinor,
    currency
  }
}

function parsePositiveMoneyMinorForPreview(value: string): number {
  const parsedValue = parseMoney(value, refundableBalance.value.currency)

  return parsedValue?.amountMinor ?? 0
}

function optionalText(value: string): string | undefined {
  const trimmedValue = value.trim()

  return trimmedValue.length > 0 ? trimmedValue : undefined
}

function formatMoneyInput(money: MoneySnapshot): string {
  return (money.amountMinor / 100).toFixed(2).replace('.', ',')
}

function formatMoney(money: MoneySnapshot): string {
  return `${formatMoneyInput(money)} ${money.currency}`
}

function showActionModal(modal: ActionModal) {
  if (!isModalAvailable(modal)) {
    return
  }

  resetFormFields()
  activeActionModal.value = modal
  clearSubmitError()

  if (modal === 'payment' && actionsContext.value?.paymentPrefillAmount) {
    paymentAmount.value = formatMoneyInput(
      actionsContext.value.paymentPrefillAmount
    )
  }
}

function closeActionModal() {
  if (isSubmitting.value) {
    return
  }

  resetForms()
}

function resetFormFields() {
  discountAmount.value = ''
  discountReason.value = ''
  paymentAmount.value = ''
  paymentNote.value = ''
  resignationDeductsDeposit.value = false
  resignationDepositAmount.value = ''
  resignationSettled.value = false
  resignationRefundAmount.value = ''
  formError.value = null
}

function resetForms() {
  activeActionModal.value = null
  resetFormFields()
  clearSubmitError()
}

function prefillResignationRefund() {
  resignationRefundAmount.value = formatMoneyInput(
    resignationRefundPreview.value
  )
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
  const nonRefundableDepositValue = resignationDeductsDeposit.value
    ? parseMoney(
        resignationDepositAmount.value,
        refundableBalance.value.currency
      )
    : undefined

  if (resignationDeductsDeposit.value && !nonRefundableDepositValue) {
    formError.value = 'invalidResignationDeposit'
    return
  }

  if (
    nonRefundableDepositValue &&
    nonRefundableDepositValue.amountMinor > refundableBalance.value.amountMinor
  ) {
    formError.value = 'depositExceedsRefundable'
    return
  }

  const settledRefundValue = resignationSettled.value
    ? parseNonNegativeMoney(
        resignationRefundAmount.value,
        refundableBalance.value.currency
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
  const acceptedNonRefundableDepositValue: MoneySnapshot | undefined =
    nonRefundableDepositValue ?? undefined
  const refundedValue: MoneySnapshot | undefined =
    settledRefundValue && settledRefundValue.amountMinor > 0
      ? settledRefundValue
      : undefined

  if (
    await acceptResignation({
      nonRefundableDepositValue: acceptedNonRefundableDepositValue,
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
    :stack-level="submitErrorStackLevel"
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
            @click="showActionModal('discount')"
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
            @click="showActionModal('payment')"
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
            @click="showActionModal('resignation')"
          >
            <UserMinus
              class="camp-participant-actions-section__button-icon"
              aria-hidden="true"
            />
            {{ t('actions.resignation') }}
          </AppButton>
        </div>
      </template>
    </div>
  </section>

  <template v-if="actionsContext">
    <BaseModal
      :visible="activeActionModal === 'discount'"
      :title="t('modals.discountTitle')"
      @close="closeActionModal"
    >
      <div class="camp-participant-actions-section__modal-brief">
        <p class="camp-participant-actions-section__modal-brief-label">
          {{ t('fields.subject') }}
        </p>
        <p class="camp-participant-actions-section__modal-brief-name">
          {{ actionsContext.subject.participantDisplayName }}
        </p>
        <p class="camp-participant-actions-section__modal-brief-camp">
          {{ actionsContext.subject.campName }}
        </p>
      </div>

      <form
        id="campParticipantDiscountForm"
        class="camp-participant-actions-section__modal-form"
        @submit.prevent="submitDiscount"
      >
        <p
          v-if="formErrorMessage"
          class="camp-participant-actions-section__form-error"
          role="alert"
        >
          {{ formErrorMessage }}
        </p>
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
      </form>

      <template #actions>
        <AppButton
          class="camp-participant-actions-section__modal-action"
          type="submit"
          form="campParticipantDiscountForm"
          :disabled="isSubmitting"
        >
          {{
            isSubmitting
              ? t('actions.submitting')
              : t('actions.confirmDiscount')
          }}
        </AppButton>
        <AppButton
          class="camp-participant-actions-section__modal-action"
          type="button"
          variant="secondary"
          :disabled="isSubmitting"
          @click="closeActionModal"
        >
          {{ t('actions.cancel') }}
        </AppButton>
      </template>
    </BaseModal>

    <BaseModal
      :visible="activeActionModal === 'payment'"
      :title="t('modals.paymentTitle')"
      @close="closeActionModal"
    >
      <div class="camp-participant-actions-section__modal-brief">
        <p class="camp-participant-actions-section__modal-brief-label">
          {{ t('fields.subject') }}
        </p>
        <p class="camp-participant-actions-section__modal-brief-name">
          {{ actionsContext.subject.participantDisplayName }}
        </p>
        <p class="camp-participant-actions-section__modal-brief-camp">
          {{ actionsContext.subject.campName }}
        </p>
      </div>

      <form
        id="campParticipantPaymentForm"
        class="camp-participant-actions-section__modal-form"
        @submit.prevent="submitPayment"
      >
        <p
          v-if="formErrorMessage"
          class="camp-participant-actions-section__form-error"
          role="alert"
        >
          {{ formErrorMessage }}
        </p>
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
      </form>

      <template #actions>
        <AppButton
          class="camp-participant-actions-section__modal-action"
          type="submit"
          form="campParticipantPaymentForm"
          :disabled="isSubmitting"
        >
          {{
            isSubmitting ? t('actions.submitting') : t('actions.confirmPayment')
          }}
        </AppButton>
        <AppButton
          class="camp-participant-actions-section__modal-action"
          type="button"
          variant="secondary"
          :disabled="isSubmitting"
          @click="closeActionModal"
        >
          {{ t('actions.cancel') }}
        </AppButton>
      </template>
    </BaseModal>

    <BaseModal
      :visible="activeActionModal === 'resignation'"
      :title="t('modals.resignationTitle')"
      @close="closeActionModal"
    >
      <div class="camp-participant-actions-section__modal-brief">
        <p class="camp-participant-actions-section__modal-brief-label">
          {{ t('fields.subject') }}
        </p>
        <p class="camp-participant-actions-section__modal-brief-name">
          {{ actionsContext.subject.participantDisplayName }}
        </p>
        <p class="camp-participant-actions-section__modal-brief-camp">
          {{ actionsContext.subject.campName }}
        </p>
      </div>

      <form
        id="campParticipantResignationForm"
        class="camp-participant-actions-section__modal-form"
        @submit.prevent="submitResignation"
      >
        <p
          v-if="formErrorMessage"
          class="camp-participant-actions-section__form-error"
          role="alert"
        >
          {{ formErrorMessage }}
        </p>

        <label class="camp-participant-actions-section__toggle">
          <input
            v-model="resignationDeductsDeposit"
            class="camp-participant-actions-section__checkbox"
            type="checkbox"
          />
          <span class="camp-participant-actions-section__toggle-label">
            {{ t('fields.deductDeposit') }}
          </span>
        </label>

        <div
          v-if="resignationDeductsDeposit"
          class="camp-participant-actions-section__conditional-field"
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
            :placeholder="t('fields.moneyPlaceholder')"
            type="text"
          />
        </div>

        <div
          class="camp-participant-actions-section__refund-summary"
          aria-live="polite"
        >
          <div>
            <p class="camp-participant-actions-section__refund-label">
              {{ t('fields.refundToReturn') }}
            </p>
            <p class="camp-participant-actions-section__refund-value">
              {{ formatMoney(resignationRefundPreview) }}
            </p>
          </div>
          <div class="camp-participant-actions-section__refund-meta">
            <span>{{ t('fields.paidBase') }}</span>
            <strong>{{ formatMoney(refundableBalance) }}</strong>
          </div>
        </div>

        <label class="camp-participant-actions-section__toggle">
          <input
            v-model="resignationSettled"
            class="camp-participant-actions-section__checkbox"
            type="checkbox"
          />
          <span class="camp-participant-actions-section__toggle-label">
            {{ t('fields.settled') }}
          </span>
        </label>

        <div
          v-if="resignationSettled"
          class="camp-participant-actions-section__conditional-field"
        >
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
            :placeholder="t('fields.moneyPlaceholder')"
            type="text"
          />
        </div>
      </form>

      <template #actions>
        <AppButton
          class="camp-participant-actions-section__modal-action"
          type="submit"
          form="campParticipantResignationForm"
          :disabled="isSubmitting"
        >
          {{
            isSubmitting
              ? t('actions.submitting')
              : t('actions.confirmResignation')
          }}
        </AppButton>
        <AppButton
          class="camp-participant-actions-section__modal-action"
          type="button"
          variant="secondary"
          :disabled="isSubmitting"
          @click="closeActionModal"
        >
          {{ t('actions.cancel') }}
        </AppButton>
      </template>
    </BaseModal>
  </template>
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

.camp-participant-actions-section__action-button {
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

.camp-participant-actions-section__modal-brief {
  display: grid;
  gap: 0.25rem;
  padding-block: 0.15rem;
  padding-inline-start: 1rem;
  border-inline-start: 4px solid var(--color-primary);
}

.camp-participant-actions-section__modal-brief-label,
.camp-participant-actions-section__modal-brief-camp,
.camp-participant-actions-section__refund-label,
.camp-participant-actions-section__refund-meta,
.camp-participant-actions-section__toggle-label {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  line-height: 1.4;
  text-transform: uppercase;
}

.camp-participant-actions-section__modal-brief-label {
  color: var(--color-secondary);
}

.camp-participant-actions-section__modal-brief-name {
  margin: 0;
  font-family: var(--font-headline);
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1;
  text-transform: uppercase;
  color: var(--color-on-surface);
}

.camp-participant-actions-section__modal-brief-camp {
  color: var(--color-primary);
}

.camp-participant-actions-section__modal-form {
  display: grid;
  gap: 0.75rem;
}

.camp-participant-actions-section__conditional-field {
  display: grid;
  gap: 0.5rem;
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

.camp-participant-actions-section__toggle {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 2.5rem;
}

.camp-participant-actions-section__checkbox {
  flex: 0 0 auto;
  width: 1.35rem;
  height: 1.35rem;
  margin: 0;
  accent-color: var(--color-primary);
}

.camp-participant-actions-section__toggle-label {
  color: var(--color-on-surface);
}

.camp-participant-actions-section__refund-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid var(--color-on-surface);
  background: var(--color-on-surface);
  color: var(--color-on-primary);
}

.camp-participant-actions-section__refund-label {
  color: var(--color-surface-container-highest);
}

.camp-participant-actions-section__refund-value {
  margin: 0.15rem 0 0;
  font-family: var(--font-headline);
  font-size: clamp(1.75rem, 9vw, 2.5rem);
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1;
  text-transform: uppercase;
  color: var(--color-on-primary);
}

.camp-participant-actions-section__refund-meta {
  display: grid;
  gap: 0.25rem;
  flex: 0 0 auto;
  color: var(--color-surface-container-highest);
  text-align: end;
}

.camp-participant-actions-section__refund-meta strong {
  color: var(--color-on-primary);
}

.camp-participant-actions-section__modal-action {
  width: 100%;
}

@media (min-width: 48rem) {
  .camp-participant-actions-section__body {
    gap: 1.5rem;
    padding: 2rem;
  }

  .camp-participant-actions-section__actions {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .camp-participant-actions-section__modal-action {
    width: auto;
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
      "cancel": "Anuluj",
      "confirmDiscount": "Zapisz zniżkę",
      "confirmPayment": "Zapisz wpłatę",
      "confirmResignation": "Potwierdź rezygnację",
      "discount": "Przyznaj zniżkę",
      "payment": "Przyjmij płatność",
      "resignation": "Przyjmij rezygnację",
      "retry": "Spróbuj ponownie",
      "submitting": "Zapisywanie"
    },
    "errors": {
      "depositExceedsRefundable": "Zatrzymana zaliczka nie może być wyższa niż wpłacona kwota.",
      "invalidDiscount": "Podaj dodatnią kwotę zniżki.",
      "invalidPayment": "Podaj dodatnią kwotę wpłaty.",
      "invalidResignationDeposit": "Podaj dodatnią kwotę zatrzymanej zaliczki.",
      "invalidResignationRefund": "Podaj poprawną kwotę zwrotu.",
      "refundExceedsAvailable": "Zwrot nie może być wyższy niż kwota do zwrotu.",
      "submit": "Nie udało się zapisać zmian uczestnika."
    },
    "fields": {
      "deductDeposit": "Odliczamy zadatek?",
      "discountAmount": "Kwota zniżki",
      "discountReason": "Powód zniżki",
      "moneyPlaceholder": "0,00",
      "nonRefundableDeposit": "Kwota zadatku",
      "paidBase": "Wpłacono",
      "paymentAmount": "Kwota wpłaty",
      "paymentNote": "Notatka do wpłaty",
      "refundAmount": "Zwrócono",
      "refundToReturn": "Kwota do zwrotu",
      "settled": "Zwrócono wpłatę?",
      "subject": "Uczestnik / wydarzenie"
    },
    "modals": {
      "discountTitle": "Przyznaj zniżkę",
      "paymentTitle": "Przyjmij płatność",
      "resignationTitle": "Przyjmij rezygnację"
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
      "cancel": "Cancel",
      "confirmDiscount": "Save discount",
      "confirmPayment": "Save payment",
      "confirmResignation": "Confirm resignation",
      "discount": "Grant discount",
      "payment": "Receive payment",
      "resignation": "Accept resignation",
      "retry": "Try again",
      "submitting": "Saving"
    },
    "errors": {
      "depositExceedsRefundable": "The retained deposit cannot be higher than the paid amount.",
      "invalidDiscount": "Enter a positive discount amount.",
      "invalidPayment": "Enter a positive payment amount.",
      "invalidResignationDeposit": "Enter a positive retained deposit.",
      "invalidResignationRefund": "Enter a valid refund amount.",
      "refundExceedsAvailable": "The refund cannot be higher than the amount to return.",
      "submit": "Participant changes could not be saved."
    },
    "fields": {
      "deductDeposit": "Deduct deposit?",
      "discountAmount": "Discount amount",
      "discountReason": "Discount reason",
      "moneyPlaceholder": "0.00",
      "nonRefundableDeposit": "Deposit amount",
      "paidBase": "Paid",
      "paymentAmount": "Payment amount",
      "paymentNote": "Payment note",
      "refundAmount": "Refunded",
      "refundToReturn": "Amount to return",
      "settled": "Payment refunded?",
      "subject": "Participant / event"
    },
    "modals": {
      "discountTitle": "Grant discount",
      "paymentTitle": "Receive payment",
      "resignationTitle": "Accept resignation"
    },
    "states": {
      "loading": "Loading participant actions",
      "loadError": "Participant actions could not be loaded.",
      "notFound": "Participant was not found."
    }
  }
}
</i18n>
