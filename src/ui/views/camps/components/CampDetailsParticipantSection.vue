<script setup lang="ts">
import type {
  CampDetailsActiveParticipantListItem,
  CampDetailsResignedParticipantListItem
} from '@/read/GetCampDetailsQuery'
import type { MoneySnapshot } from '@/write/shared/vo/Money'
import CampDetailsParticipantRow from './CampDetailsParticipantRow.vue'

type CampDetailsParticipantSectionItem =
  | CampDetailsActiveParticipantListItem
  | CampDetailsResignedParticipantListItem

defineProps<{
  discountLabel: string
  emptyMessage: string
  formatAge: (age: number | null) => string
  formatMoney: (money: MoneySnapshot) => string
  paidLabel: string
  participants: CampDetailsParticipantSectionItem[]
  refundLabel: string
  title: string
  variant: 'registered' | 'fullyPaid' | 'resigned'
}>()
</script>

<template>
  <section class="camp-details-participant-section">
    <div class="camp-details-participant-section__header">
      <h2 class="camp-details-participant-section__title">{{ title }}</h2>
      <span class="camp-details-participant-section__count">
        {{ participants.length }}
      </span>
    </div>

    <p
      v-if="participants.length === 0"
      class="camp-details-participant-section__empty"
    >
      {{ emptyMessage }}
    </p>
    <ul v-else class="camp-details-participant-section__rows">
      <CampDetailsParticipantRow
        v-for="participant in participants"
        :key="participant.id"
        :discount-label="discountLabel"
        :format-age="formatAge"
        :format-money="formatMoney"
        :paid-label="paidLabel"
        :participant="participant"
        :refund-label="refundLabel"
        :variant="variant"
      />
    </ul>
  </section>
</template>

<style scoped>
.camp-details-participant-section {
  display: grid;
  gap: 0;
}

.camp-details-participant-section__header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 0.65rem;
  border-bottom: 2px solid var(--color-on-surface);
}

.camp-details-participant-section__title {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.24em;
  line-height: 1.2;
  text-transform: uppercase;
  color: var(--color-on-surface);
}

.camp-details-participant-section__count {
  min-width: 2rem;
  padding: 0.25rem 0.4rem;
  border: 1px solid var(--color-on-surface);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1;
  text-align: center;
  color: var(--color-on-surface);
}

.camp-details-participant-section__rows {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.camp-details-participant-section__empty {
  margin: 0;
  padding: 1.25rem 0;
  border-bottom: 1px solid var(--color-outline-variant);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-secondary);
}
</style>
