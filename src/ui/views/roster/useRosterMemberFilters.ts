import { computed, ref, type Ref } from 'vue'

import type { MemberRosterListItem } from '@/read/ObserveMembersForRosterQuery'
import {
  AGE_FILTER_MAX,
  AGE_FILTER_MIN,
  matchesAgeRange
} from '@/ui/utils/ageRange'
import {
  sortMembers,
  type MemberSortDirection,
  type MemberSortField
} from '@/ui/utils/memberSort'

function formatMemberName(member: MemberRosterListItem): string {
  return `${member.firstName} ${member.lastName}`
}

export function useRosterMemberFilters(
  members: Ref<MemberRosterListItem[]>,
  locale: Ref<string>
) {
  const searchQuery = ref('')
  const maxAgeFilter = ref(AGE_FILTER_MAX)
  const minAgeFilter = ref(AGE_FILTER_MIN)
  const memberSortField = ref<MemberSortField>('firstName')
  const memberSortDirection = ref<MemberSortDirection>('asc')

  const filteredMembers = computed(() => {
    const visibleMembers = members.value.filter((member) => {
      const fullName = formatMemberName(member).toLowerCase()
      const matchesSearch = fullName.includes(searchQuery.value.toLowerCase())
      const matchesAge = matchesAgeRange(
        member.dateOfBirth,
        minAgeFilter.value,
        maxAgeFilter.value
      )

      return matchesSearch && matchesAge
    })

    // What: keep roster filtering and ordering behind a feature composable. Why: the list view should orchestrate local-first subscriptions and UI state, while reusable member filtering rules stay testable outside the component.
    return sortMembers(visibleMembers, {
      field: memberSortField.value,
      direction: memberSortDirection.value,
      locale: locale.value
    })
  })

  return {
    filteredMembers,
    maxAgeFilter,
    memberSortDirection,
    memberSortField,
    minAgeFilter,
    searchQuery
  }
}
