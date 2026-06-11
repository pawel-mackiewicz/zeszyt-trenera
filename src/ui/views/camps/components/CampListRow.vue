<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type { CampListItem } from '@/read/ListCampsQuery'
import AppIcon from '@/ui/components/AppIcon.vue'

const props = defineProps<{
  camp: CampListItem
  variant: 'present' | 'past'
}>()

const { locale } = useI18n({ useScope: 'global' })
const dateFormatter = computed(
  () =>
    new Intl.DateTimeFormat(locale.value, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
)
const dateRange = computed(
  () =>
    `${dateFormatter.value.format(props.camp.startDate)} - ${dateFormatter.value.format(props.camp.finishDate)}`
)
const iconName = computed(() =>
  props.variant === 'past' ? 'history' : 'chevron_right'
)
const detailsRoute = computed(() => `/camps/${props.camp.id}`)
</script>

<template>
  <li>
    <RouterLink
      class="camp-list-row"
      :class="`camp-list-row--${variant}`"
      :to="detailsRoute"
    >
      <div class="camp-list-row__identity">
        <span class="camp-list-row__name">{{ camp.name }}</span>
        <span class="camp-list-row__range-inline">{{ dateRange }}</span>
      </div>
      <div class="camp-list-row__meta">
        <span class="camp-list-row__range">{{ dateRange }}</span>
        <AppIcon
          class="camp-list-row__icon"
          :name="iconName"
          aria-hidden="true"
        />
      </div>
    </RouterLink>
  </li>
</template>

<style scoped>
.camp-list-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.75rem;
  padding: 1rem;
  border-bottom: 1px solid var(--color-outline-variant);
  background: color-mix(in srgb, var(--color-surface) 82%, transparent);
  text-decoration: none;
  transition: background-color 75ms ease;
}

.camp-list-row:hover,
.camp-list-row:focus-visible {
  background: var(--color-surface-container-low);
}

.camp-list-row:focus-visible {
  outline: 2px solid var(--color-on-surface);
  outline-offset: -2px;
}

.camp-list-row__identity {
  min-width: 0;
}

.camp-list-row__name {
  display: block;
  overflow-wrap: anywhere;
  font-family: var(--font-headline);
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.15;
  text-transform: uppercase;
  color: var(--color-on-surface);
}

.camp-list-row__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
}

.camp-list-row__range,
.camp-list-row__range-inline {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1.35;
  text-transform: uppercase;
  color: var(--color-secondary);
}

.camp-list-row__range {
  display: inline-flex;
  align-items: center;
  min-height: 2rem;
  max-width: 100%;
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--color-on-surface);
  background: var(--color-surface-container-lowest);
  box-shadow: 2px 2px 0 0 var(--color-on-surface);
}

.camp-list-row__range-inline {
  display: none;
  margin-top: 0.4rem;
}

.camp-list-row__icon {
  color: var(--color-secondary);
}

.camp-list-row--past {
  opacity: 0.72;
}

.camp-list-row--past .camp-list-row__name {
  color: var(--color-secondary);
  text-decoration: line-through;
  text-decoration-thickness: 0.12em;
}

.camp-list-row--past .camp-list-row__range {
  border-color: var(--color-secondary);
  background: transparent;
  box-shadow: none;
}

@media (min-width: 38rem) {
  .camp-list-row {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 1rem;
  }

  .camp-list-row__meta {
    justify-content: flex-end;
  }
}

@media (max-width: 23rem) {
  .camp-list-row__range {
    display: none;
  }

  .camp-list-row__range-inline {
    display: block;
  }
}
</style>
