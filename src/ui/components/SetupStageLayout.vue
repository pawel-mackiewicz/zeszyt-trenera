<script setup lang="ts">
withDefaults(
  defineProps<{
    stepLabel: string
    title: string
    eyebrow?: string
    body?: string
  }>(),
  {
    eyebrow: '',
    body: ''
  }
)
</script>

<template>
  <section class="setup-stage">
    <!-- What: render setup as a regular route section. Why: the club and trainer steps should look like the rest of the notebook instead of a separate modal flow. -->
    <header class="setup-stage__header">
      <div class="setup-stage__meta">
        <p v-if="eyebrow" class="setup-stage__eyebrow">{{ eyebrow }}</p>
        <p class="setup-stage__step">{{ stepLabel }}</p>
      </div>
      <h1 class="setup-stage__title">{{ title }}</h1>
      <p v-if="body" class="setup-stage__body">{{ body }}</p>
    </header>

    <div class="setup-stage__content">
      <slot />
    </div>
  </section>
</template>

<style scoped>
/* Keeping the setup frame local stops onboarding layout rules from leaking into the normal shell. */
.setup-stage {
  width: min(100%, 42rem);
  display: grid;
  gap: 2rem;
}

.setup-stage__header {
  display: grid;
  gap: 0.55rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--color-on-surface);
}

.setup-stage__meta {
  display: grid;
  gap: 0.35rem;
}

.setup-stage__eyebrow,
.setup-stage__step {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.setup-stage__eyebrow {
  color: var(--color-secondary);
}

.setup-stage__step {
  color: var(--color-secondary);
}

.setup-stage__title {
  margin: 0;
  font-family: var(--font-headline);
  font-size: clamp(2rem, 7vw, 3rem);
  line-height: 0.95;
  text-transform: uppercase;
  color: var(--color-primary);
}

.setup-stage__body {
  margin: 0;
  color: var(--color-on-surface);
  line-height: 1.5;
}

.setup-stage__content {
  display: grid;
  gap: 1rem;
}
</style>
