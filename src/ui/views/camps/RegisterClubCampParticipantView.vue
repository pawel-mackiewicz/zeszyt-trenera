<script setup lang="ts">
import {
  ArrowLeft,
  BadgePercent,
  Banknote,
  RotateCcw,
  Tent,
  UserPlus,
  UserRound
} from '@lucide/vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import AppButton from '@/ui/components/AppButton.vue'
import FloatingErrorAlert from '@/ui/components/FloatingErrorAlert.vue'
import { useRoute, useRouter } from '@/ui/router/runtime'
import type { MoneySnapshot } from '@/write/shared/vo/Money'
import { useRegisterClubCampParticipant } from './useRegisterClubCampParticipant'

const route = useRoute()
const router = useRouter()
const { locale, t } = useI18n({ useScope: 'local' })

const campId = computed(() => getRouteParam(route.params.campId))
const memberId = computed(() => getRouteParam(route.params.memberId))
const {
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
} = useRegisterClubCampParticipant({
  campId,
  memberId
})
type OverpaymentWarningField = 'discount' | 'payment'

const overpaymentWarningTarget = ref<OverpaymentWarningField>('payment')
const submitErrorMessage = computed(() =>
  submitError.value === null ? '' : t(`errors.${submitError.value}`)
)
const overpaymentWarningField = computed<OverpaymentWarningField | null>(() => {
  if (!overpaymentAmount.value) {
    return null
  }

  if (overpaymentWarningTarget.value === 'discount' && discountEnabled.value) {
    return 'discount'
  }

  if (overpaymentWarningTarget.value === 'payment' && paymentEnabled.value) {
    return 'payment'
  }

  if (paymentEnabled.value) {
    return 'payment'
  }

  if (discountEnabled.value) {
    return 'discount'
  }

  return null
})

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

function goBackToList() {
  void router.replace(
    `/camps/${encodeURIComponent(campId.value)}/participants/new`
  )
}

function markOverpaymentWarningTarget(field: OverpaymentWarningField) {
  overpaymentWarningTarget.value = field
}

async function handleSubmit() {
  if (await submit()) {
    void router.replace(`/camps/${encodeURIComponent(campId.value)}`)
  }
}
</script>

