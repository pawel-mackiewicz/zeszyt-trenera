<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { normalizeAgeRange } from '@/ui/utils/ageRange'

const props = defineProps<{
  minBound: number
  maxBound: number
  minValue: number
  maxValue: number
}>()

const emit = defineEmits<{
  (event: 'update:minValue', value: number): void
  (event: 'update:maxValue', value: number): void
}>()

const minValueModel = computed({
  get: () => props.minValue,
  set: (value) => {
    emit('update:minValue', Number(value))
  }
})

const maxValueModel = computed({
  get: () => props.maxValue,
  set: (value) => {
    emit('update:maxValue', Number(value))
  }
})

const { t } = useI18n({ useScope: 'local' })
// What: derive the visible band inside the component itself. Why: once this control owns the shared age copy, every screen should get the same ordered-range wording without recomputing it locally.
const rangeLabel = computed(() => {
  const range = normalizeAgeRange(props.minValue, props.maxValue)

  return t('range', {
    min: range.min,
    max: range.max
  })
})
</script>

<template>
  <div class="age-range-filter">
    <div class="age-range-filter__header">
      <label class="age-range-filter__label">{{ t('label') }}</label>
      <span class="age-range-filter__value">{{ rangeLabel }}</span>
    </div>
    <div class="age-range-filter__track">
      <span class="age-range-filter__bound">{{ minBound }}</span>
      <div class="age-range-filter__slider">
        <!-- What: name each stacked slider by the boundary it changes. Why: the mobile custom rail visually merges two native controls, so non-visual users and E2E flows need explicit targets. -->
        <input
          v-model.number="minValueModel"
          :aria-label="t('minLabel')"
          class="age-range-filter__input"
          :max="maxBound"
          :min="minBound"
          type="range"
        />
        <input
          v-model.number="maxValueModel"
          :aria-label="t('maxLabel')"
          class="age-range-filter__input"
          :max="maxBound"
          :min="minBound"
          type="range"
        />
        <div class="age-range-filter__rail"></div>
      </div>
      <span class="age-range-filter__bound">{{ maxBound }}</span>
    </div>
  </div>
</template>

<style scoped>
input[type='range'] {
  -webkit-appearance: none;
  background: transparent;
}

.age-range-filter {
  display: grid;
  gap: 0.5rem;
}

.age-range-filter__header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.age-range-filter__label {
  display: block;
  font-family: var(--font-mono);
  font-size: 0.875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-secondary);
}

.age-range-filter__value {
  font-family: var(--font-mono);
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-primary);
}

.age-range-filter__track {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.age-range-filter__bound {
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--color-secondary);
}

.age-range-filter__slider {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1;
  height: 0.5rem;
}

/* What: keep the dual-slider interaction touch-friendly on mobile. Why: the reusable filter layers two native range inputs on one rail, so only the thumbs should capture drag gestures. */
.age-range-filter__input {
  position: absolute;
  inset: 0;
  z-index: 2;
  width: 100%;
  height: 100%;
  margin: 0;
  pointer-events: none;
}

/* What: center the WebKit thumb on the custom rail. Why: the shared filter should keep the same square drag target that attendance already uses across the whole app. */
.age-range-filter__input::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 16px;
  width: 16px;
  margin-top: -8px;
  background: var(--color-primary);
  border: 1px solid var(--color-on-surface);
  border-radius: 0;
  pointer-events: auto;
  cursor: pointer;
}

/* What: mirror the same thumb affordance in Firefox. Why: coaches should get the same age-range handle size and feel regardless of browser. */
.age-range-filter__input::-moz-range-thumb {
  height: 16px;
  width: 16px;
  background: var(--color-primary);
  border: 1px solid var(--color-on-surface);
  border-radius: 0;
  pointer-events: auto;
  cursor: pointer;
}

/* What: hide the browser track chrome. Why: the shared control draws one custom rail so every screen renders the same range treatment. */
input[type='range']::-webkit-slider-runnable-track,
input[type='range']::-moz-range-track {
  height: 0;
  background: transparent;
  border: 0;
}

.age-range-filter__rail {
  position: absolute;
  inset-inline: 0;
  height: 2px;
  background: var(--color-primary);
}
</style>

<i18n lang="json">
{
  "pl": {
    "label": "Zakres wieku",
    "minLabel": "Minimalny wiek",
    "maxLabel": "Maksymalny wiek",
    "range": "{min} - {max} lat"
  },
  "en": {
    "label": "Age range",
    "minLabel": "Minimum age",
    "maxLabel": "Maximum age",
    "range": "{min} - {max} years"
  }
}
</i18n>
