<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const messages = {
  pl: {
    eyebrow: 'Obozy',
    title: 'Nowy obóz',
    body: 'Rejestracja obozu zostanie podłączona w kolejnym kroku.'
  },
  en: {
    eyebrow: 'Camps',
    title: 'New camp',
    body: 'Camp registration will be connected in the next step.'
  }
} as const

const { t } = useI18n({
  useScope: 'local',
  messages
})
</script>

<template>
  <main class="camp-new-placeholder">
    <section class="camp-new-placeholder__section">
      <p class="camp-new-placeholder__eyebrow">{{ t('eyebrow') }}</p>
      <h1 class="camp-new-placeholder__title">{{ t('title') }}</h1>
      <p class="camp-new-placeholder__body">{{ t('body') }}</p>
    </section>
  </main>
</template>

<style scoped>
.camp-new-placeholder {
  min-height: 100%;
  padding: 2rem 1rem;
}

.camp-new-placeholder__section {
  max-width: 64rem;
  margin: 0 auto;
  padding-block: 1.25rem;
  border-block: 1px solid var(--color-outline-variant);
}

.camp-new-placeholder__eyebrow {
  margin: 0 0 0.65rem;
  font-family: var(--font-mono);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.24em;
  line-height: 1.2;
  text-transform: uppercase;
  color: var(--color-secondary);
}

.camp-new-placeholder__title {
  margin: 0;
  font-family: var(--font-headline);
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.15;
  text-transform: uppercase;
  color: var(--color-on-surface);
}

.camp-new-placeholder__body {
  max-width: 34rem;
  margin: 0.75rem 0 0;
  line-height: 1.5;
  color: var(--color-secondary);
}

@media (min-width: 48rem) {
  .camp-new-placeholder {
    padding-inline: 2rem;
  }
}
</style>
