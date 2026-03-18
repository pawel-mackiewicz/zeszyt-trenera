<script setup lang="ts">
const starterDecisions = [
  'Vite SPA runtime with Vue 3 and strict TypeScript.',
  'Pinia is present for shared app-shell state only.',
  'Dexie stays minimal until the first real table exists.',
  'Service worker updates are surfaced through the UI instead of being silent.',
  'Styling uses custom tokens and mobile-first layout rules instead of a UI kit.'
]

const nextSteps = [
  'Add the first domain table in the Dexie version block.',
  'Decide whether feature state belongs in Pinia or close to the route.',
  'Define sync semantics only once a backend contract exists.',
  'Replace placeholder routes with the first production workflow.'
]
</script>

<template>
  <section class="settings-grid">
    <article class="sheet">
      <p class="sheet__eyebrow">Locked in</p>
      <h2 class="sheet__title">Starter conventions</h2>
      <ul class="decision-list">
        <li v-for="decision in starterDecisions" :key="decision">
          {{ decision }}
        </li>
      </ul>
    </article>

    <article class="sheet sheet--accent">
      <p class="sheet__eyebrow">When features arrive</p>
      <h2 class="sheet__title">Next extension steps</h2>
      <ol class="step-list">
        <li v-for="step in nextSteps" :key="step">{{ step }}</li>
      </ol>
    </article>
  </section>
</template>

<style scoped>
.settings-grid {
  display: grid;
  gap: 1rem;
}

.sheet {
  padding: 1.3rem;
  border-radius: var(--radius-card);
  border: 1px solid var(--line);
  background: var(--bg-panel);
  box-shadow: var(--shadow-soft);
}

.sheet--accent {
  background:
    linear-gradient(155deg, rgba(16, 59, 55, 0.92), rgba(15, 107, 87, 0.88)),
    rgba(16, 59, 55, 0.92);
  color: #eff5ea;
}

.sheet__eyebrow {
  margin: 0 0 0.5rem;
  font: 700 0.82rem/1 var(--font-display);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
}

.sheet--accent .sheet__eyebrow {
  color: rgba(239, 245, 234, 0.72);
}

.sheet__title {
  margin: 0;
  font: 700 1.7rem/1 var(--font-display);
}

.decision-list,
.step-list {
  margin: 1rem 0 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.8rem;
  line-height: 1.55;
}

.decision-list li,
.step-list li {
  color: var(--ink-soft);
}

.sheet--accent .step-list li {
  color: rgba(239, 245, 234, 0.88);
}

@media (min-width: 860px) {
  .settings-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }
}
</style>
