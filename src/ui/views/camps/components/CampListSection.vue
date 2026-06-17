<script setup lang="ts">
import type { CampListItem } from '@/read/ListCampsQuery'
import CampListRow from '@/ui/views/camps/components/CampListRow.vue'

defineProps<{
  camps: CampListItem[]
  emptyMessage: string
  title: string
  variant: 'present' | 'past'
}>()
</script>

<template>
  <section class="camp-list-section" :class="`camp-list-section--${variant}`">
    <h2 class="camp-list-section__title">{{ title }}</h2>
    <p v-if="camps.length === 0" class="camp-list-section__empty">
      {{ emptyMessage }}
    </p>
    <ul v-else class="camp-list-section__rows">
      <CampListRow
        v-for="camp in camps"
        :key="camp.id"
        :camp="camp"
        :variant="variant"
      />
    </ul>
  </section>
</template>

<style scoped>
.camp-list-section {
  display: grid;
  gap: 0;
}

.camp-list-section + .camp-list-section {
  margin-top: 2.5rem;
}

.camp-list-section__title {
  margin: 0;
  padding: 0 0 0.65rem;
  border-bottom: 2px solid var(--color-on-surface);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.24em;
  line-height: 1.2;
  text-transform: uppercase;
  color: var(--color-on-surface);
}

.camp-list-section--past .camp-list-section__title {
  color: var(--color-secondary);
}

.camp-list-section__rows {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 0;
}

.camp-list-section__empty {
  margin: 0;
  padding: 1.25rem 1rem;
  border-bottom: 1px solid var(--color-outline-variant);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-secondary);
}
</style>
