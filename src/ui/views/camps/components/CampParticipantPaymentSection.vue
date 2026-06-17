<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useI18n } from 'vue-i18n'

import type {
  CampParticipantPaymentActive,
  CampParticipantPaymentRefund
} from '@/read/ObserveCampParticipantPaymentQuery'
import AppButton from '@/ui/components/AppButton.vue'
import type { MoneySnapshot } from '@/write/shared/vo/Money'

import { useCampParticipantPayment } from '../useCampParticipantPayment'

const props = defineProps<{
  campId: string
  participantId: string
}>()

const { locale, t } = useI18n({ useScope: 'local' })
const { isLoading, loadError, notFound, payment, retryLoading } =
  useCampParticipantPayment({
    campId: toRef(props, 'campId'),
    participantId: toRef(props, 'participantId')
  })

const activePayment = computed<CampParticipantPaymentActive | null>(() =>
  payment.value && 'amountDue' in payment.value ? payment.value : null
)
const refundPayment = computed<CampParticipantPaymentRefund | null>(() =>
  payment.value && 'amountToRefund' in payment.value ? payment.value : null
)
const discountSum = computed<MoneySnapshot | null>(() => {
  if (
    !activePayment.value ||
    activePayment.value.discountSum.amountMinor <= 0
  ) {
    return null
  }

  return activePayment.value.discountSum
})
const progressStyle = computed(() => ({
  width: `${Math.min(
    100,
    Math.max(0, activePayment.value?.paymentProgressPercent ?? 0)
  )}%`
}))
const remainingAmount = computed<MoneySnapshot | null>(() => {
  if (!activePayment.value) {
    return null
  }

  return {
    amountMinor: Math.max(
      0,
      activePayment.value.amountDue.amountMinor -
        activePayment.value.paidAmount.amountMinor
    ),
    currency: activePayment.value.amountDue.currency
  }
})

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
</script>

<template>
  <section
    class="camp-participant-payment-section"
    aria-labelledby="campParticipantPaymentHeading"
  >
    <div
      id="campParticipantPaymentHeading"
      class="app-section-label camp-participant-payment-section__label-bar"
    >
      {{ t('sections.payment') }}
    </div>
    <div class="camp-participant-payment-section__body">
      <template v-if="isLoading || loadError || notFound || !payment">
        <p class="camp-participant-payment-section__state">
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

      <template v-else-if="activePayment">
        <div class="camp-participant-payment-section__heading">
          <p class="camp-participant-payment-section__money">
            <strong>
              {{ formatMoney(activePayment.paidAmount) }}
            </strong>
            <span>/ {{ formatMoney(activePayment.amountDue) }}</span>
          </p>
        </div>

        <div
          class="camp-participant-payment-section__progress"
          role="progressbar"
          :aria-label="t('payment.progressLabel')"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-valuenow="activePayment.paymentProgressPercent"
        >
          <span
            class="camp-participant-payment-section__progress-value"
            :style="progressStyle"
          />
        </div>

        <div class="camp-participant-payment-section__summary">
          <p
            v-if="remainingAmount"
            class="camp-participant-payment-section__remaining"
            aria-live="polite"
          >
            {{
              t('payment.remaining', {
                amount: formatMoney(remainingAmount)
              })
            }}
          </p>

          <p
            v-if="discountSum"
            class="camp-participant-payment-section__discount"
          >
            {{
              t('payment.discount', {
                amount: formatMoney(discountSum)
              })
            }}
          </p>
        </div>
      </template>

      <template v-else-if="refundPayment">
        <h3 class="camp-participant-payment-section__headline">
          {{ t('payment.refund') }}
        </h3>
        <p
          class="camp-participant-payment-section__money camp-participant-payment-section__money--refund"
        >
          <strong>{{ formatMoney(refundPayment.amountToRefund) }}</strong>
        </p>
      </template>
    </div>
  </section>
</template>

<style scoped>
.camp-participant-payment-section {
  border: 1px solid var(--color-on-surface);
  background: var(--color-surface);
  box-shadow: 4px 4px 0 0 var(--color-on-surface);
}

.camp-participant-payment-section__label-bar {
  margin: 0;
  padding: 0.9rem 1rem;
  border-block-end: 1px solid var(--color-on-surface);
  background: var(--color-on-surface);
  color: var(--color-on-primary);
  font-size: 0.875rem;
}

.camp-participant-payment-section__body {
  display: grid;
  gap: 1.25rem;
  padding: 1.5rem 1rem;
}

.camp-participant-payment-section__heading {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  justify-content: flex-end;
  gap: 0.75rem 1rem;
}

.camp-participant-payment-section__headline,
.camp-participant-payment-section__money {
  margin: 0;
  overflow-wrap: anywhere;
}

.camp-participant-payment-section__headline {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  line-height: 1.35;
  text-transform: uppercase;
  color: var(--color-on-surface);
}

.camp-participant-payment-section__money {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1.4;
  text-align: end;
  text-transform: uppercase;
  color: var(--color-on-surface);
}

.camp-participant-payment-section__money--refund {
  justify-self: start;
  text-align: start;
}

.camp-participant-payment-section__money strong {
  color: var(--color-primary);
}

.camp-participant-payment-section__money span {
  color: var(--color-secondary);
}

.camp-participant-payment-section__progress {
  height: 1rem;
  border: 1px solid var(--color-on-surface);
  background: var(--color-surface-container-low);
}

.camp-participant-payment-section__progress-value {
  display: block;
  height: 100%;
  border-inline-end: 1px solid var(--color-on-surface);
  background: var(--color-primary);
}

.camp-participant-payment-section__summary {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.35rem 1rem;
}

.camp-participant-payment-section__discount {
  justify-self: end;
  max-width: 100%;
  margin-inline-start: auto;
  text-align: end;
  overflow-wrap: anywhere;
}

.camp-participant-payment-section__remaining,
.camp-participant-payment-section__discount,
.camp-participant-payment-section__state {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  line-height: 1.5;
  text-transform: uppercase;
  color: var(--color-secondary);
}

@media (min-width: 48rem) {
  .camp-participant-payment-section__body {
    gap: 1.5rem;
    padding: 2rem;
  }
}
</style>

<i18n lang="json">
{
  "pl": {
    "sections": {
      "payment": "Status płatności"
    },
    "actions": {
      "retry": "Spróbuj ponownie"
    },
    "payment": {
      "discount": "Zniżki: {amount}",
      "progressLabel": "Postęp płatności uczestnika",
      "refund": "Do zwrotu",
      "remaining": "Pozostało: {amount}"
    },
    "states": {
      "loading": "Wczytywanie płatności uczestnika",
      "loadError": "Nie udało się wczytać płatności uczestnika.",
      "notFound": "Nie znaleziono płatności uczestnika."
    }
  },
  "en": {
    "sections": {
      "payment": "Payment status"
    },
    "actions": {
      "retry": "Try again"
    },
    "payment": {
      "discount": "Discounts: {amount}",
      "progressLabel": "Participant payment progress",
      "refund": "To refund",
      "remaining": "Remaining: {amount}"
    },
    "states": {
      "loading": "Loading participant payment",
      "loadError": "Participant payment could not be loaded.",
      "notFound": "Participant payment was not found."
    }
  }
}
</i18n>
