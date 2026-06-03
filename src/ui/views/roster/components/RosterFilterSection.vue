<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import AgeRangeFilter from '@/ui/components/AgeRangeFilter.vue'
import MembersSortTool from '@/ui/components/MembersSortTool.vue'
import SearchBar from '@/ui/components/SearchBar.vue'
import { AGE_FILTER_MAX, AGE_FILTER_MIN } from '@/ui/utils/ageRange'
import type {
  MemberSortDirection,
  MemberSortField
} from '@/ui/utils/memberSort'

const props = defineProps<{
  searchQuery: string
  minAgeFilter: number
  maxAgeFilter: number
  memberSortField: MemberSortField
  memberSortDirection: MemberSortDirection
}>()

const emit = defineEmits<{
  (event: 'update:searchQuery', value: string): void
  (event: 'update:minAgeFilter', value: number): void
  (event: 'update:maxAgeFilter', value: number): void
  (event: 'update:memberSortField', value: MemberSortField): void
  (event: 'update:memberSortDirection', value: MemberSortDirection): void
}>()

const { t } = useI18n({ useScope: 'local' })

const searchQueryModel = computed({
  get: () => props.searchQuery,
  set: (value) => {
    emit('update:searchQuery', value)
  }
})

const minAgeFilterModel = computed({
  get: () => props.minAgeFilter,
  set: (value) => {
    emit('update:minAgeFilter', value)
  }
})

const maxAgeFilterModel = computed({
  get: () => props.maxAgeFilter,
  set: (value) => {
    emit('update:maxAgeFilter', value)
  }
})

const memberSortFieldModel = computed({
  get: () => props.memberSortField,
  set: (value) => {
    emit('update:memberSortField', value)
  }
})

const memberSortDirectionModel = computed({
  get: () => props.memberSortDirection,
  set: (value) => {
    emit('update:memberSortDirection', value)
  }
})
</script>

<template>
  <div class="roster-filter-section">
    <section class="roster-filter-section__utility">
      <SearchBar
        v-model="searchQueryModel"
        input-id="members-search"
        :input-label="t('search.label')"
        :placeholder="t('search.placeholder')"
      />

      <MembersSortTool
        v-model:sort-field="memberSortFieldModel"
        v-model:sort-direction="memberSortDirectionModel"
      />
    </section>

    <section class="roster-filter-section__additional">
      <AgeRangeFilter
        v-model:min-value="minAgeFilterModel"
        v-model:max-value="maxAgeFilterModel"
        :max-bound="AGE_FILTER_MAX"
        :min-bound="AGE_FILTER_MIN"
      />
    </section>
  </div>
</template>

<style scoped>
.roster-filter-section {
  display: grid;
  gap: 0;
}

.roster-filter-section__utility {
  margin-bottom: 3rem;
  border-bottom: 2px solid var(--color-on-surface);
  padding-bottom: 1rem;
}

.roster-filter-section__additional {
  margin-bottom: 2rem;
  border-bottom: 2px solid var(--color-on-surface);
  padding-bottom: 1.5rem;
}
</style>

<i18n lang="json">
{
  "pl": {
    "search": {
      "label": "Szukaj w rejestrze",
      "placeholder": "Wpisz imię i nazwisko"
    }
  },
  "en": {
    "search": {
      "label": "Search the register",
      "placeholder": "Enter first and last name"
    }
  }
}
</i18n>
