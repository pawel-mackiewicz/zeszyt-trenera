<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import type { MembershipPaymentSummaryByMonthResult } from '@/read/ObserveMembershipPaymentSummaryByMonthQuery'
import AppButton from '@/ui/components/AppButton.vue'
import type { MoneySnapshot } from '@/write/domain/model/vo/Money'

const props = defineProps<{
  isLoading: boolean
  loadFailed: boolean
  summary: MembershipPaymentSummaryByMonthResult
}>()

const emit = defineEmits<{
  retry: []
}>()

const { t, locale } = useI18n({ useScope: 'local' })

const isExpanded = ref(false)

const totalMemberCount = computed(
  () => props.summary.paidMembersCount + props.summary.unpaidMembersCount
)
const completionPercent = computed(() => {
  if (totalMemberCount.value === 0) {
    return 0
  }

  return Math.round(
    (props.summary.paidMembersCount / totalMemberCount.value) * 100
  )
})
const totalPaidAmountLabel = computed(() =>
  formatMoney(props.summary.totalPaidAmount)
)

function formatMoney(value: MoneySnapshot | null): string {
  if (value === null) {
    return t('amountEmpty')
  }

  try {
    return new Intl.NumberFormat(locale.value, {
      currency: value.currency,
      style: 'currency'
    }).format(value.amountMinor / 100)
  } catch {
    return `${(value.amountMinor / 100).toFixed(2)} ${value.currency}`
  }
}
</script>

<template>
  <section class="payment-summary" aria-labelledby="payment-summary-heading">
    <button
      class="payment-summary__trigger"
      type="button"
      :aria-expanded="isExpanded"
      aria-controls="payment-summary-details"
      @click="isExpanded = !isExpanded"
    >
      <span id="payment-summary-heading" class="payment-summary__title">
        {{ t('title') }}
      </span>
      <span class="payment-summary__chevron" aria-hidden="true">⌄</span>
    </button>

    <div
      v-if="isExpanded"
      id="payment-summary-details"
      class="payment-summary__details"
    >
      <div v-if="isLoading" class="payment-summary__state">
        {{ t('loading') }}
      </div>

      <div v-else-if="loadFailed" class="payment-summary__state">
        <p>{{ t('error') }}</p>
        <AppButton variant="secondary" type="button" @click="emit('retry')">
          {{ t('retry') }}
        </AppButton>
      </div>

      <dl v-else class="payment-summary__list">
        <div class="payment-summary__item">
          <dt>{{ t('paidLabel') }}</dt>
          <dd>{{ summary.paidMembersCount }}</dd>
        </div>
        <div class="payment-summary__item">
          <dt>{{ t('unpaidLabel') }}</dt>
          <dd>{{ summary.unpaidMembersCount }}</dd>
        </div>
        <div class="payment-summary__item">
          <dt>{{ t('amountLabel') }}</dt>
          <dd>{{ totalPaidAmountLabel }}</dd>
        </div>
        <div class="payment-summary__item">
          <dt>{{ t('completionLabel') }}</dt>
          <dd>{{ completionPercent }}%</dd>
        </div>
      </dl>
    </div>
  </section>
</template>

<style scoped>
.payment-summary {
  overflow: hidden;
  border-top: 1px solid var(--color-on-surface);
  border-bottom: 1px solid var(--color-outline-variant);
}

.payment-summary__trigger {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border: 0;
  background: transparent;
  padding: 0.75rem 1rem;
  color: var(--color-on-surface);
  text-align: left;
}

.payment-summary__title {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-secondary);
}

.payment-summary__chevron {
  display: grid;
  width: 1.75rem;
  height: 1.75rem;
  flex: 0 0 auto;
  place-items: center;
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1;
  transition: transform 180ms ease-out;
}

.payment-summary__trigger[aria-expanded='true'] .payment-summary__chevron {
  transform: rotate(180deg);
}

.payment-summary__details {
  display: grid;
  border-top: 1px solid
    color-mix(in srgb, var(--color-outline-variant) 78%, transparent);
}

.payment-summary__state {
  display: grid;
  gap: 0.85rem;
  justify-items: start;
  padding: 1rem;
  color: var(--color-secondary);
  font-family: var(--font-mono);
  font-size: 0.92rem;
  font-weight: 700;
}

.payment-summary__state p {
  margin: 0;
}

.payment-summary__list {
  display: grid;
  margin: 0;
}

.payment-summary__item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--color-outline-variant);
}

.payment-summary__item:last-child {
  border-bottom: 0;
}

.payment-summary__item dt {
  color: var(--color-secondary);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.payment-summary__item dd {
  margin: 0;
  font-family: var(--font-headline);
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.03em;
  text-align: right;
  text-transform: uppercase;
  color: var(--color-on-surface);
}
</style>

<i18n lang="json">
{
  "pl": {
    "amountEmpty": "Brak wpłat",
    "amountLabel": "Wpłacono",
    "completionLabel": "Pokrycie",
    "error": "Nie udało się policzyć miesięcznego bilansu płatności.",
    "loading": "Liczenie bilansu płatności",
    "paidLabel": "Opłacili",
    "retry": "Spróbuj ponownie",
    "title": "Statystyki miesiąca",
    "unpaidLabel": "Do rozliczenia"
  },
  "en": {
    "amountEmpty": "No payments",
    "amountLabel": "Collected",
    "completionLabel": "Coverage",
    "error": "The monthly payment balance could not be calculated.",
    "loading": "Calculating payment balance",
    "paidLabel": "Paid",
    "retry": "Try again",
    "title": "Monthly Statistics",
    "unpaidLabel": "To collect"
  }
}
</i18n>
