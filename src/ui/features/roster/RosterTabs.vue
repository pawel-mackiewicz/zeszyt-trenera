<script setup lang="ts" generic="TValue extends string">
export type RosterTabOption<TValue extends string = string> = {
  value: TValue
  label: string
}

defineProps<{
  label: string
  modelValue: TValue
  tabs: readonly RosterTabOption<TValue>[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: TValue]
}>()

function selectTab(value: TValue) {
  emit('update:modelValue', value)
}
</script>

<template>
  <nav class="roster-tabs" :aria-label="label">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      class="roster-tabs__tab"
      :class="{ 'roster-tabs__tab--active': modelValue === tab.value }"
      type="button"
      :aria-pressed="modelValue === tab.value"
      @click="selectTab(tab.value)"
    >
      {{ tab.label }}
    </button>
  </nav>
</template>

<style scoped>
.roster-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 2px solid var(--color-on-surface);
  border-bottom: 2px solid var(--color-on-surface);
  background: var(--color-surface);
}

.roster-tabs__tab {
  min-height: 2.5rem;
  border-bottom: 3px solid transparent;
  border-left: 0;
  border-right: 1px solid var(--color-outline-variant);
  border-top: 0;
  background: transparent;
  color: var(--color-secondary);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 0.65rem 0.75rem 0.55rem;
  text-transform: uppercase;
  transition:
    border-color 160ms ease,
    color 160ms ease,
    background-color 160ms ease;
}

.roster-tabs__tab:hover,
.roster-tabs__tab:focus-visible {
  background: var(--color-surface-container-low);
  color: var(--color-on-surface);
}

.roster-tabs__tab:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -4px;
}

.roster-tabs__tab:last-child {
  border-right: 0;
}

.roster-tabs__tab--active {
  border-bottom-color: var(--color-primary);
  color: var(--color-on-surface);
}
</style>