<template>
  <main class="register-club-camp-participant-view">
    <FloatingErrorAlert
      v-if="submitErrorMessage"
      :message="submitErrorMessage"
      top-offset="shell"
      @dismiss="dismissSubmitError"
    />

    <section
      v-if="isLoading || loadError || !context"
      class="register-club-camp-participant-view__form"
    >
      <div
        class="app-section-label register-club-camp-participant-view__label-bar"
      >
        {{ t('sections.registration') }}
      </div>
      <div class="register-club-camp-participant-view__body">
        <p class="register-club-camp-participant-view__state">
          {{ isLoading ? t('states.loading') : t('states.loadError') }}
        </p>
        <div class="register-club-camp-participant-view__actions">
          <AppButton
            v-if="loadError"
            class="register-club-camp-participant-view__action-button"
            type="button"
            variant="primary"
            @click="reload"
          >
            <RotateCcw
              class="register-club-camp-participant-view__button-icon"
              aria-hidden="true"
            />
            {{ t('actions.retry') }}
          </AppButton>
          <AppButton
            class="register-club-camp-participant-view__action-button"
            type="button"
            variant="secondary"
            @click="goBackToList"
          >
            <ArrowLeft
              class="register-club-camp-participant-view__button-icon"
              aria-hidden="true"
            />
            {{ t('actions.backToPicker') }}
          </AppButton>
        </div>
      </div>
    </section>

    <form
      v-else
      class="register-club-camp-participant-view__form"
      @submit.prevent="handleSubmit"
    >
      <div
        class="app-section-label register-club-camp-participant-view__label-bar"
      >
        {{ t('sections.registration') }}
      </div>

      <div class="register-club-camp-participant-view__body">
        <div class="register-club-camp-participant-view__summary">
          <div class="register-club-camp-participant-view__summary-item">
            <span
              class="app-section-label register-club-camp-participant-view__summary-label"
            >
              <UserRound
                class="register-club-camp-participant-view__label-icon"
                aria-hidden="true"
              />
              {{ t('fields.member.label') }}
            </span>
            <span class="register-club-camp-participant-view__summary-value">
              {{ context.member.firstName }} {{ context.member.lastName }}
            </span>
          </div>
          <div class="register-club-camp-participant-view__summary-item">
            <span
              class="app-section-label register-club-camp-participant-view__summary-label"
            >
              <Tent
                class="register-club-camp-participant-view__label-icon"
                aria-hidden="true"
              />
              {{ t('fields.camp.label') }}
            </span>
            <span class="register-club-camp-participant-view__summary-value">
              {{ context.camp.name }}
            </span>
          </div>
        </div>

        <div class="register-club-camp-participant-view__field">
          <span
            id="campParticipantPriceLabel"
            class="app-section-label register-club-camp-participant-view__field-label"
          >
            <Banknote
              class="register-club-camp-participant-view__label-icon"
              aria-hidden="true"
            />
            {{ t('fields.price.label') }}
          </span>
          <output
            id="campParticipantPrice"
            aria-labelledby="campParticipantPriceLabel"
            class="register-club-camp-participant-view__display-value"
          >
            {{ formatMoney(context.camp.price) }}
          </output>
        </div>

        <div class="register-club-camp-participant-view__toggle-group">
          <label
            class="app-section-label register-club-camp-participant-view__toggle-label"
            for="campParticipantDiscountEnabled"
          >
            <input
              id="campParticipantDiscountEnabled"
              v-model="discountEnabled"
              class="register-club-camp-participant-view__checkbox"
              type="checkbox"
            />
            <BadgePercent
              class="register-club-camp-participant-view__label-icon"
              aria-hidden="true"
            />
            {{ t('fields.discount.enabledLabel') }}
          </label>

          <div
            v-if="discountEnabled"
            class="register-club-camp-participant-view__field"
          >
            <label
              class="app-section-label register-club-camp-participant-view__sub-label"
              for="campParticipantDiscountAmount"
            >
              {{ t('fields.discount.amountLabel') }}
            </label>
            <input
              id="campParticipantDiscountAmount"
              v-model="discountAmount"
              class="register-club-camp-participant-view__control"
              inputmode="decimal"
              :placeholder="t('fields.money.placeholder')"
              type="text"
              @focus="markOverpaymentWarningTarget('discount')"
              @input="markOverpaymentWarningTarget('discount')"
            />
            <p
              v-if="overpaymentWarningField === 'discount' && overpaymentAmount"
              id="campParticipantDiscountOverpaymentWarning"
              class="register-club-camp-participant-view__amount-warning"
              role="alert"
            >
              {{
                t('fields.discount.overpaymentWarning', {
                  amount: formatMoney(overpaymentAmount)
                })
              }}
            </p>
          </div>
        </div>

        <div class="register-club-camp-participant-view__toggle-group">
          <label
            class="app-section-label register-club-camp-participant-view__toggle-label"
            for="campParticipantPaymentEnabled"
          >
            <input
              id="campParticipantPaymentEnabled"
              v-model="paymentEnabled"
              class="register-club-camp-participant-view__checkbox"
              type="checkbox"
            />
            <Banknote
              class="register-club-camp-participant-view__label-icon"
              aria-hidden="true"
            />
            {{ t('fields.payment.enabledLabel') }}
          </label>

          <div
            v-if="paymentEnabled"
            class="register-club-camp-participant-view__field"
          >
            <label
              class="app-section-label register-club-camp-participant-view__sub-label"
              for="campParticipantPaymentAmount"
            >
              {{ t('fields.payment.amountLabel') }}
            </label>
            <input
              id="campParticipantPaymentAmount"
              v-model="paymentAmount"
              class="register-club-camp-participant-view__control"
              inputmode="decimal"
              :placeholder="t('fields.money.placeholder')"
              type="text"
              @focus="markOverpaymentWarningTarget('payment')"
              @input="markOverpaymentWarningTarget('payment')"
            />
            <p
              v-if="overpaymentWarningField === 'payment' && overpaymentAmount"
              id="campParticipantPaymentOverpaymentWarning"
              class="register-club-camp-participant-view__amount-warning"
              role="alert"
            >
              {{
                t('fields.payment.overpaymentWarning', {
                  amount: formatMoney(overpaymentAmount)
                })
              }}
            </p>
          </div>
        </div>

        <div
          v-if="amountYetToPay"
          class="register-club-camp-participant-view__amount-yet-to-pay"
          aria-live="polite"
        >
          <span
            id="campParticipantAmountYetToPayLabel"
            class="app-section-label register-club-camp-participant-view__field-label"
          >
            <Banknote
              class="register-club-camp-participant-view__label-icon"
              aria-hidden="true"
            />
            {{ t('fields.amountYetToPay.label') }}
          </span>
          <output
            id="campParticipantAmountYetToPay"
            aria-labelledby="campParticipantAmountYetToPayLabel"
            class="register-club-camp-participant-view__amount-yet-to-pay-value"
          >
            {{ formatMoney(amountYetToPay) }}
          </output>
        </div>

        <div class="register-club-camp-participant-view__actions">
          <AppButton
            class="register-club-camp-participant-view__action-button register-club-camp-participant-view__action-button--submit"
            type="submit"
            :disabled="isSubmitting"
            variant="primary"
          >
            <UserPlus
              class="register-club-camp-participant-view__button-icon"
              aria-hidden="true"
            />
            {{ isSubmitting ? t('actions.submitting') : t('actions.submit') }}
          </AppButton>
          <AppButton
            class="register-club-camp-participant-view__action-button"
            type="button"
            variant="secondary"
            @click="goBackToList"
          >
            <ArrowLeft
              class="register-club-camp-participant-view__button-icon"
              aria-hidden="true"
            />
            {{ t('actions.backToPicker') }}
          </AppButton>
        </div>
      </div>
    </form>
  </main>
