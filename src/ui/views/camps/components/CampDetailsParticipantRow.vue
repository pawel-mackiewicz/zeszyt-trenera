<script setup lang="ts">
import { BadgePercent } from '@lucide/vue'
import { computed } from 'vue'

import type {
  CampDetailsActiveParticipantListItem,
  CampDetailsResignedParticipantListItem
} from '@/read/GetCampDetailsQuery'
import type { MoneySnapshot } from '@/write/shared/vo/Money'

type CampDetailsParticipantRowItem =
  | CampDetailsActiveParticipantListItem
  | CampDetailsResignedParticipantListItem

const props = defineProps<{
  campId: string
  discountLabel: string
  participant: CampDetailsParticipantRowItem
  paidLabel: string
  refundLabel: string
  variant: 'registered' | 'fullyPaid' | 'resigned'
  formatAge: (age: number | null) => string
  formatMoney: (money: MoneySnapshot) => string
}>()

function isResigned(
  participant: CampDetailsParticipantRowItem
): participant is CampDetailsResignedParticipantListItem {
  return 'amountToRefund' in participant
}

const activeParticipant = computed(() =>
  isResigned(props.participant) ? null : props.participant
)
const resignedParticipant = computed(() =>
  isResigned(props.participant) ? props.participant : null
)
const participantTo = computed(
  () =>
    `/camps/${encodeURIComponent(props.campId)}/participants/${encodeURIComponent(props.participant.id)}`
)
const progressStyle = computed(() => {
  if (activeParticipant.value === null) {
    return {
      width: '0%'
    }
  }

  return {
    width: `${activeParticipant.value.paymentProgressPercent}%`
  }
})
</script>

<template>
  <li
    class="camp-details-participant-row"
    :class="`camp-details-participant-row--${variant}`"
  >
    <RouterLink class="camp-details-participant-row__link" :to="participantTo">
      <div class="camp-details-participant-row__identity">
        <span class="camp-details-participant-row__name">
          {{ participant.displayName }}
        </span>
        <span class="camp-details-participant-row__age">
          {{ formatAge(participant.age) }}
        </span>
        <span
          v-if="activeParticipant?.hasDiscount"
          class="camp-details-participant-row__discount"
          :aria-label="discountLabel"
          :title="discountLabel"
        >
          <BadgePercent
            class="camp-details-participant-row__discount-icon"
            aria-hidden="true"
          />
        </span>
      </div>

      <div class="camp-details-participant-row__payment">
        <template v-if="resignedParticipant">
          <span class="camp-details-participant-row__payment-label">
            {{ refundLabel }}
          </span>
          <span class="camp-details-participant-row__payment-value">
            {{ formatMoney(resignedParticipant.amountToRefund) }}
          </span>
        </template>
        <template v-else-if="activeParticipant">
          <span class="camp-details-participant-row__payment-label">
            {{ paidLabel }}
          </span>
          <span class="camp-details-participant-row__payment-value">
            {{ formatMoney(activeParticipant.paidAmount) }}
          </span>
          <span class="camp-details-participant-row__payment-total">
            / {{ formatMoney(activeParticipant.amountDue) }}
          </span>
        </template>
      </div>

      <div
        v-if="activeParticipant"
        class="camp-details-participant-row__progress"
        aria-hidden="true"
      >
        <span
          class="camp-details-participant-row__progress-value"
          :style="progressStyle"
        />
      </div>
    </RouterLink>
  </li>
</template>

<style scoped>
.camp-details-participant-row {
  display: block;
}

.camp-details-participant-row__link {
  display: grid;
  gap: 0.75rem;
  padding: 1rem 0;
  border-bottom: 1px solid var(--color-outline-variant);
  color: inherit;
  text-decoration: none;
}

.camp-details-participant-row__link:focus-visible {
  outline: 2px solid var(--color-on-surface);
  outline-offset: 0.25rem;
}

.camp-details-participant-row__identity {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.35rem 0.6rem;
  min-width: 0;
}

.camp-details-participant-row__name {
  overflow-wrap: anywhere;
  font-family: var(--font-headline);
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.15;
  text-transform: uppercase;
  color: var(--color-on-surface);
}

.camp-details-participant-row__age,
.camp-details-participant-row__discount,
.camp-details-participant-row__payment-label,
.camp-details-participant-row__payment-value,
.camp-details-participant-row__payment-total {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  line-height: 1.25;
  text-transform: uppercase;
}

.camp-details-participant-row__age,
.camp-details-participant-row__payment-label,
.camp-details-participant-row__payment-total {
  color: var(--color-secondary);
}

.camp-details-participant-row__discount {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-secondary);
}

.camp-details-participant-row__discount-icon {
  width: 0.85rem;
  height: 0.85rem;
  stroke-width: 2;
}

.camp-details-participant-row__payment {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.25rem 0.45rem;
}

.camp-details-participant-row__payment-value {
  color: var(--color-primary);
}

.camp-details-participant-row--fullyPaid,
.camp-details-participant-row__payment-value {
  color: var(--color-on-surface);
}

.camp-details-participant-row__progress {
  height: 0.25rem;
  background: var(--color-surface-container-low);
}

.camp-details-participant-row__progress-value {
  display: block;
  height: 100%;
  background: var(--color-primary);
}

@media (min-width: 42rem) {
  .camp-details-participant-row {
    display: block;
  }

  .camp-details-participant-row__link {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
  }

  .camp-details-participant-row__progress {
    grid-column: 1 / -1;
  }
}
</style>
