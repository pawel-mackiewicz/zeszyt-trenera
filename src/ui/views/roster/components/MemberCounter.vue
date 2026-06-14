<script setup lang="ts">
defineProps<{
  displayedCount: number
  displayedLabel: string
  totalCount: number
  totalLabel: string
}>()
</script>

<template>
  <section class="member-counter" :aria-label="totalLabel">
    <div class="member-counter__metric">
      <span class="member-counter__label">{{ totalLabel }}</span>
      <span class="member-counter__value" data-testid="member-counter-total">
        {{ totalCount }}
      </span>
    </div>

    <div class="member-counter__metric">
      <span class="member-counter__label">{{ displayedLabel }}</span>
      <span
        class="member-counter__value"
        data-testid="member-counter-displayed"
      >
        {{ displayedCount }}
      </span>
    </div>
  </section>
</template>

<style scoped>
.member-counter {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-bottom: 2rem;
  border-top: 1px solid var(--color-outline-variant);
  border-bottom: 1px solid var(--color-outline-variant);
  background: var(--color-surface);
}

.member-counter__metric {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.85rem 1rem;
}

.member-counter__metric + .member-counter__metric {
  border-left: 1px solid var(--color-outline-variant);
}

.member-counter__label {
  color: var(--color-secondary);
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  letter-spacing: 0.12em;
  line-height: 1;
  text-transform: uppercase;
}

.member-counter__value {
  display: block;
  color: var(--color-on-surface);
  font-family: var(--font-headline);
  font-size: 2.75rem;
  font-weight: 900;
  line-height: 0.9;
}
</style>
