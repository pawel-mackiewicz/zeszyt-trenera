<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import AppButton from '@/ui/components/AppButton.vue'
import MemberFilterSortSection from '@/ui/components/MemberFilterSortSection.vue'
import { useRoute } from '@/ui/router/runtime'
import type { MoneySnapshot } from '@/write/shared/vo/Money'
import CampDetailsParticipantSection from './components/CampDetailsParticipantSection.vue'
import { useCampDetails } from './useCampDetails'

const messages = {
  pl: {
    actions: {
      addParticipant: 'Dodaj uczestnika',
      retry: 'Spróbuj ponownie'
    },
    dates: {
      range: '{start} - {finish}'
    },
    search: {
      label: 'Szukaj uczestnika',
      placeholder: 'Wpisz imię i nazwisko'
    },
    sections: {
      fullyPaid: 'Opłacone',
      registered: 'Zapisani',
      resigned: 'Zrezygnowali'
    },
    states: {
      emptyCamp: 'Brak uczestników na tym obozie.',
      error: 'Nie udało się wczytać szczegółów obozu.',
      loading: 'Wczytywanie obozu',
      noMatches: 'Brak wyników dla tego filtra.',
      notFound: 'Nie znaleziono obozu.'
    },
    table: {
      age: '{age} lat',
      ageUnknown: 'Wiek nieznany',
      discount: 'Zniżka',
      emptyFullyPaid: 'Brak opłaconych uczestników',
      emptyRegistered: 'Brak zapisanych uczestników',
      emptyResigned: 'Brak rezygnacji',
      paid: 'Wpłacono',
      refund: 'Do zwrotu'
    }
  },
  en: {
    actions: {
      addParticipant: 'Add participant',
      retry: 'Try again'
    },
    dates: {
      range: '{start} - {finish}'
    },
    search: {
      label: 'Search participant',
      placeholder: 'Type first and last name'
    },
    sections: {
      fullyPaid: 'Paid',
      registered: 'Registered',
      resigned: 'Resigned'
    },
    states: {
      emptyCamp: 'This camp has no participants yet.',
      error: 'Camp details could not be loaded.',
      loading: 'Loading camp',
      noMatches: 'No matches for these filters.',
      notFound: 'Camp was not found.'
    },
    table: {
      age: '{age} yrs',
      ageUnknown: 'Age unknown',
      discount: 'Discount',
      emptyFullyPaid: 'No paid participants',
      emptyRegistered: 'No registered participants',
      emptyResigned: 'No resignations',
      paid: 'Paid',
      refund: 'To refund'
    }
  }
} as const

