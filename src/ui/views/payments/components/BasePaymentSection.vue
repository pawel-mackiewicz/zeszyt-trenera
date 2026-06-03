<script setup lang="ts">
const props = defineProps<{
  emptyMessage: string
  isEmpty: boolean
  title: string
  titleClass: string
}>()
</script>

<template>
  <section class="payments-ledger-section" :aria-label="props.title">
    <div class="payments-ledger-section__header">
      <div class="payments-ledger-section__title" :class="props.titleClass">
        {{ props.title }}
      </div>
    </div>

    <div v-if="props.isEmpty" class="payments-ledger-section__empty">
      {{ props.emptyMessage }}
    </div>

    <slot v-else />
  </section>
</template>

<style scoped>
.payments-ledger-section {
  overflow: hidden;
  border-top: 1px solid var(--color-on-surface);
  border-bottom: 1px solid var(--color-outline-variant);
}

.payments-ledger-section__header {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-outline-variant);
}

.payments-ledger-section__title {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.payments-ledger-section__title--alert {
  color: var(--color-primary);
}

.payments-ledger-section__title--quiet {
  color: var(--color-secondary);
}

.payments-ledger-section__title--paid {
  color: var(--success);
}

.payments-ledger-section__empty {
  padding: 2rem 1rem;
  font-family: var(--font-mono);
  font-size: 0.875rem;
  font-weight: 700;
  text-align: center;
  text-transform: uppercase;
  color: var(--color-secondary);
}
</style>
