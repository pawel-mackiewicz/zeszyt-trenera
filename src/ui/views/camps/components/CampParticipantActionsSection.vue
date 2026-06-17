<script setup lang="ts">
import { BadgePercent, Banknote, HandCoins, UserMinus } from '@lucide/vue'
import { computed, ref, toRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import AppButton from '@/ui/components/AppButton.vue'
import FloatingErrorAlert from '@/ui/components/FloatingErrorAlert.vue'
import type { MoneySnapshot } from '@/write/shared/vo/Money'

import { useCampParticipantActions } from '../useCampParticipantActions'
import CampParticipantDiscountModal from './CampParticipantDiscountModal.vue'
import CampParticipantPaymentModal from './CampParticipantPaymentModal.vue'
import CampParticipantRefundModal from './CampParticipantRefundModal.vue'
import CampParticipantResignationModal from './CampParticipantResignationModal.vue'
import type {
  CampParticipantDiscountSubmit,
  CampParticipantPaymentSubmit,
  CampParticipantRefundSubmit,
  CampParticipantResignationSubmit
} from './campParticipantActionModalUtils'

type ActionModal = 'discount' | 'payment' | 'refund' | 'resignation'

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
  registerRefund,
  retryLoading,
  submitError
} = useCampParticipantActions({
  campId: toRef(props, 'campId'),
  participantId: toRef(props, 'participantId')
})

const activeActionModal = ref<ActionModal | null>(null)

const hasOpenActionModal = computed(() => activeActionModal.value !== null)
const hasAvailableActions = computed(
  () =>
    Boolean(actionsContext.value?.canGrantDiscount) ||
    Boolean(actionsContext.value?.canRegisterPayment) ||
    Boolean(actionsContext.value?.canRegisterRefund) ||
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

function isModalAvailable(modal: ActionModal): boolean {
  if (modal === 'discount') {
    return Boolean(actionsContext.value?.canGrantDiscount)
  }

  if (modal === 'payment') {
    return Boolean(actionsContext.value?.canRegisterPayment)
  }

  if (modal === 'refund') {
    return Boolean(actionsContext.value?.canRegisterRefund)
  }

  return Boolean(actionsContext.value?.canAcceptResignation)
}

function showActionModal(modal: ActionModal) {
  if (!isModalAvailable(modal)) {
    return
  }

  activeActionModal.value = modal
  clearSubmitError()
}

function closeActionModal() {
  if (isSubmitting.value) {
    return
  }

  resetForms()
}

function resetForms() {
  activeActionModal.value = null
  clearSubmitError()
}

async function submitDiscount(payload: CampParticipantDiscountSubmit) {
  if (await registerDiscount(payload.amount, payload.reason)) {
    resetForms()
  }
}

async function submitPayment(payload: CampParticipantPaymentSubmit) {
  if (await registerPayment(payload.amount, payload.note)) {
    resetForms()
  }
}

async function submitRefund(payload: CampParticipantRefundSubmit) {
  if (await registerRefund(payload.amount, payload.note)) {
    resetForms()
  }
}

async function submitResignation(payload: CampParticipantResignationSubmit) {
  if (await acceptResignation(payload)) {
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
            v-if="actionsContext.canRegisterRefund"
            class="camp-participant-actions-section__action-button"
            type="button"
            variant="secondary"
            :disabled="isSubmitting"
            @click="showActionModal('refund')"
          >
            <HandCoins
              class="camp-participant-actions-section__button-icon"
              aria-hidden="true"
            />
            {{ t('actions.refund') }}
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
    <CampParticipantDiscountModal
      :visible="activeActionModal === 'discount'"
      :subject="actionsContext.subject"
      :currency="actionCurrency"
      :is-submitting="isSubmitting"
      @close="closeActionModal"
      @submit="submitDiscount"
    />

    <CampParticipantPaymentModal
      :visible="activeActionModal === 'payment'"
      :subject="actionsContext.subject"
      :currency="actionCurrency"
      :prefill-amount="actionsContext.paymentPrefillAmount ?? undefined"
      :is-submitting="isSubmitting"
      @close="closeActionModal"
      @submit="submitPayment"
    />

    <CampParticipantRefundModal
      :visible="activeActionModal === 'refund'"
      :subject="actionsContext.subject"
      :refundable-balance="refundableBalance"
      :is-submitting="isSubmitting"
      @close="closeActionModal"
      @submit="submitRefund"
    />

    <CampParticipantResignationModal
      :visible="activeActionModal === 'resignation'"
      :subject="actionsContext.subject"
      :refundable-balance="refundableBalance"
      :is-submitting="isSubmitting"
      @close="closeActionModal"
      @submit="submitResignation"
    />
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

.camp-participant-actions-section__state {
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

@media (min-width: 48rem) {
  .camp-participant-actions-section__body {
    gap: 1.5rem;
    padding: 2rem;
  }

  .camp-participant-actions-section__actions {
    grid-template-columns: repeat(4, minmax(0, 1fr));
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
      "discount": "Przyznaj zniżkę",
      "payment": "Przyjmij płatność",
      "refund": "Zarejestruj zwrot",
      "resignation": "Przyjmij rezygnację",
      "retry": "Spróbuj ponownie"
    },
    "errors": {
      "submit": "Nie udało się zapisać zmian uczestnika."
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
      "discount": "Grant discount",
      "payment": "Receive payment",
      "refund": "Register refund",
      "resignation": "Accept resignation",
      "retry": "Try again"
    },
    "errors": {
      "submit": "Participant changes could not be saved."
    },
    "states": {
      "loading": "Loading participant actions",
      "loadError": "Participant actions could not be loaded.",
      "notFound": "Participant was not found."
    }
  }
}
</i18n>
