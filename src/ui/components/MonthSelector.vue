<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  modelValue: Date
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: Date): void
}>()

const { t, locale } = useI18n({ useScope: 'local' })

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
  <section class="month-selector" aria-live="polite">
    <div class="month-selector__controls">
      <button
        class="month-selector__button"
        :aria-label="t('period.previous')"
        type="button"
        @click="changeMonth(-1)"
      >
        <span aria-hidden="true">‹</span>
      </button>
      <p class="month-selector__label">
        {{ monthLabel }}
      </p>
      <button
        class="month-selector__button"
        :aria-label="t('period.next')"
        type="button"
        @click="changeMonth(1)"
      >
        <span aria-hidden="true">›</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.month-selector {
  --month-selector-shadow: 2px 2px 0 0 rgba(23, 48, 45, 0.92);
  width: min(100%, 22rem);
  min-width: 0;
  padding: 1rem 1.1rem;
  border: 1px solid rgba(16, 59, 55, 0.2);
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  box-shadow: var(--month-selector-shadow);
}

.month-selector__controls {
  /* What: keep the month switcher locked to button / label / button columns. Why: both mobile-first ledger views need a stable label position while coaches flick through adjacent months. */
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
}

.month-selector__label {
  margin: 0;
  min-width: 0;
  padding-inline: 0.25rem;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.month-selector__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border: 1px solid rgba(16, 59, 55, 0.15);
  background: var(--color-surface);
  color: var(--color-primary);
  box-shadow: var(--month-selector-shadow);
  transition:
    transform 75ms ease,
    box-shadow 75ms ease,
    background-color 160ms ease;
}

.month-selector__button:hover,
.month-selector__button:focus-visible {
  background: var(--color-surface-container-low);
  transform: translate(2px, 2px);
  box-shadow: none;
}

.month-selector__button:focus-visible {
  outline: none;
}

.month-selector__button span {
  font-family: var(--font-headline);
  font-size: 1.8rem;
  line-height: 1;
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
    font-size: 0.875rem;
  }
}
</style>

<i18n lang="json">
{
  "pl": {
    "period": {
      "previous": "Poprzedni miesiąc",
      "next": "Następny miesiąc"
    }
  },
  "en": {
    "period": {
      "previous": "Previous month",
      "next": "Next month"
    }
  }
}
</i18n>
