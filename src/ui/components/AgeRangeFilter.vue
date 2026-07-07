<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  /** Bounds define the allowed age scale; values define the selected range. */
  minBound: number
  maxBound: number
  minValue: number
  maxValue: number
}>()

const emit = defineEmits<{
  (event: 'update:minValue', value: number): void
  (event: 'update:maxValue', value: number): void
}>()

type AgeRangeEndpoint = 'min' | 'max'

type AgeRangeValueControl = {
  endpoint: AgeRangeEndpoint
  inputLabel: 'minInputLabel' | 'maxInputLabel'
}

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
const minValuePercent = computed(() => getValuePercent(props.minValue))
const maxValuePercent = computed(() => getValuePercent(props.maxValue))
const isRangeCrossed = computed(() => props.minValue > props.maxValue)
const selectedRangeStyle = computed(() => {
  const start = Math.min(minValuePercent.value, maxValuePercent.value)
  const end = Math.max(minValuePercent.value, maxValuePercent.value)

  return {
    left: `${start}%`,
    right: `${100 - end}%`
  }
})
const valueControls = computed<AgeRangeValueControl[]>(() => {
  if (!isRangeCrossed.value) {
    return [createLowerValueControl('min'), createUpperValueControl('max')]
  }

  return [createLowerValueControl('max'), createUpperValueControl('min')]
})

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

function getValuePercent(value: number) {
  const span = props.maxBound - props.minBound

  if (span <= 0) {
    return 50
  }

  const position = ((value - props.minBound) / span) * 100
  return Math.min(100, Math.max(0, position))
}

function clampAgeValue(value: number) {
  if (!Number.isFinite(value)) {
    return props.minBound
  }

  return Math.min(props.maxBound, Math.max(props.minBound, value))
}

function createLowerValueControl(
  endpoint: AgeRangeEndpoint
): AgeRangeValueControl {
  return {
    endpoint,
    inputLabel: 'minInputLabel'
  }
}

function createUpperValueControl(
  endpoint: AgeRangeEndpoint
): AgeRangeValueControl {
  return {
    endpoint,
    inputLabel: 'maxInputLabel'
  }
}

function getInputValue(endpoint: AgeRangeEndpoint) {
  return endpoint === 'min' ? minInputValue.value : maxInputValue.value
}

function getInputEventValue(event: Event) {
  return (event.target as HTMLInputElement).value
}

function setInputValue(endpoint: AgeRangeEndpoint, value: string) {
  if (endpoint === 'min') {
    minInputValue.value = value
    return
  }

  maxInputValue.value = value
}

function emitValueUpdate(endpoint: AgeRangeEndpoint, value: number) {
  if (endpoint === 'min') {
    emit('update:minValue', value)
    return
  }

  emit('update:maxValue', value)
}

function updateValueFromInput(endpoint: AgeRangeEndpoint, rawValue: string) {
  setInputValue(endpoint, rawValue)

  const value = getInRangeInputValue(rawValue)

  if (value !== null) {
    emitValueUpdate(endpoint, value)
  }
}

function commitValueInput(endpoint: AgeRangeEndpoint) {
  const value = clampAgeValue(Number(getInputValue(endpoint)))

  setInputValue(endpoint, String(value))
  emitValueUpdate(endpoint, value)
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
    <div class="age-range-filter__content">
      <div class="age-range-filter__values">
        <template
          v-for="(control, controlIndex) in valueControls"
          :key="control.endpoint"
        >
          <label class="age-range-filter__value-control">
            <input
              :aria-label="t(control.inputLabel)"
              class="age-range-filter__value"
              :max="maxBound"
              :min="minBound"
              type="number"
              :value="getInputValue(control.endpoint)"
              @blur="commitValueInput(control.endpoint)"
              @change="commitValueInput(control.endpoint)"
              @input="
                updateValueFromInput(
                  control.endpoint,
                  getInputEventValue($event)
                )
              "
            />
          </label>
          <span
            v-if="controlIndex === 0"
            aria-hidden="true"
            class="age-range-filter__separator"
          ></span>
        </template>
      </div>

      <div class="age-range-filter__slider">
        <div aria-hidden="true" class="age-range-filter__rail">
          <span
            class="age-range-filter__rail-selected"
            :style="selectedRangeStyle"
          ></span>
        </div>
        <!-- What: name each stacked slider by the boundary it changes. Why: the mobile custom rail visually merges two native controls, so non-visual users and E2E flows need explicit targets. -->
        <input
          v-model.number="minValueModel"
          :aria-label="t(isRangeCrossed ? 'maxSliderLabel' : 'minSliderLabel')"
          :aria-valuetext="t('valueText', { value: minValue })"
          class="age-range-filter__input"
          :max="maxBound"
          :min="minBound"
          type="range"
        />
        <input
          v-model.number="maxValueModel"
          :aria-label="t(isRangeCrossed ? 'minSliderLabel' : 'maxSliderLabel')"
          :aria-valuetext="t('valueText', { value: maxValue })"
          class="age-range-filter__input"
          :max="maxBound"
          :min="minBound"
          type="range"
        />
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
  gap: 0.5rem;
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

.age-range-filter__content {
  display: grid;
  gap: 0.625rem;
  margin-left: 0.125rem;
  padding-left: 0.625rem;
  border-left: 2px solid var(--color-outline-variant);
}

.age-range-filter__values {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.age-range-filter__value-control {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
  min-width: 0;
}

.age-range-filter__value {
  appearance: textfield;
  width: 2.75rem;
  min-height: 1.625rem;
  border: 0;
  border-bottom: 2px solid var(--color-primary);
  background: transparent;
  padding: 0 0.125rem 0.1875rem;
  font-family: var(--font-mono);
  font-size: max(1rem, 16px);
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

.age-range-filter__separator {
  display: block;
  flex: 0 0 1rem;
  height: 2px;
  background: var(--color-outline-variant);
}

.age-range-filter__slider {
  position: relative;
  height: 1.5rem;
  min-width: 0;
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
  overflow: hidden;
  background: var(--color-outline-variant);
}

.age-range-filter__rail-selected {
  position: absolute;
  top: 0;
  bottom: 0;
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
