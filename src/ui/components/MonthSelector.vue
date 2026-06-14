<script setup lang="ts">
import { computed, useId } from 'vue'
import { useI18n } from 'vue-i18n'

import AppIcon from '@/ui/components/AppIcon.vue'

const props = defineProps<{
  modelValue: Date
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: Date): void
}>()

const { t, locale } = useI18n({ useScope: 'local' })
const monthLabelId = useId()

function startOfMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1)
}

function addMonths(value: Date, offset: number): Date {
  return new Date(value.getFullYear(), value.getMonth() + offset, 1)
}

const activeMonth = computed(() => startOfMonth(props.modelValue))
const monthLabel = computed(() =>
  new Intl.DateTimeFormat(locale.value, {
    month: 'long',
    year: 'numeric'
  }).format(activeMonth.value)
)

function changeMonth(offset: number) {
  // What: emit one normalized month-start date from the shared selector. Why: every monthly screen should react to the same calendar-month contract instead of each view recalculating its own offsets.
  emit('update:modelValue', addMonths(activeMonth.value, offset))
}
</script>

<template>
  <section class="month-selector" :aria-label="t('period.selector')">
    <div
      class="month-selector__controls"
      role="group"
      :aria-labelledby="monthLabelId"
    >
      <button
        class="month-selector__button"
        :aria-describedby="monthLabelId"
        :aria-label="t('period.previous')"
        type="button"
        @click="changeMonth(-1)"
      >
        <AppIcon
          class="month-selector__icon month-selector__icon--previous"
          name="chevron_right"
        />
      </button>
      <p
        :id="monthLabelId"
        aria-atomic="true"
        aria-live="polite"
        class="month-selector__label"
      >
        {{ monthLabel }}
      </p>
      <button
        class="month-selector__button"
        :aria-describedby="monthLabelId"
        :aria-label="t('period.next')"
        type="button"
        @click="changeMonth(1)"
      >
        <AppIcon class="month-selector__icon" name="chevron_right" />
      </button>
    </div>
  </section>
</template>

<style scoped>
.month-selector {
  width: min(100%, 24rem);
  min-width: 0;
  padding-block: 0.875rem;
  border-top: 1px solid var(--color-on-surface);
  border-bottom: 1px solid var(--color-on-surface);
}

.month-selector__controls {
  /* What: keep the month switcher locked to button / label / button columns. Why: both mobile-first ledger views need a stable label position while coaches flick through adjacent months. */
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.625rem;
  align-items: center;
}

.month-selector__label {
  margin: 0;
  min-width: 0;
  padding-inline: 0.5rem;
  color: var(--color-on-surface);
  text-align: center;
  font-family: var(--font-mono);
  font-size: 0.9375rem;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.month-selector__button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-primary);
}

.month-selector__button::after {
  position: absolute;
  right: 0.72rem;
  bottom: 0.52rem;
  left: 0.72rem;
  height: 0.125rem;
  background: currentColor;
  content: '';
  transform: scaleX(0) rotate(-2deg);
  transform-origin: left center;
  transition: transform 140ms ease;
}

.month-selector__button:hover,
.month-selector__button:focus-visible {
  color: var(--color-on-surface);
}

.month-selector__button:focus-visible {
  outline: 2px solid var(--color-on-surface);
  outline-offset: 2px;
}

.month-selector__button:hover::after,
.month-selector__button:focus-visible::after {
  transform: scaleX(1) rotate(-2deg);
}

.month-selector__button:active::after {
  transform: scaleX(0.82) rotate(-2deg);
}

.month-selector__icon {
  width: 1.45rem;
  height: 1.45rem;
}

.month-selector__icon--previous {
  transform: rotate(180deg);
}

@media (max-width: 767px) {
  .month-selector {
    width: 100%;
  }

  /* What: preserve readable month labels on narrow screens. Why: long localized month names need a little more room in the shared PWA control once the selector stretches full-width on phones. */
  .month-selector__controls {
    gap: 0.55rem;
  }

  .month-selector__label {
    font-size: 0.9375rem;
  }
}
</style>

<i18n lang="json">
{
  "pl": {
    "period": {
      "selector": "Wybór miesiąca",
      "previous": "Poprzedni miesiąc",
      "next": "Następny miesiąc"
    }
  },
  "en": {
    "period": {
      "selector": "Month selector",
      "previous": "Previous month",
      "next": "Next month"
    }
  }
}
</i18n>
