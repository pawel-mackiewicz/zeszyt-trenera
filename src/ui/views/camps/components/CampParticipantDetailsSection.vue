<script setup lang="ts">
import { CalendarDays, Tent, UserRound } from '@lucide/vue'
import { computed, toRef } from 'vue'
import { useI18n } from 'vue-i18n'

import AppButton from '@/ui/components/AppButton.vue'

import { useCampParticipantDetails } from '../useCampParticipantDetails'

const props = defineProps<{
  campId: string
  participantId: string
}>()

const { locale, t } = useI18n({ useScope: 'local' })
const { camp, isLoading, loadError, notFound, participant, retryLoading } =
  useCampParticipantDetails({
    campId: toRef(props, 'campId'),
    participantId: toRef(props, 'participantId')
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
const statusLabel = computed(() =>
  participant.value ? t(`status.${participant.value.status}`) : ''
)
</script>

<template>
  <section
    class="camp-participant-details-section"
    aria-labelledby="campParticipantDetailsHeading"
  >
    <div class="app-section-label camp-participant-details-section__label-bar">
      {{ t('sections.participant') }}
    </div>
    <div class="camp-participant-details-section__body">
      <template
        v-if="isLoading || loadError || notFound || !camp || !participant"
      >
        <p class="camp-participant-details-section__state">
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

      <div v-else class="camp-participant-details-section__summary">
        <div class="camp-participant-details-section__summary-item">
          <span
            class="app-section-label camp-participant-details-section__summary-label"
          >
            <UserRound
              class="camp-participant-details-section__label-icon"
              aria-hidden="true"
            />
            {{ t('fields.participant') }}
          </span>
          <h2
            id="campParticipantDetailsHeading"
            class="camp-participant-details-section__title"
          >
            {{ participant.displayName }}
          </h2>
        </div>
        <div class="camp-participant-details-section__summary-item">
          <span
            class="app-section-label camp-participant-details-section__summary-label"
          >
            <Tent
              class="camp-participant-details-section__label-icon"
              aria-hidden="true"
            />
            {{ t('fields.camp') }}
          </span>
          <span class="camp-participant-details-section__summary-value">
            {{ camp.name }}
          </span>
        </div>
        <div class="camp-participant-details-section__summary-item">
          <span
            class="app-section-label camp-participant-details-section__summary-label"
          >
            <CalendarDays
              class="camp-participant-details-section__label-icon"
              aria-hidden="true"
            />
            {{ t('fields.dates') }}
          </span>
          <span class="camp-participant-details-section__summary-value">
            {{ dateRange }}
          </span>
        </div>
        <div class="camp-participant-details-section__summary-item">
          <span
            class="app-section-label camp-participant-details-section__summary-label"
          >
            {{ t('fields.status') }}
          </span>
          <span class="camp-participant-details-section__status">
            {{ statusLabel }}
          </span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.camp-participant-details-section {
  border: 1px solid var(--color-on-surface);
  background: var(--color-surface);
  box-shadow: 4px 4px 0 0 var(--color-on-surface);
}

.camp-participant-details-section__label-bar {
  margin: 0;
  padding: 0.9rem 1rem;
  border-block-end: 1px solid var(--color-on-surface);
  background: var(--color-on-surface);
  color: var(--color-on-primary);
  font-size: 0.875rem;
}

.camp-participant-details-section__body {
  display: grid;
  gap: 1.25rem;
  padding: 1.5rem 1rem;
}

.camp-participant-details-section__summary {
  display: grid;
  gap: 1rem;
}

.camp-participant-details-section__summary-item {
  display: grid;
  gap: 0.5rem;
}

.camp-participant-details-section__summary-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--color-on-surface);
}

.camp-participant-details-section__label-icon {
  flex: 0 0 auto;
  width: 0.95rem;
  height: 0.95rem;
  color: var(--color-secondary);
  stroke-width: 2.25;
}

.camp-participant-details-section__title,
.camp-participant-details-section__summary-value,
.camp-participant-details-section__status {
  margin: 0;
  overflow-wrap: anywhere;
}

.camp-participant-details-section__title {
  font-family: var(--font-headline);
  font-size: 1.45rem;
  font-weight: 800;
  line-height: 1.1;
  text-transform: uppercase;
  color: var(--color-on-surface);
}

.camp-participant-details-section__summary-value,
.camp-participant-details-section__status {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1.4;
  text-transform: uppercase;
  color: var(--color-on-surface);
}

.camp-participant-details-section__status {
  color: var(--color-primary);
}

.camp-participant-details-section__state {
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
  .camp-participant-details-section__body {
    gap: 1.5rem;
    padding: 2rem;
  }

  .camp-participant-details-section__summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

<i18n lang="json">
{
  "pl": {
    "sections": {
      "participant": "Uczestnik obozu"
    },
    "actions": {
      "retry": "Spróbuj ponownie"
    },
    "dates": {
      "range": "{start} - {finish}"
    },
    "fields": {
      "camp": "Obóz",
      "dates": "Termin",
      "participant": "Uczestnik",
      "status": "Status"
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
      "participant": "Camp participant"
    },
    "actions": {
      "retry": "Try again"
    },
    "dates": {
      "range": "{start} - {finish}"
    },
    "fields": {
      "camp": "Camp",
      "dates": "Dates",
      "participant": "Participant",
      "status": "Status"
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
