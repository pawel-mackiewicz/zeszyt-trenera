<script setup lang="ts">
import { computed, watch } from 'vue'

import AgeRangeFilter from '@/ui/components/AgeRangeFilter.vue'
import MembersSortTool from '@/ui/components/MembersSortTool.vue'
import SearchBar from '@/ui/components/SearchBar.vue'
import { clampAgeRangeToBounds, normalizeAgeRange } from '@/ui/utils/ageRange'
import type {
  MemberSortDirection,
  MemberSortField
} from '@/ui/utils/memberSort'

const props = defineProps<{
  minAgeBound: number
  maxAgeBound: number
  minAgeFilter: number
  maxAgeFilter: number
  memberSortDirection: MemberSortDirection
  memberSortField: MemberSortField
  searchInputId: string
  searchLabel: string
  searchPlaceholder: string
  searchQuery: string
}>()

const emit = defineEmits<{
  (event: 'update:maxAgeFilter', value: number): void
  (event: 'update:memberSortDirection', value: MemberSortDirection): void
  (event: 'update:memberSortField', value: MemberSortField): void
  (event: 'update:minAgeFilter', value: number): void
  (event: 'update:searchQuery', value: string): void
}>()

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

const ageFilterBounds = computed(() =>
  normalizeAgeRange(props.minAgeBound, props.maxAgeBound)
)

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

watch(
  () =>
    [
      props.minAgeFilter,
      props.maxAgeFilter,
      ageFilterBounds.value.min,
      ageFilterBounds.value.max
    ] as const,
  ([minAgeFilter, maxAgeFilter, minAgeBound, maxAgeBound]) => {
    const clampedRange = clampAgeRangeToBounds(minAgeFilter, maxAgeFilter, {
      min: minAgeBound,
      max: maxAgeBound
    })

    if (clampedRange.min !== minAgeFilter) {
      emit('update:minAgeFilter', clampedRange.min)
    }

    if (clampedRange.max !== maxAgeFilter) {
      emit('update:maxAgeFilter', clampedRange.max)
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="member-filter-sort-section">
    <SearchBar
      v-model="searchQueryModel"
      :input-id="searchInputId"
      :input-label="searchLabel"
      :placeholder="searchPlaceholder"
    />

    <MembersSortTool
      v-model:sort-direction="memberSortDirectionModel"
      v-model:sort-field="memberSortFieldModel"
    />
  </div>

  <div class="member-filter-sort-section">
    <AgeRangeFilter
      v-model:max-value="maxAgeFilterModel"
      v-model:min-value="minAgeFilterModel"
      :max-bound="ageFilterBounds.max"
      :min-bound="ageFilterBounds.min"
    />
  </div>
</template>

<style scoped>
.member-filter-sort-section {
  display: grid;
  gap: 1rem;
  border-bottom: 2px solid var(--color-on-surface);
  padding-top: 1rem;
  padding-bottom: 1rem;
}
</style>
