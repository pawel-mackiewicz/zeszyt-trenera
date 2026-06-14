<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

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
    emit('update:minValue', clampAgeValue(Number(value)))
  }
})

const maxValueModel = computed({
  get: () => props.maxValue,
  set: (value) => {
    emit('update:maxValue', clampAgeValue(Number(value)))
  }
})

const { t } = useI18n({ useScope: 'local' })
const minInputValue = ref(String(props.minValue))
const maxInputValue = ref(String(props.maxValue))
const minValuePosition = computed(() => getValuePosition(props.minValue))
const maxValuePosition = computed(() => getValuePosition(props.maxValue))

watch(
  () => props.minValue,
  (value) => {
    minInputValue.value = String(value)
  }
)

watch(
  () => props.maxValue,
  (value) => {
    maxInputValue.value = String(value)
  }
)

function getValuePosition(value: number) {
  const span = props.maxBound - props.minBound

  if (span <= 0) {
    return '50%'
  }

  const position = ((value - props.minBound) / span) * 100
  const clampedPosition = Math.min(100, Math.max(0, position))
  const thumbCenterOffset = 8 - clampedPosition * 0.16

  return `calc(${clampedPosition}% + ${thumbCenterOffset}px)`
}

function clampAgeValue(value: number) {
  if (!Number.isFinite(value)) {
    return props.minBound
  }

  return Math.min(props.maxBound, Math.max(props.minBound, value))
}

function updateMinValueFromInput() {
  const value = getInRangeInputValue(minInputValue.value)

  if (value !== null) {
    emit('update:minValue', value)
  }
}

function updateMaxValueFromInput() {
  const value = getInRangeInputValue(maxInputValue.value)

  if (value !== null) {
    emit('update:maxValue', value)
  }
}

function commitMinValueInput() {
  const value = clampAgeValue(Number(minInputValue.value))

  minInputValue.value = String(value)
  emit('update:minValue', value)
}

function commitMaxValueInput() {
  const value = clampAgeValue(Number(maxInputValue.value))

  maxInputValue.value = String(value)
  emit('update:maxValue', value)
}

function getInRangeInputValue(rawValue: string) {
  const value = Number(rawValue)

  if (
    !Number.isFinite(value) ||
    value < props.minBound ||
    value > props.maxBound
  ) {
    return null
  }

  return value
}
</script>

<template>
  <div class="age-range-filter">
    <span class="age-range-filter__label">{{ t('label') }}</span>
    <div class="age-range-filter__body">
      <div class="age-range-filter__track">
        <span class="age-range-filter__bound">{{ minBound }}</span>
        <div class="age-range-filter__slider">
          <!-- What: name each stacked slider by the boundary it changes. Why: the mobile custom rail visually merges two native controls, so non-visual users and E2E flows need explicit targets. -->
          <input
            v-model.number="minValueModel"
            :aria-label="t('minSliderLabel')"
            :aria-valuetext="t('valueText', { value: minValue })"
            class="age-range-filter__input"
            :max="maxBound"
            :min="minBound"
            type="range"
          />
          <input
            v-model.number="maxValueModel"
            :aria-label="t('maxSliderLabel')"
            :aria-valuetext="t('valueText', { value: maxValue })"
            class="age-range-filter__input"
            :max="maxBound"
            :min="minBound"
            type="range"
          />
          <div class="age-range-filter__rail"></div>
          <input
            v-model="minInputValue"
            :aria-label="t('minInputLabel')"
            class="age-range-filter__value"
            :max="maxBound"
            :min="minBound"
            :style="{ left: minValuePosition }"
            type="number"
            @blur="commitMinValueInput"
            @change="commitMinValueInput"
            @input="updateMinValueFromInput"
          />
          <input
            v-model="maxInputValue"
            :aria-label="t('maxInputLabel')"
            class="age-range-filter__value"
            :max="maxBound"
            :min="minBound"
            :style="{ left: maxValuePosition }"
            type="number"
            @blur="commitMaxValueInput"
            @change="commitMaxValueInput"
            @input="updateMaxValueFromInput"
          />
        </div>
        <span class="age-range-filter__bound">{{ maxBound }}</span>
      </div>
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
  gap: 0.375rem;
}

.age-range-filter__label {
  display: block;
  font-family: var(--app-section-label-font-family);
  font-size: var(--app-section-label-font-size);
  font-weight: var(--app-section-label-font-weight);
  line-height: var(--app-section-label-line-height);
  letter-spacing: var(--app-section-label-letter-spacing);
  text-transform: var(--app-section-label-text-transform);
  color: var(--app-section-label-color);
}

.age-range-filter__body {
  display: grid;
  margin-left: 0.125rem;
  padding-left: 0.625rem;
  border-left: 2px solid var(--color-outline-variant);
}

.age-range-filter__value {
  appearance: textfield;
  position: absolute;
  top: 1.625rem;
  transform: translateX(-50%);
  width: 2.25rem;
  min-height: 1.25rem;
  border: 0;
  border-bottom: 2px solid var(--color-primary);
  background: transparent;
  padding: 0 0.125rem 0.125rem;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 700;
  text-align: center;
  text-transform: uppercase;
  color: var(--color-primary);
  line-height: 1;
  white-space: nowrap;
}

.age-range-filter__value::-webkit-inner-spin-button,
.age-range-filter__value::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.age-range-filter__value:focus {
  outline: none;
  border-bottom-color: var(--color-on-surface);
  background: var(--color-surface-container-lowest);
}

.age-range-filter__track {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.age-range-filter__bound {
  margin-top: 0.5rem;
  font-family: var(--app-section-label-font-family);
  font-size: var(--app-section-label-font-size);
  font-weight: var(--app-section-label-font-weight);
  line-height: var(--app-section-label-line-height);
  letter-spacing: var(--app-section-label-letter-spacing);
  text-transform: var(--app-section-label-text-transform);
  color: var(--app-section-label-color);
}

.age-range-filter__slider {
  position: relative;
  display: flex;
  align-items: flex-start;
  flex: 1;
  height: 2.5rem;
}

/* What: keep the dual-slider interaction touch-friendly on mobile. Why: the reusable filter layers two native range inputs on one rail, so only the thumbs should capture drag gestures. */
.age-range-filter__input {
  position: absolute;
  top: 0.5rem;
  right: 0;
  left: 0;
  z-index: 2;
  width: 100%;
  height: 0.5rem;
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
  top: 0.75rem;
  inset-inline: 0;
  height: 2px;
  transform: translateY(-50%);
  background: var(--color-primary);
}
</style>

<i18n lang="json">
{
  "pl": {
    "label": "Zakres wieku",
    "minInputLabel": "Minimalny wiek, wartość",
    "maxInputLabel": "Maksymalny wiek, wartość",
    "minSliderLabel": "Minimalny wiek, suwak",
    "maxSliderLabel": "Maksymalny wiek, suwak",
    "valueText": "{value} lat"
  },
  "en": {
    "label": "Age range",
    "minInputLabel": "Minimum age, value",
    "maxInputLabel": "Maximum age, value",
    "minSliderLabel": "Minimum age, slider",
    "maxSliderLabel": "Maximum age, slider",
    "valueText": "{value} years"
  }
}
</i18n>