</template>

<style scoped>
.register-club-camp-participant-view {
  min-height: 100%;
  padding: 2rem 1rem 0;
}

.register-club-camp-participant-view__form {
  max-width: 42rem;
  margin: 0 auto;
  border: 1px solid var(--color-on-surface);
  background: var(--color-surface);
  box-shadow: 4px 4px 0 0 var(--color-on-surface);
}

.register-club-camp-participant-view__label-bar {
  margin: 0;
  padding: 0.9rem 1rem;
  border-block-end: 1px solid var(--color-on-surface);
  background: var(--color-on-surface);
  color: var(--color-on-primary);
  font-size: 0.875rem;
}

.register-club-camp-participant-view__body {
  display: grid;
  gap: 1.5rem;
  padding: 1.5rem 1rem;
}

.register-club-camp-participant-view__summary {
  display: grid;
  gap: 1rem;
  padding-block-end: 1.5rem;
  border-block-end: 1px dashed var(--color-on-surface);
}

.register-club-camp-participant-view__summary-item,
.register-club-camp-participant-view__field,
.register-club-camp-participant-view__amount-yet-to-pay,
.register-club-camp-participant-view__toggle-group {
  display: grid;
  gap: 0.5rem;
}

.register-club-camp-participant-view__summary-label,
.register-club-camp-participant-view__field-label,
.register-club-camp-participant-view__sub-label,
.register-club-camp-participant-view__toggle-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.register-club-camp-participant-view__summary-label,
.register-club-camp-participant-view__field-label,
.register-club-camp-participant-view__toggle-label {
  color: var(--color-on-surface);
}

.register-club-camp-participant-view__sub-label {
  color: var(--color-secondary);
}

.register-club-camp-participant-view__label-icon {
  flex: 0 0 auto;
  width: 0.9rem;
  height: 0.9rem;
  color: var(--color-secondary);
  stroke-width: 2.25;
}

.register-club-camp-participant-view__summary-value {
  overflow-wrap: anywhere;
  font-family: var(--font-headline);
  font-size: 1.35rem;
  font-weight: 800;
  line-height: 1.1;
  text-transform: uppercase;
  color: var(--color-on-surface);
}

.register-club-camp-participant-view__amount-yet-to-pay {
  padding-block: 1rem;
}

.register-club-camp-participant-view__amount-yet-to-pay-value {
  overflow-wrap: anywhere;
  font-family: var(--font-headline);
  font-size: 1.35rem;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  line-height: 1.1;
  color: var(--color-on-surface);
}

.register-club-camp-participant-view__amount-warning {
  margin: 0.25rem 0 0;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1.45;
  text-transform: uppercase;
  color: var(--color-danger);
}

.register-club-camp-participant-view__display-value {
  overflow-wrap: anywhere;
  font-family: var(--font-mono);
  font-size: 0.95rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  line-height: 1.4;
  color: var(--color-on-surface);
}

.register-club-camp-participant-view__control {
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

.register-club-camp-participant-view__control::placeholder {
  color: var(--color-secondary);
  font-style: italic;
  font-weight: 400;
  letter-spacing: 0;
  opacity: 0.62;
}

.register-club-camp-participant-view__control:focus {
  border-bottom-color: var(--color-primary);
  border-bottom-width: 2px;
  outline: 0;
}

.register-club-camp-participant-view__checkbox {
  width: 1rem;
  height: 1rem;
  accent-color: var(--color-primary);
}

.register-club-camp-participant-view__state {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  line-height: 1.5;
  text-transform: uppercase;
  color: var(--color-secondary);
}

.register-club-camp-participant-view__actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-block-start: 2rem;
  border-block-start: 1px dashed var(--color-on-surface);
}

