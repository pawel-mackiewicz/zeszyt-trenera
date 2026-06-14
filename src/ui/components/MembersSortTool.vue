<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type {
  MemberSortDirection,
  MemberSortField
} from '@/ui/utils/memberSort'
import AppButton from '@/ui/components/AppButton.vue'
import AppIcon from '@/ui/components/AppIcon.vue'

const props = defineProps<{
  sortField: MemberSortField
  sortDirection: MemberSortDirection
}>()

const emit = defineEmits<{
  (event: 'update:sortField', value: MemberSortField): void
  (event: 'update:sortDirection', value: MemberSortDirection): void
}>()

const { t } = useI18n({ useScope: 'local' })

const sortFieldModel = computed({
  get: () => props.sortField,
  set: (value) => {
    emit('update:sortField', value as MemberSortField)
  }
})

const sortDirectionModel = computed({
  get: () => props.sortDirection,
  set: (value) => {
    emit('update:sortDirection', value as MemberSortDirection)
  }
})

const sortDirectionIcon = computed(() =>
  sortDirectionModel.value === 'asc' ? 'arrow_upward' : 'arrow_downward'
)
const sortDirectionLabel = computed(() =>
  t(sortDirectionModel.value === 'asc' ? 'direction.asc' : 'direction.desc')
)

function toggleSortDirection() {
  // What: switch the direction from inside the shared sort control. Why: every roster-like screen should keep one compact, touch-friendly toggle behavior instead of duplicating local button handlers.
  sortDirectionModel.value = sortDirectionModel.value === 'asc' ? 'desc' : 'asc'
}
</script>

<template>
  <div class="members-sort-tool">
    <div class="members-sort-tool__copy">
      <span class="members-sort-tool__caption">
        {{ t('optionsLabel') }}
      </span>
      <div class="members-sort-tool__row">
        <label class="members-sort-tool__prefix" for="members-sort-field">
          {{ t('fieldLabel') }}:
        </label>
        <select
          id="members-sort-field"
          v-model="sortFieldModel"
          class="members-sort-tool__field-select"
        >
          <option value="firstName">{{ t('fields.firstName') }}</option>
          <option value="lastName">{{ t('fields.lastName') }}</option>
          <!-- What: show one age-facing option while still sorting by birth date under the hood. Why: the data model is date-of-birth-first, but coaches scan this control using age language. -->
          <option value="dateOfBirth">{{ t('fields.age') }}</option>
          <option value="joinedAt">{{ t('fields.joinedAt') }}</option>
        </select>
      </div>
    </div>

    <AppButton
      class="members-sort-tool__direction-toggle"
      :aria-label="`${t('directionLabel')}: ${sortDirectionLabel}`"
      :title="`${t('directionLabel')}: ${sortDirectionLabel}`"
      icon-only
      type="button"
      variant="secondary"
      @click="toggleSortDirection"
    >
      <AppIcon :name="sortDirectionIcon" />
    </AppButton>
  </div>
</template>

<style scoped>
.members-sort-tool {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 0.75rem;
}

.members-sort-tool__copy {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  min-width: 0;
}

.members-sort-tool__caption {
  display: block;
  font-family: var(--app-section-label-font-family);
  font-size: var(--app-section-label-font-size);
  font-weight: var(--app-section-label-font-weight);
  line-height: var(--app-section-label-line-height);
  letter-spacing: var(--app-section-label-letter-spacing);
  text-transform: var(--app-section-label-text-transform);
  color: var(--app-section-label-color);
}

.members-sort-tool__row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  margin-left: 0.125rem;
  padding-left: 0.625rem;
  border-left: 2px solid var(--color-outline-variant);
}

.members-sort-tool__prefix {
  font-family: var(--app-section-label-font-family);
  font-size: 0.6875rem;
  font-weight: 700;
  line-height: var(--app-section-label-line-height);
  letter-spacing: var(--app-section-label-letter-spacing);
  text-transform: var(--app-section-label-text-transform);
  color: var(--app-section-label-color);
  white-space: nowrap;
}

.members-sort-tool__field-select {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 16rem;
  appearance: none;
  border-width: 0;
  background: transparent;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-primary);
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 0.35rem;
}

.members-sort-tool__field-select:focus {
  outline: none;
  border-bottom-color: var(--color-on-surface);
}

.members-sort-tool__direction-toggle {
  min-height: 2rem;
  width: 2rem;
  padding: 0;
  border: 1px solid var(--color-on-surface);
  background: var(--color-surface-container-lowest);
  color: var(--color-primary);
  box-shadow: 2px 2px 0 0 rgba(0, 0, 0, 1);
  flex: none;
}

.members-sort-tool__direction-toggle:active:not(:disabled):not(
    [aria-disabled='true']
  ) {
  transform: translate(1px, 1px);
  box-shadow: none;
}

/* What: keep the icon footprint tighter than default app buttons. Why: this control is an inline utility toggle and should not visually dominate the mobile filter toolbar. */
.members-sort-tool__direction-toggle :deep(.app-icon) {
  width: 1.25rem;
  height: 1.25rem;
  stroke-width: 2.2;
}
</style>

<i18n lang="json">
{
  "pl": {
    "optionsLabel": "Opcje sortowania",
    "fieldLabel": "Sortuj według",
    "directionLabel": "Kierunek",
    "fields": {
      "age": "Wiek",
      "lastName": "Nazwisko",
      "firstName": "Imię",
      "joinedAt": "Data dołączenia"
    },
    "direction": {
      "asc": "Rosnąco",
      "desc": "Malejąco"
    }
  },
  "en": {
    "optionsLabel": "Sorting options",
    "fieldLabel": "Sort by",
    "directionLabel": "Direction",
    "fields": {
      "age": "Age",
      "lastName": "Last name",
      "firstName": "First name",
      "joinedAt": "Join date"
    },
    "direction": {
      "asc": "Ascending",
      "desc": "Descending"
    }
  }
}
</i18n>
