<template>
  <article class="payments-member-row">
    <div class="min-w-0">
      <div class="payments-member-row__headline">
        <p class="payments-member-row__name">
          <slot name="name" />
        </p>
        <slot name="badge" />
      </div>
      <p class="payments-member-row__meta">
        <slot name="meta" />
      </p>
    </div>

    <div class="payments-member-row__aside">
      <slot name="aside" />
    </div>
  </article>
</template>

<style scoped>
.payments-member-row {
  display: grid;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid var(--color-outline-variant);
}

.payments-member-row:last-child {
  border-bottom: 0;
}

.payments-member-row__headline {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.75rem;
}

.payments-member-row__name {
  margin: 0;
  overflow: hidden;
  font-family: var(--font-headline);
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.03em;
  text-transform: uppercase;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-on-surface);
}

.payments-member-row__meta {
  margin: 0.25rem 0 0;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-secondary);
}

.payments-member-row__aside {
  width: 100%;
}

@media (min-width: 720px) {
  .payments-member-row {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
  }
}

.payments-member-row--paid {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}

@media (max-width: 500px) {
  .payments-member-row--paid {
    grid-template-columns: 1fr;
  }
}
</style>