.register-club-camp-participant-view__action-button {
  width: 100%;
  min-height: 3.5rem;
}

.register-club-camp-participant-view__button-icon {
  flex: 0 0 auto;
  width: 0.95rem;
  height: 0.95rem;
  color: currentColor;
  stroke-width: 2.25;
}

@media (min-width: 48rem) {
  .register-club-camp-participant-view {
    padding-inline: 2rem;
  }

  .register-club-camp-participant-view__body {
    gap: 2rem;
    padding: 2rem;
  }

  .register-club-camp-participant-view__summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .register-club-camp-participant-view__actions {
    flex-flow: row wrap;
    align-items: stretch;
  }

  .register-club-camp-participant-view__action-button {
    flex: 1 1 12rem;
    width: auto;
  }

  .register-club-camp-participant-view__action-button--submit {
    flex-basis: 100%;
  }
}
</style>

<i18n lang="json">
{
  "pl": {
    "sections": {
      "registration": "Zapis na obóz"
    },
    "actions": {
      "backToPicker": "Wróć do wyboru",
      "retry": "Spróbuj ponownie",
      "submit": "Zapisz klubowicza",
      "submitting": "Zapisywanie..."
    },
    "states": {
      "loading": "Wczytywanie zapisu",
      "loadError": "Nie udało się wczytać danych zapisu."
    },
    "errors": {
      "alreadySigned": "Ten klubowicz jest już zapisany na ten obóz.",
      "invalidDiscount": "Podaj dodatnią kwotę zniżki.",
      "invalidPayment": "Podaj dodatnią kwotę wpłaty.",
      "load": "Nie udało się wczytać danych zapisu.",
      "missingContext": "Nie znaleziono obozu albo klubowicza.",
      "overpayment": "Zniżka i wpłata nie mogą przekroczyć ceny obozu.",
      "submit": "Nie udało się zapisać uczestnika. Sprawdź dane i spróbuj ponownie."
    },
    "fields": {
      "amountYetToPay": {
        "label": "Pozostało do zapłaty"
      },
      "camp": {
        "label": "Obóz"
      },
      "discount": {
        "amountLabel": "Kwota zniżki",
        "enabledLabel": "Przyznaj zniżkę",
        "overpaymentWarning": "Zniżka powoduje nadpłatę: {amount}"
      },
      "member": {
        "label": "Klubowicz"
      },
      "money": {
        "placeholder": "0,00"
      },
      "payment": {
        "amountLabel": "Kwota wpłaty",
        "enabledLabel": "Przyjmij wpłatę",
        "overpaymentWarning": "Wpłata powoduje nadpłatę: {amount}"
      },
      "price": {
        "label": "Cena obozu"
      }
    }
  },
  "en": {
    "sections": {
      "registration": "Camp registration"
    },
    "actions": {
      "backToPicker": "Back to picker",
      "retry": "Try again",
      "submit": "Register club member",
      "submitting": "Saving..."
    },
    "states": {
      "loading": "Loading registration",
      "loadError": "The registration data could not be loaded."
    },
    "errors": {
      "alreadySigned": "This club member is already signed to this camp.",
      "invalidDiscount": "Enter a positive discount amount.",
      "invalidPayment": "Enter a positive payment amount.",
      "load": "The registration data could not be loaded.",
      "missingContext": "The camp or club member could not be found.",
      "overpayment": "Discount and payment cannot exceed the camp price.",
      "submit": "The participant could not be saved. Check the details and try again."
    },
    "fields": {
      "amountYetToPay": {
        "label": "Amount yet to pay"
      },
      "camp": {
        "label": "Camp"
      },
      "discount": {
        "amountLabel": "Discount amount",
        "enabledLabel": "Grant discount",
        "overpaymentWarning": "Discount causes overpayment: {amount}"
      },
      "member": {
        "label": "Club member"
      },
      "money": {
        "placeholder": "0.00"
      },
      "payment": {
        "amountLabel": "Payment amount",
        "enabledLabel": "Accept payment",
        "overpaymentWarning": "Payment causes overpayment: {amount}"
      },
      "price": {
        "label": "Camp price"
      }
    }
  }
}
</i18n>