const route = useRoute()
const { t, locale } = useI18n({
  useScope: 'local',
  messages
})
const campId = computed(() => {
  const param = route.params.campId

  return Array.isArray(param) ? param[0] : String(param ?? '')
})
const {
  camp,
  filteredParticipantCount,
  filteredParticipants,
  isLoading,
  loadError,
  maxAgeFilter,
  memberSortDirection,
  memberSortField,
  minAgeFilter,
  notFound,
  reload,
  searchQuery,
  totalParticipantCount
} = useCampDetails({
  campId,
  locale
})
const dateFormatter = computed(
  () =>
    new Intl.DateTimeFormat(locale.value, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
)
const dateRange = computed(() => {
  if (camp.value === null) {
    return ''
  }

  return t('dates.range', {
    start: dateFormatter.value.format(camp.value.startDate),
    finish: dateFormatter.value.format(camp.value.finishDate)
  })
})
const addParticipantTo = computed(() =>
  camp.value === null
    ? ''
    : `/camps/${encodeURIComponent(camp.value.id)}/participants/new`
)
const moneyFormatter = computed(() => {
  return new Intl.NumberFormat(locale.value, {
    currency: 'PLN',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    style: 'currency'
  })
})

function formatAge(age: number | null): string {
  return age === null ? t('table.ageUnknown') : t('table.age', { age })
}

function formatMoney(money: MoneySnapshot): string {
  return moneyFormatter.value.format(money.amountMinor / 100)
}
</script>

<template>
  <div class="camp-details-view mx-auto max-w-4xl pt-4 pb-12">
    <section v-if="camp" class="camp-details-view__hero mb-6">
      <p class="camp-details-view__eyebrow">{{ dateRange }}</p>
      <h2 class="camp-details-view__title">{{ camp.name }}</h2>
    </section>

    <section v-if="isLoading" class="camp-details-view__state mb-10 px-5 py-6">
      {{ t('states.loading') }}
    </section>

    <section
      v-else-if="loadError"
      class="camp-details-view__state mb-10 px-5 py-6"
    >
      <p class="camp-details-view__state-copy">{{ t('states.error') }}</p>
      <AppButton variant="secondary" type="button" @click="reload">
        {{ t('actions.retry') }}
      </AppButton>
    </section>

    <section
      v-else-if="notFound"
      class="camp-details-view__state mb-10 px-5 py-6"
    >
      {{ t('states.notFound') }}
    </section>

    <template v-else>
      <MemberFilterSortSection
        v-model:search-query="searchQuery"
        v-model:min-age-filter="minAgeFilter"
        v-model:max-age-filter="maxAgeFilter"
        v-model:member-sort-field="memberSortField"
        v-model:member-sort-direction="memberSortDirection"
        search-input-id="camp-details-search"
        :search-label="t('search.label')"
        :search-placeholder="t('search.placeholder')"
      />

      <section
        v-if="totalParticipantCount === 0"
        class="camp-details-view__state mb-10 px-5 py-6"
      >
        {{ t('states.emptyCamp') }}
      </section>

      <section
        v-else-if="filteredParticipantCount === 0"
        class="camp-details-view__state mb-10 px-5 py-6"
      >
        {{ t('states.noMatches') }}
      </section>

      <div v-else class="camp-details-view__ledger mb-10">
        <CampDetailsParticipantSection
          :discount-label="t('table.discount')"
          :empty-message="t('table.emptyRegistered')"
          :format-age="formatAge"
          :format-money="formatMoney"
          :paid-label="t('table.paid')"
          :participants="filteredParticipants.registered"
          :refund-label="t('table.refund')"
          :title="t('sections.registered')"
          variant="registered"
        />
        <CampDetailsParticipantSection
          :discount-label="t('table.discount')"
          :empty-message="t('table.emptyFullyPaid')"
          :format-age="formatAge"
          :format-money="formatMoney"
          :paid-label="t('table.paid')"
          :participants="filteredParticipants.fullyPaid"
          :refund-label="t('table.refund')"
          :title="t('sections.fullyPaid')"
          variant="fullyPaid"
        />
        <CampDetailsParticipantSection
          :discount-label="t('table.discount')"
          :empty-message="t('table.emptyResigned')"
          :format-age="formatAge"
          :format-money="formatMoney"
          :paid-label="t('table.paid')"
          :participants="filteredParticipants.resigned"
          :refund-label="t('table.refund')"
          :title="t('sections.resigned')"
          variant="resigned"
        />
      </div>

      <div class="camp-details-view__action app-floating-action">
        <!-- What: keep the participant CTA aligned with roster desktop placement. Why: camp details use the same long-ledger pattern, so the action should sit outside the content column instead of stretching under it. -->
        <AppButton as="router-link" :to="addParticipantTo">
          {{ t('actions.addParticipant') }}
        </AppButton>
      </div>
    </template>
  </div>
</template>

<style scoped>
.camp-details-view {
  padding-bottom: max(8.5rem, calc(5rem + env(safe-area-inset-bottom) + 4rem));
}

.camp-details-view__hero {
  display: grid;
  gap: 0.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--color-on-surface);
}

.camp-details-view__eyebrow {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.24em;
  line-height: 1.2;
  text-transform: uppercase;
  color: var(--color-secondary);
}

.camp-details-view__title {
  margin: 0;
  overflow-wrap: anywhere;
  font-family: var(--font-headline);
  font-size: clamp(3rem, 11vw, 5.5rem);
  font-weight: 900;
  line-height: 0.92;
  letter-spacing: -0.04em;
  text-transform: uppercase;
  color: var(--color-on-surface);
}

.camp-details-view__state {
  display: grid;
  gap: 1rem;
  justify-items: start;
  border: 1px solid var(--color-on-surface);
  background: var(--color-surface);
  box-shadow: 2px 2px 0 0 rgba(26, 28, 28, 0.92);
  font-family: var(--font-mono);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  line-height: 1.5;
  text-transform: uppercase;
  color: var(--color-secondary);
}

.camp-details-view__state-copy {
  margin: 0;
}

.camp-details-view__ledger {
  display: grid;
  gap: 2rem;
}
</style>
